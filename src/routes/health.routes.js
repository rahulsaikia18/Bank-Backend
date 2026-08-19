const express = require("express");
const mongoose = require("mongoose");
const redisClient = require("../config/redis");
const router = express.Router();

// ─── Liveness Probe: GET /health/live ────────────────────────────────────────
//
// Question: "Is the process alive and not deadlocked?"
//
// Kubernetes restarts the container if this fails.
// Rule: ONLY check that the Node.js process is responsive.
//       Do NOT check external dependencies (DB, Redis) here.
//
// Why? If MongoDB goes down, we don't want Kubernetes to restart
// all pods in a crash loop — the pods aren't broken, the DB is.
// Restarting them won't fix the DB and will only cause more disruption.
//
router.get("/live", (req, res) => {
  res.status(200).json({
    status: "alive",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Readiness Probe: GET /health/ready ──────────────────────────────────────
//
// Question: "Can this pod safely receive production traffic right now?"
//
// Kubernetes removes the pod from the Service load balancer if this fails.
// The pod is NOT restarted — it stays running but receives zero traffic.
//
// Rule: Check ALL dependencies that the app needs to serve requests.
//       If DB or Redis is down → return 503 → Kubernetes stops routing
//       traffic to this pod until dependencies recover.
//
router.get("/ready", async (req, res) => {
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const isDbConnected = mongoose.connection.readyState === 1;
  const isRedisConnected = redisClient.status === "ready";

  const checks = {
    database: isDbConnected ? "connected" : "disconnected",
    redis: isRedisConnected ? "connected" : "disconnected",
  };

  const isReady = isDbConnected && isRedisConnected;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "not_ready",
    checks,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Combined: GET /health ────────────────────────────────────────────────────
// Human-readable full status (used by docker-compose HEALTHCHECK and /metrics)
router.get("/", async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const isRedisConnected = redisClient.status === "ready";
  const isHealthy = isDbConnected && isRedisConnected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    database: isDbConnected ? "connected" : "disconnected",
    redis: isRedisConnected ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
