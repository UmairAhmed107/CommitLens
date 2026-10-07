// Central Express Error Handler
function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: 'Validation error',
      details
    });
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      error: 'Duplicate field error',
      details: [`A record with that ${field} already exists.`]
    });
  }

  // Mongoose invalid ObjectId CastError
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid identifier',
      details: [`Resource id '${err.value}' is malformed`]
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    details: err.details || [message]
  });
}

module.exports = errorHandler;
