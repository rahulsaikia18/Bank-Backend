require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const logger = require("./src/utils/logger");

// Initialize Background Workers
require("./src/workers/email.worker");

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

connectDB();

app.listen(PORT, () => {
  logger.info(`Server running on PORT ${PORT} [${NODE_ENV}]`);
});

// Handle uncaught exceptions and rejections — log before crash
process.on("uncaughtException", (err) => {
  logger.error({ message: "Uncaught Exception", error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ message: "Unhandled Rejection", reason: String(reason) });
  process.exit(1);
});