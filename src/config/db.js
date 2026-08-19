const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected successfully");
  } catch (err) {
    logger.error({ message: "MongoDB connection failed", error: err.message });
    process.exit(1);
  }
}

module.exports = connectToDB;