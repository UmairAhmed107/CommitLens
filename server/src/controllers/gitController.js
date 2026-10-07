// Git and Impact Controller (FR-GIT-01 to FR-GIT-06, FR-IMP-03 to FR-IMP-08)
const githubService = require('../services/githubService');
const impactService = require('../services/impactService');
const { isNonEmptyString } = require('../middleware/validate');

async function connectRepository(req, res, next) {
  try {
    const { url, token, defaultBranch } = req.body;
    const errors = [];

    if (!isNonEmptyString(url)) errors.push('Repository URL is required');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const repo = await githubService.connectRepository(req.params.id, {
      url,
      token,
      defaultBranch
    });

    return res.status(200).json(repo);
  } catch (err) {
    next(err);
  }
}

async function getRepository(req, res, next) {
  try {
    const repo = await githubService.getRepository(req.params.id);
    return res.status(200).json(repo);
  } catch (err) {
    next(err);
  }
}

async function syncCommits(req, res, next) {
  try {
    const syncResult = await githubService.syncCommits(req.params.id);
    return res.status(200).json(syncResult);
  } catch (err) {
    next(err);
  }
}

async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const result = await githubService.handleWebhookPush(req.body, signature);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getCommits(req, res, next) {
  try {
    const { branch, author, search } = req.query;
    const commits = await githubService.getCommits(req.params.id, { branch, author, search });
    return res.status(200).json(commits);
  } catch (err) {
    next(err);
  }
}

async function getCommitImpact(req, res, next) {
  try {
    const { projectId } = req.query;
    const impact = await impactService.getImpactForCommit(req.params.sha, projectId);
    return res.status(200).json(impact);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  connectRepository,
  getRepository,
  syncCommits,
  handleWebhook,
  getCommits,
  getCommitImpact
};
