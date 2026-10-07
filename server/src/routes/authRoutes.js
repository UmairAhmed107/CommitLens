// Auth Routes (FR-AUTH-01, FR-AUTH-02, FR-AUTH-04)
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (Any authenticated role)
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
