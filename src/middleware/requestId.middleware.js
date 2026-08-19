const { randomUUID } = require("crypto");
const asyncContext = require("../utils/asyncContext");

/**
 * Attaches a unique requestId to every incoming request.
 * - Prefers X-Request-Id header if already set by a gateway/proxy.
 * - Falls back to a generated UUID v4 prefixed with "req_".
 * - Exposes the requestId globally to the logger via AsyncLocalStorage.
 */
const requestId = (req, res, next) => {
  const id = req.headers["x-request-id"] || `req_${randomUUID()}`;
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  
  // Create a new Map for this request's context and run the request pipeline inside it
  const store = new Map();
  store.set("requestId", id);

  asyncContext.run(store, () => {
    next();
  });
};

module.exports = requestId;
