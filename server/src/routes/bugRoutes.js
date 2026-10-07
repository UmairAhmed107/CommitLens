// Bug Routes (FR-BUG-01 to FR-BUG-05)
const express = require('express');
const router = express.Router();
const bugController = require('../controllers/bugController');
const authenticateToken = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/role');

router.use(authenticateToken);

// Project-scoped routes
router.post('/projects/:id/bugs', requireProjectRole('QA', 'PM'), bugController.createBug);
router.get('/projects/:id/bugs', requireProjectRole(), bugController.getBugs);

// Entity-scoped routes (QA, DEV, PM can update status or assignee)
router.get('/bugs/:bid', requireProjectRole(), bugController.getBugById);
router.put('/bugs/:bid', requireProjectRole('QA', 'DEV', 'PM'), bugController.updateBug);

module.exports = router;
