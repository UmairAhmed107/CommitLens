// Auth Controller (FR-AUTH-01, FR-AUTH-02, FR-AUTH-04)
const authService = require('../services/authService');
const { isValidEmail, isNonEmptyString } = require('../middleware/validate');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const errors = [];

    if (!isNonEmptyString(name)) errors.push('Name is required');
    if (!isValidEmail(email)) errors.push('Valid email address is required');
    if (!isNonEmptyString(password) || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const result = await authService.register({ name, email, password });
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const errors = [];

    if (!isValidEmail(email)) errors.push('Valid email address is required');
    if (!isNonEmptyString(password)) errors.push('Password is required');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const result = await authService.login({ email, password });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user._id);
    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe
};
