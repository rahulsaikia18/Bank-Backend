const { randomUUID } = require("crypto");

/**
 * Attaches a unique requestId to every incoming request.
 * - Prefers X-Request-Id header if already set by a gateway/proxy.
 * - Falls back to a generated UUID v4 prefixed with "req_".
 * - Sets the same id on the response so clients can trace it.
 */
const requestId = (req, res, next) => {
  const id = req.headers["x-request-id"] || `req_${randomUUID()}`;
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};

module.exports = requestId;
