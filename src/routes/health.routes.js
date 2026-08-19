const express = require("express");
const mongoose = require("mongoose");
const redisClient = require("../config/redis");
const router = express.Router();

router.get("/", async (req, res) => {
  // Mongoose readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isDbConnected = mongoose.connection.readyState === 1;
  const isRedisConnected = redisClient.status === "ready";

  const status = isDbConnected && isRedisConnected ? "healthy" : "unhealthy";
  const statusCode = status === "healthy" ? 200 : 503;

  res.status(statusCode).json({
    status,
    database: isDbConnected ? "connected" : "disconnected",
    redis: isRedisConnected ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
  });
});

module.exports = router;
