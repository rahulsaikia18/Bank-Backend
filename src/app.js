const express = require('express');
const cookieParser = require("cookie-parser");

// Routers required
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/accounts.routes");
const transactionRouter = require("./routes/transaction.routes");

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/transection", transactionRouter); // Backward compatibility alias

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const status = err.status || "error";

  if (process.env.NODE_ENV !== "test" && statusCode === 500) {
    console.error("Unhandled Error:", err);
  }

  res.status(statusCode).json({
    status,
    message,
  });
});

module.exports = app;