const env = require('../config/env');

/**
 * Global error handler middleware.
 * Catches all errors thrown in route handlers and returns a consistent JSON response.
 */
const errorHandler = (err, req, res, _next) => {
  // Log the error
  console.error('[ERROR]', {
    method: req.method,
    path: req.path,
    message: err.message,
    stack: env.isDev() ? err.stack : undefined,
  });

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'FileTooLarge',
      message: `File size exceeds the maximum allowed size of ${env.MAX_FILE_SIZE_MB}MB`,
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'UploadError',
      message: err.message,
    });
  }

  // JWT errors (should be caught by authenticate middleware, but just in case)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }

  // Application errors with status codes
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.error || 'Error',
      message: err.message,
      details: err.details || undefined,
    });
  }

  // Default: Internal Server Error
  res.status(500).json({
    error: 'InternalServerError',
    message: env.isDev() ? err.message : 'An unexpected error occurred',
  });
};

/**
 * Create an application error with a status code.
 */
class AppError extends Error {
  constructor(statusCode, error, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
    this.name = 'AppError';
  }
}

module.exports = { errorHandler, AppError };
