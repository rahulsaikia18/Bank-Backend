const express = require("express");
const { register } = require("../utils/metrics");
const router = express.Router();

/**
 * GET /metrics
 * Prometheus scrapes this endpoint on its configured interval.
 *
 * The response Content-Type is set by prom-client to the correct
 * Prometheus text format (text/plain; version=0.0.4).
 *
 * IMPORTANT: In production this endpoint should be protected
 * (firewall / internal network only) — never expose it publicly.
 */
router.get("/", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err.message);
  }
});

module.exports = router;
