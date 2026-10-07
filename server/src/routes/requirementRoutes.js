// Requirement Routes (FR-REQ-01 to FR-REQ-05)
const express = require('express');
const router = express.Router();
const requirementController = require('../controllers/requirementController');
const authenticateToken = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/role');

router.use(authenticateToken);

// Project-scoped routes
router.post('/projects/:id/requirements', requireProjectRole('PM'), requirementController.createRequirement);
router.get('/projects/:id/requirements', requireProjectRole(), requirementController.getRequirements);
router.get('/projects/:id/coverage', requireProjectRole(), requirementController.getCoverage);

// Entity-scoped routes
router.put('/requirements/:rid', requireProjectRole('PM'), requirementController.updateRequirement);

module.exports = router;
