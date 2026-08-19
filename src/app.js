const express = require("express");
const cookieParser = require("cookie-parser");

const requestId = require("./middleware/requestId.middleware");
const morganMiddleware = require("./middleware/morgan.middleware");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const metricsMiddleware = require("./middleware/metrics.middleware");

// Routers
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/accounts.routes");
const transactionRouter = require("./routes/transaction.routes");
const healthRouter = require("./routes/health.routes");
const metricsRouter = require("./routes/metrics.routes");

const app = express();

// ─── Core middleware ─────────────────────────────────────────────────────────
app.use(requestId);           // stamp every request with a unique requestId
app.use(express.json());
app.use(cookieParser());
app.use(morganMiddleware);    // HTTP request logs → Winston
app.use(metricsMiddleware);   // Prometheus counters / histograms

// Apply Global Rate Limiting (Redis-backed)
app.use("/api", apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/health", healthRouter);                      // Kubernetes liveness probe
app.use("/metrics", metricsRouter);                    // Prometheus scrape endpoint
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/transection", transactionRouter); // backward-compat alias

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: "ROUTE_NOT_FOUND",
    requestId: req.requestId,
  });
});

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;