const {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpActiveRequests,
  httpErrorsTotal,
} = require("../utils/metrics");

/**
 * Normalizes a dynamic Express route path to a stable label.
 * Without this, every unique ID becomes its own time series, which
 * is called "high cardinality" and destroys Prometheus performance.
 *
 * e.g.  /api/accounts/507f1f77bcf86cd799439011  →  /api/accounts/:id
 */
const normalizeRoute = (req) => {
  // Use Express matched route path if available (most accurate)
  if (req.route) {
    const base = req.baseUrl || "";
    return base + req.route.path;
  }
  // Fallback: mask MongoDB ObjectIds and UUIDs
  return req.path
    .replace(/[0-9a-fA-F]{24}/g, ":id")       // MongoDB ObjectId
    .replace(/[0-9a-fA-F-]{36}/g, ":uuid");     // UUID
};

const metricsMiddleware = (req, res, next) => {
  // Increment active requests immediately
  httpActiveRequests.inc();

  // Start a high-resolution timer
  const endTimer = httpRequestDurationSeconds.startTimer();

  // Hook into the finish event to record metrics after the response is sent
  res.on("finish", () => {
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    // Record request count
    httpRequestsTotal.inc(labels);

    // Record duration with labels
    endTimer(labels);

    // Record errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }

    // Decrement active requests
    httpActiveRequests.dec();
  });

  next();
};

module.exports = metricsMiddleware;
