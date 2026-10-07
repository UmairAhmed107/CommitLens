// Auth Service (FR-AUTH-01, FR-AUTH-02, FR-AUTH-04)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

/**
 * Generate signed JWT for a user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
}

/**
 * Register a new user account (FR-AUTH-01)
 */
async function register({ name, email, password }) {
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    const err = new Error('User already exists');
    err.statusCode = 400;
    err.details = ['An account with this email already exists.'];
    throw err;
  }

  // Hash password using bcrypt
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash
  });

  const token = generateToken(user);

  return {
    token,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }
  };
}

/**
 * Authenticate user credentials and issue session token (FR-AUTH-02)
 */
async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    err.details = ['Invalid email or password combination.'];
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    err.details = ['Invalid email or password combination.'];
    throw err;
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }
  };
}

/**
 * Retrieve current user profile
 */
async function getMe(userId) {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

module.exports = {
  register,
  login,
  getMe
};
