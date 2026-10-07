// Report Routes (FR-RPT-01 to FR-RPT-04)
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticateToken = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/role');

router.use(authenticateToken);

// Report preview and file export (Member)
router.get('/projects/:id/reports/:type', requireProjectRole(), reportController.getReport);
router.get('/projects/:id/reports/:type/export', requireProjectRole(), reportController.exportReport);

module.exports = router;
