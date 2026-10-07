// Project Routes (FR-PRJ-01, FR-PRJ-02, FR-PRJ-03)
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authenticateToken = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/role');

// All project routes require authentication
router.use(authenticateToken);

// Create and list projects
router.post('/', projectController.createProject); // Creator becomes owner/PM
router.get('/', projectController.getProjects);

// Scoped to a specific project
router.get('/:id', requireProjectRole(), projectController.getProject); // Any member (PM, DEV, QA, TL)
router.put('/:id', requireProjectRole('PM'), projectController.updateProject); // PM only
router.post('/:id/members', requireProjectRole('PM'), projectController.addMember); // PM only

module.exports = router;

