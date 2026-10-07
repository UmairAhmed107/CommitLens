// Git and Impact Routes (FR-GIT-01 to FR-GIT-06, FR-IMP-03 to FR-IMP-08)
const express = require('express');
const router = express.Router();
const gitController = require('../controllers/gitController');
const authenticateToken = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/role');

// Webhook endpoint (Public / HMAC verified)
router.post('/webhooks/github', gitController.handleWebhook);

// Protected routes
router.use(authenticateToken);

// Repository management (DEV role required per System Design 4.3)
router.post('/projects/:id/repository', requireProjectRole('DEV', 'PM'), gitController.connectRepository);
router.get('/projects/:id/repository', requireProjectRole(), gitController.getRepository);

// Sync commits (DEV role)
router.post('/projects/:id/sync', requireProjectRole('DEV', 'PM'), gitController.syncCommits);

// Commit history (Member)
router.get('/projects/:id/commits', requireProjectRole(), gitController.getCommits);

// Commit impact details (Member)
router.get('/commits/:sha/impact', gitController.getCommitImpact);

module.exports = router;
