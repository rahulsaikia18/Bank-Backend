/**
 * Re-export AppError as ApiError for backward compatibility.
 * Any existing code using ApiError continues to work unchanged.
 */
module.exports = require("./AppError");
