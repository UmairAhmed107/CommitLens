// Test Case Routes (FR-TST-01 to FR-TST-05)
const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const authenticateToken = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/role');

router.use(authenticateToken);

// Project-scoped routes
router.post('/projects/:id/tests', requireProjectRole('QA'), testController.createTestCase);
router.get('/projects/:id/tests', requireProjectRole(), testController.getTestCases);

// Entity-scoped routes
router.put('/tests/:tid', requireProjectRole('QA'), testController.updateTestCase);
router.post('/tests/:tid/runs', requireProjectRole('QA'), testController.recordTestRun);

module.exports = router;
