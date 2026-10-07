// Authentication middleware (FR-AUTH-02, FR-AUTH-03)
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

/**
 * Verifies JWT token and attaches authenticated user to req.user
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication failed',
        details: ['Bearer token is missing from Authorization header']
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'Authentication failed',
        details: ['Token is missing']
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        details: ['User associated with token no longer exists']
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Authentication failed',
      details: [err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token signature']
    });
  }
}

module.exports = authenticateToken;
