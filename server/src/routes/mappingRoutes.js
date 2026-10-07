// Mapping Rules Routes (FR-IMP-01)
const express = require('express');
const router = express.Router();
const mappingController = require('../controllers/mappingController');
const authenticateToken = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/role');

router.use(authenticateToken);

// Project-scoped routes (DEV, PM)
router.post('/projects/:id/mappings', requireProjectRole('DEV', 'PM'), mappingController.createMapping);
router.get('/projects/:id/mappings', requireProjectRole(), mappingController.getMappings);

// Entity-scoped routes (DEV, PM)
router.delete('/mappings/:mid', requireProjectRole('DEV', 'PM'), mappingController.deleteMapping);

module.exports = router;
