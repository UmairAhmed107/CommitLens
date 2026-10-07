// Dashboard Routes (FR-DSH-01 to FR-DSH-04)
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticateToken = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/role');

router.use(authenticateToken);

// Dashboard view per project (Member)
router.get('/projects/:id/dashboard/:view', requireProjectRole(), dashboardController.getDashboard);

module.exports = router;
