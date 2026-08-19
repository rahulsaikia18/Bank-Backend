const Redis = require("ioredis");
const logger = require("../utils/logger");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Ensure tests use ioredis-mock, but in production/dev use real Redis
const redisClient = process.env.NODE_ENV === "test" 
  ? new (require("ioredis-mock"))() 
  : new Redis(redisUrl);

redisClient.on("connect", () => {
  if (process.env.NODE_ENV !== "test") {
    logger.info("Connected to Redis successfully");
  }
});

redisClient.on("error", (err) => {
  logger.error({ message: "Redis connection error", error: err.message });
});

module.exports = redisClient;
