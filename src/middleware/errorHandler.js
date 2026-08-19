const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

/**
 * Converts known third-party errors into AppError instances
 * so the main handler always works with a consistent shape.
 */
function normaliseError(err) {
  // Mongoose duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return new AppError(`${field} already exists`, 409, "DUPLICATE_KEY");
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return new AppError(messages.join(". "), 400, "VALIDATION_ERROR");
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return new AppError("Invalid ID format", 400, "INVALID_ID");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return new AppError("Invalid token", 401, "INVALID_TOKEN");
  }
  if (err.name === "TokenExpiredError") {
    return new AppError("Token has expired", 401, "TOKEN_EXPIRED");
  }

  return err; // already an AppError or unknown — leave as-is
}

/**
 * Global Express error handling middleware.
 * Must be registered LAST in app.js (4-argument signature).
 *
 * Response shape:
 * {
 *   "success": false,
 *   "message": "Insufficient balance",
 *   "code": "INSUFFICIENT_BALANCE",
 *   "requestId": "req_abc123"
 * }
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const normalised = normaliseError(err);

  const statusCode = normalised.statusCode || 500;
  const message = normalised.message || "Internal Server Error";
  const code = normalised.code || "INTERNAL_ERROR";
  const requestId = req.requestId || null;

  // Log with appropriate severity
  if (statusCode >= 500) {
    logger.error({
      message,
      code,
      statusCode,
      requestId,
      method: req.method,
      url: req.originalUrl,
      stack: err.stack,
    });
  } else {
    logger.warn({
      message,
      code,
      statusCode,
      requestId,
      method: req.method,
      url: req.originalUrl,
    });
  }

  // Never leak stack traces to clients in production
  const body = {
    success: false,
    message,
    code,
    requestId,
  };

  if (process.env.NODE_ENV === "development" && statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
