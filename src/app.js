const express = require("express");
const cookieParser = require("cookie-parser");

const logger = require("./utils/logger");
const morganMiddleware = require("./middleware/morgan.middleware");

// Routers
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/accounts.routes");
const transactionRouter = require("./routes/transaction.routes");

const app = express();

// ─── Core middleware ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(morganMiddleware); // HTTP request logging → Winston

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/transection", transactionRouter); // backward-compat alias

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      statusCode,
    });
  } else {
    logger.warn({
      message: err.message,
      method: req.method,
      url: req.originalUrl,
      statusCode,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
});

module.exports = app;