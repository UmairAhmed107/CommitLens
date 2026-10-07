// Verification script for FR-GIT-01 to FR-GIT-04 and FR-GIT-06
const http = require('http');

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('--- Starting FR-GIT-01 to FR-GIT-04 and FR-GIT-06 Verification ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate users
  const pmLogin = await request('POST', '/auth/login', {
    email: 'pm@demo.com',
    password: 'password123'
  });
  assert(pmLogin.status === 200, 'PM logs in');
  const pmToken = pmLogin.data.token;

  const devLogin = await request('POST', '/auth/login', {
    email: 'dev@demo.com',
    password: 'password123'
  });
  assert(devLogin.status === 200, 'DEV logs in');
  const devToken = devLogin.data.token;

  const qaLogin = await request('POST', '/auth/login', {
    email: 'qa@demo.com',
    password: 'password123'
  });
  assert(qaLogin.status === 200, 'QA logs in');
  const qaToken = qaLogin.data.token;

  // 2. Create dedicated test project
  const createProjRes = await request('POST', '/projects', {
    name: `Git-Test-${Date.now()}`,
    description: 'Testing FR-GIT requirements'
  }, pmToken);
  assert(createProjRes.status === 201, 'PM creates dedicated test project');
  const projectId = createProjRes.data._id;

  // Add DEV as member
  const addDevRes = await request('POST', `/projects/${projectId}/members`, {
    email: 'dev@demo.com',
    role: 'DEV'
  }, pmToken);
  assert(addDevRes.status === 200, 'PM adds DEV to test project');

  // 3. FR-GIT-01: DEV connects a repository
  const connectRes = await request('POST', `/projects/${projectId}/repository`, {
    url: 'https://github.com/demo-org/demo-shop.git',
    token: 'ghp_secretTokenDemo1234567890',
    defaultBranch: 'main'
  }, devToken);

  assert(connectRes.status === 200, 'FR-GIT-01: DEV connects repository (status 200)');
  assert(connectRes.data.url === 'https://github.com/demo-org/demo-shop.git', 'FR-GIT-01: Repo URL recorded');
  assert(connectRes.data.owner === 'demo-org', 'FR-GIT-01: Repo owner parsed');
  assert(connectRes.data.name === 'demo-shop', 'FR-GIT-01: Repo name parsed');
  assert(connectRes.data.defaultBranch === 'main', 'FR-GIT-01: Default branch recorded');

  // FR-GIT-02: Token must never be returned in API response
  assert(!connectRes.data.token && !connectRes.data.tokenEncrypted, 'FR-GIT-02: Token is NEVER returned in connect response');

  // Check GET /projects/:id/repository
  const getRepoRes = await request('GET', `/projects/${projectId}/repository`, null, devToken);
  assert(getRepoRes.status === 200, 'GET /projects/:id/repository returns 200');
  assert(getRepoRes.data.owner === 'demo-org', 'GET repository matches owner');
  assert(!getRepoRes.data.token && !getRepoRes.data.tokenEncrypted, 'FR-GIT-02: Token is NEVER returned in GET repo query');

  // Role check: QA cannot connect repository
  const qaConnectRes = await request('POST', `/projects/${projectId}/repository`, {
    url: 'https://github.com/unauthorized/repo.git',
    token: 'fake'
  }, qaToken);
  assert(qaConnectRes.status === 403, 'Role check: QA cannot connect repository (403 Forbidden)');

  // 4. FR-GIT-03: Trigger manual Sync
  const syncRes = await request('POST', `/projects/${projectId}/sync`, null, devToken);
  assert(syncRes.status === 200, 'FR-GIT-03: DEV triggers manual sync (status 200)');
  assert(syncRes.data.syncedCount > 0, `FR-GIT-03: Ingested ${syncRes.data.syncedCount} commits`);
  assert(syncRes.data.lastSyncAt !== null, 'FR-GIT-03: Sync response contains lastSyncAt');

  // Verify repository lastSyncAt was updated in DB
  const repoAfterSync = await request('GET', `/projects/${projectId}/repository`, null, devToken);
  assert(repoAfterSync.data.lastSyncAt !== null, 'FR-GIT-03: Repository document updated with lastSyncAt');

  // Role check: QA cannot trigger sync
  const qaSyncRes = await request('POST', `/projects/${projectId}/sync`, null, qaToken);
  assert(qaSyncRes.status === 403, 'Role check: QA cannot trigger sync (403 Forbidden)');

  // 5. FR-GIT-04: Repeated sync does not create duplicate commits
  const repeatSyncRes = await request('POST', `/projects/${projectId}/sync`, null, devToken);
  assert(repeatSyncRes.status === 200, 'FR-GIT-04: Repeated sync succeeds (status 200)');
  assert(repeatSyncRes.data.newCommitsCount === 0, 'FR-GIT-04: Repeated sync created 0 new duplicate commits');

  // 6. FR-GIT-06: View commit history with branch and author filters
  const commitsRes = await request('GET', `/projects/${projectId}/commits`, null, devToken);
  assert(commitsRes.status === 200, 'FR-GIT-06: List commits returns 200');
  assert(Array.isArray(commitsRes.data), 'FR-GIT-06: Commits returned as array');
  assert(commitsRes.data.length > 0, `FR-GIT-06: Found ${commitsRes.data.length} commits`);

  // Verify commit schema fields (SHA, message, author, branch, date, changed files)
  const firstCommit = commitsRes.data[0];
  assert(firstCommit.sha && firstCommit.sha.length > 0, 'FR-GIT-03: Commit contains sha');
  assert(firstCommit.message && firstCommit.message.length > 0, 'FR-GIT-03: Commit contains message');
  assert(firstCommit.author && firstCommit.author.length > 0, 'FR-GIT-03: Commit contains author');
  assert(firstCommit.branch && firstCommit.branch.length > 0, 'FR-GIT-03: Commit contains branch');
  assert(firstCommit.date !== null, 'FR-GIT-03: Commit contains date');
  assert(Array.isArray(firstCommit.files), 'FR-GIT-03: Commit contains changed files array');
  assert(firstCommit.files.length > 0, 'FR-GIT-03: Changed files list is populated');
  assert(firstCommit.files[0].path && firstCommit.files[0].status, 'FR-GIT-03: Changed file has path and status');

  // Filter by branch
  const branchFilterRes = await request('GET', `/projects/${projectId}/commits?branch=main`, null, devToken);
  assert(branchFilterRes.status === 200, 'FR-GIT-06: Filter by branch returns 200');
  assert(branchFilterRes.data.every((c) => c.branch === 'main'), 'FR-GIT-06: All results match filtered branch');

  // Filter by author
  const authorFilterRes = await request('GET', `/projects/${projectId}/commits?author=Asha`, null, devToken);
  assert(authorFilterRes.status === 200, 'FR-GIT-06: Filter by author returns 200');
  assert(authorFilterRes.data.length > 0, 'FR-GIT-06: Found commits matching author Asha');
  assert(authorFilterRes.data.every((c) => c.author.includes('Asha')), 'FR-GIT-06: All results match filtered author');

  // Search by keyword
  const searchFilterRes = await request('GET', `/projects/${projectId}/commits?search=login`, null, devToken);
  assert(searchFilterRes.status === 200, 'FR-GIT-06: Search commits returns 200');
  assert(searchFilterRes.data.some((c) => c.message.toLowerCase().includes('login')), 'FR-GIT-06: Search finds commit with "login" in message');

  // Verify impact analysis was NOT run during sync (as instructed)
  assert(firstCommit.impactedCount === 0, 'Impact analysis was NOT run during sync as requested');
  assert(firstCommit.recommendedTestCount === 0, 'Recommended tests count is 0 because impact analysis was not run');

  console.log(`\nGit Integration Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[Error in test execution]', err);
  process.exit(1);
});
