/**
 * AppError — operational application error.
 *
 * Usage:
 *   throw new AppError("Insufficient balance", 400, "INSUFFICIENT_BALANCE");
 */
class AppError extends Error {
  /**
   * @param {string} message  - Human-readable description
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   * @param {string} code     - Machine-readable error code (SCREAMING_SNAKE_CASE)
   */
  constructor(message, statusCode, code = "INTERNAL_ERROR") {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.status = statusCode >= 500 ? "error" : "fail";
    this.isOperational = true; // tells the error handler this is a known, safe error

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
