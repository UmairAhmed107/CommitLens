// Input validation helper functions returning { error, details } on failure
function validate(schemaFn) {
  return (req, res, next) => {
    const details = [];
    const addError = (msg) => details.push(msg);

    try {
      schemaFn(req, addError);
    } catch (err) {
      addError(err.message);
    }

    if (details.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details
      });
    }

    next();
  };
}

// Common field validators
const isValidEmail = (email) => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isNonEmptyString = (str) => {
  return typeof str === 'string' && str.trim().length > 0;
};

module.exports = {
  validate,
  isValidEmail,
  isNonEmptyString
};
