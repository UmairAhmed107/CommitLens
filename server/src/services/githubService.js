// GitHub and Repository Integration Service (FR-GIT-01 to FR-GIT-06)
const crypto = require('crypto');
const Repository = require('../models/Repository');
const Commit = require('../models/Commit');
const config = require('../config/env');
const impactService = require('./impactService');

/**
 * Encrypt a sensitive token using AES-256-CBC (FR-GIT-02)
 */
function encryptToken(plainToken) {
  if (!plainToken) return '';
  // Key must be 32 bytes for aes-256-cbc
  const keyBuffer = Buffer.from(config.AES_ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(plainToken, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-CBC encrypted token
 */
function decryptToken(encryptedTokenString) {
  if (!encryptedTokenString || !encryptedTokenString.includes(':')) return '';
  try {
    const [ivHex, encryptedHex] = encryptedTokenString.split(':');
    const keyBuffer = Buffer.from(config.AES_ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Decryption Error]', err.message);
    return '';
  }
}

/**
 * Parse owner and repository name from GitHub URL
 */
function parseRepoUrl(url) {
  try {
    // Matches https://github.com/owner/repo or git@github.com:owner/repo
    const cleanUrl = url.replace(/\.git$/, '').trim();
    const parts = cleanUrl.split(/[/:]/).filter(Boolean);
    const name = parts[parts.length - 1];
    const owner = parts[parts.length - 2];
    return { owner: owner || 'unknown', name: name || 'repository' };
  } catch (e) {
    return { owner: 'unknown', name: 'repository' };
  }
}

/**
 * Connect a repository to a project (FR-GIT-01, FR-GIT-02)
 */
async function connectRepository(projectId, { url, token, defaultBranch }) {
  const { owner, name } = parseRepoUrl(url);
  const tokenEncrypted = encryptToken(token);

  let repo = await Repository.findOne({ projectId });
  if (repo) {
    repo.url = url.trim();
    repo.owner = owner;
    repo.name = name;
    repo.defaultBranch = defaultBranch || repo.defaultBranch || 'main';
    if (token) repo.tokenEncrypted = tokenEncrypted;
    await repo.save();
  } else {
    repo = await Repository.create({
      projectId,
      url: url.trim(),
      owner,
      name,
      defaultBranch: defaultBranch || 'main',
      tokenEncrypted
    });
  }

  // Return repository details without the encrypted token
  const result = repo.toObject();
  delete result.tokenEncrypted;
  return result;
}

/**
 * Fetch repository info for a project
 */
async function getRepository(projectId) {
  const repo = await Repository.findOne({ projectId });
  if (!repo) return null;
  const result = repo.toObject();
  delete result.tokenEncrypted;
  return result;
}

/**
 * Verify GitHub Webhook HMAC SHA256 Signature
 */
function verifyWebhookSignature(payloadString, signatureHeader) {
  if (!signatureHeader || !config.GITHUB_WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac('sha256', config.GITHUB_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(payloadString).digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

/**
 * Generate built-in demo-shop commits when syncing in demo/test environments
 */
function getDemoShopCommits() {
  return [
    {
      sha: 'a1b2c3d4e5f67890123456789abcdef012345678',
      message: 'Fix login session validation and token check',
      author: 'Asha Dev',
      branch: 'main',
      date: new Date(Date.now() - 3600000 * 2),
      files: [
        { path: 'src/auth/LoginService.js', status: 'modified' },
        { path: 'README.md', status: 'modified' }
      ],
      contents: {
        'src/auth/LoginService.js': '// @req REQ-01 Secure Login Service\nexport class LoginService {}',
        'README.md': '# Demo Shop\nOnline e-commerce platform.'
      }
    },
    {
      sha: '9f8e7d6c5b4a3210fedcba9876543210fedcba98',
      message: 'Update shopping cart calculations and item removal',
      author: 'Vikram DEV',
      branch: 'main',
      date: new Date(Date.now() - 3600000 * 12),
      files: [
        { path: 'src/cart/CartService.js', status: 'modified' }
      ],
      contents: {
        'src/cart/CartService.js': '// Shopping Cart calculations'
      }
    },
    {
      sha: '4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
      message: 'Update project documentation and setup guides',
      author: 'Asha Dev',
      branch: 'main',
      date: new Date(Date.now() - 3600000 * 24),
      files: [
        { path: 'docs/guide.md', status: 'modified' }
      ],
      contents: {
        'docs/guide.md': '# Project Architecture Guide'
      }
    }
  ];
}

/**
 * Sync commits from GitHub or demo repository (FR-GIT-03, FR-GIT-04)
 */
async function syncCommits(projectId) {
  const repo = await Repository.findOne({ projectId }).select('+tokenEncrypted');
  if (!repo) {
    const err = new Error('No repository connected to this project');
    err.statusCode = 400;
    err.details = ['Please connect a GitHub repository in the Repository tab before syncing.'];
    throw err;
  }

  const plainToken = repo.tokenEncrypted ? decryptToken(repo.tokenEncrypted) : '';
  let fetchedCommits = [];
  const fileContentsMap = {};

  // Check if live GitHub sync can be performed
  const isLiveGitHub =
    plainToken &&
    plainToken !== 'demo' &&
    plainToken !== 'test-token' &&
    repo.url.includes('github.com') &&
    repo.owner &&
    repo.name;

  if (isLiveGitHub) {
    try {
      console.log(`[GitHub Service] Fetching live commits from GitHub for ${repo.owner}/${repo.name}...`);
      const response = await fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.name}/commits?per_page=15`,
        {
          headers: {
            Authorization: `token ${plainToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'SCIT-Change-Impact-System'
          }
        }
      );

      if (response.ok) {
        const ghCommits = await response.json();
        // Fetch detailed commit files
        for (const item of ghCommits) {
          const detailRes = await fetch(
            `https://api.github.com/repos/${repo.owner}/${repo.name}/commits/${item.sha}`,
            {
              headers: {
                Authorization: `token ${plainToken}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'SCIT-Change-Impact-System'
              }
            }
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const files = (detail.files || []).map((f) => ({
              path: f.filename,
              status: f.status === 'removed' ? 'removed' : 'modified'
            }));

            fetchedCommits.push({
              sha: item.sha,
              message: item.commit.message,
              author: item.commit.author ? item.commit.author.name : 'Unknown',
              branch: repo.defaultBranch || 'main',
              date: new Date(item.commit.author ? item.commit.author.date : Date.now()),
              files
            });
          }
        }
      } else {
        console.warn(`[GitHub Service] GitHub API responded with status ${response.status}. Using fallback demo commits.`);
        fetchedCommits = getDemoShopCommits();
      }
    } catch (apiErr) {
      console.warn(`[GitHub Service] Live fetch failed: ${apiErr.message}. Falling back to demo commits.`);
      fetchedCommits = getDemoShopCommits();
    }
  } else {
    // Demo repository commits
    fetchedCommits = getDemoShopCommits();
  }

  // Ingest commits into database (FR-GIT-04: Prevents duplicates by sha)
  const ingestedCommits = [];
  for (const rawCommit of fetchedCommits) {
    // Check if commit already exists
    let commitDoc = await Commit.findOne({ projectId, sha: rawCommit.sha });
    if (!commitDoc) {
      commitDoc = await Commit.create({
        projectId,
        sha: rawCommit.sha,
        message: rawCommit.message,
        author: rawCommit.author,
        branch: rawCommit.branch || 'main',
        date: rawCommit.date || new Date(),
        files: rawCommit.files || []
      });
    }

    // Run impact analysis for the commit (FR-IMP-03)
    await impactService.analyzeCommitImpact(
      projectId,
      commitDoc,
      rawCommit.contents || {}
    );

    ingestedCommits.push(commitDoc);
  }

  // Update repository lastSyncAt
  repo.lastSyncAt = new Date();
  await repo.save();

  return {
    syncedCount: ingestedCommits.length,
    lastSyncAt: repo.lastSyncAt,
    commits: ingestedCommits
  };
}

/**
 * Handle incoming GitHub push webhook event (FR-GIT-05)
 */
async function handleWebhookPush(payload, signature) {
  // If signature provided, verify it
  if (signature && !verifyWebhookSignature(JSON.stringify(payload), signature)) {
    const err = new Error('Invalid webhook signature');
    err.statusCode = 401;
    throw err;
  }

  const repoUrl = payload.repository ? payload.repository.html_url : null;
  if (!repoUrl) {
    return { received: true, message: 'No repository in payload' };
  }

  // Find matching connected repository in database
  const repos = await Repository.find();
  const matchedRepo = repos.find(
    (r) => r.url.toLowerCase() === repoUrl.toLowerCase() || repoUrl.includes(r.name)
  );

  if (!matchedRepo) {
    return { received: true, message: 'Repository not connected in system' };
  }

  const commits = payload.commits || [];
  const ingested = [];

  for (const c of commits) {
    const files = [];
    (c.added || []).forEach((p) => files.push({ path: p, status: 'added' }));
    (c.modified || []).forEach((p) => files.push({ path: p, status: 'modified' }));
    (c.removed || []).forEach((p) => files.push({ path: p, status: 'removed' }));

    let commitDoc = await Commit.findOne({ projectId: matchedRepo.projectId, sha: c.id });
    if (!commitDoc) {
      commitDoc = await Commit.create({
        projectId: matchedRepo.projectId,
        sha: c.id,
        message: c.message,
        author: c.author ? c.author.name : 'Unknown',
        branch: payload.ref ? payload.ref.replace('refs/heads/', '') : 'main',
        date: new Date(c.timestamp || Date.now()),
        files
      });
    }

    await impactService.analyzeCommitImpact(matchedRepo.projectId, commitDoc);
    ingested.push(commitDoc);
  }

  matchedRepo.lastSyncAt = new Date();
  await matchedRepo.save();

  return {
    success: true,
    syncedCommits: ingested.length
  };
}

/**
 * List commits for a project with filters (FR-GIT-06)
 */
async function getCommits(projectId, { branch, author, search }) {
  const query = { projectId };
  if (branch) query.branch = branch;
  if (author) query.author = { $regex: author, $options: 'i' };
  if (search) {
    query.$or = [
      { message: { $regex: search, $options: 'i' } },
      { sha: { $regex: search, $options: 'i' } }
    ];
  }

  const commits = await Commit.find(query).sort({ date: -1 });

  // Enrich with impact result badge counts (impacted reqs count)
  const enriched = await Promise.all(
    commits.map(async (c) => {
      const ImpactResult = require('../models/ImpactResult');
      const impact = await ImpactResult.findOne({ projectId, commitSha: c.sha });
      return {
        ...c.toObject(),
        impactedCount: impact ? impact.impacted.length : 0,
        recommendedTestCount: impact ? impact.recommendedTestIds.length : 0,
        reductionPct: impact ? impact.reductionPct : 0
      };
    })
  );

  return enriched;
}

module.exports = {
  encryptToken,
  decryptToken,
  connectRepository,
  getRepository,
  syncCommits,
  handleWebhookPush,
  getCommits
};
