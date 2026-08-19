const client = require("prom-client");

// ── Prometheus Registry ───────────────────────────────────────────────────────
// Use a dedicated registry (not the global default) so Jest test isolation works
const register = new client.Registry();

// Collect Node.js default metrics: event loop lag, memory, GC, CPU, file descriptors
client.collectDefaultMetrics({
  register,
  prefix: "bank_node_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ── Custom Metrics ────────────────────────────────────────────────────────────

// 1. Total HTTP Requests — answers "how many requests did we serve?"
const httpRequestsTotal = new client.Counter({
  name: "bank_http_requests_total",
  help: "Total number of HTTP requests received",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// 2. Request Duration — answers "how fast are we?"
//    Histogram buckets are in seconds, tuned for a typical banking API response range
const httpRequestDurationSeconds = new client.Histogram({
  name: "bank_http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// 3. Active Requests — answers "how many requests are in-flight right now?"
//    This is a Gauge (can go up and down)
const httpActiveRequests = new client.Gauge({
  name: "bank_http_active_requests",
  help: "Number of HTTP requests currently being processed",
  registers: [register],
});

// 4. HTTP Errors — answers "how many requests failed?"
const httpErrorsTotal = new client.Counter({
  name: "bank_http_errors_total",
  help: "Total number of HTTP errors (4xx and 5xx)",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpActiveRequests,
  httpErrorsTotal,
};
