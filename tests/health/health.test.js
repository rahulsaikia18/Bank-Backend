const request = require("supertest");
const app = require("../../src/app");

describe("Health Endpoints", () => {
  // ── Liveness ──────────────────────────────────────────────────────────────
  describe("GET /health/live (Liveness Probe)", () => {
    it("always returns 200 — process is alive regardless of dependencies", async () => {
      const res = await request(app).get("/health/live");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("alive");
      expect(typeof res.body.uptime).toBe("number");
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ── Readiness ─────────────────────────────────────────────────────────────
  describe("GET /health/ready (Readiness Probe)", () => {
    it("returns status and dependency check structure", async () => {
      const res = await request(app).get("/health/ready");

      // Allow 200 (both connected) or 503 (redis mock not fully 'ready' in test)
      expect([200, 503]).toContain(res.statusCode);
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("checks");
      expect(res.body.checks).toHaveProperty("database");
      expect(res.body.checks).toHaveProperty("redis");
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ── Combined ──────────────────────────────────────────────────────────────
  describe("GET /health (Combined — human-readable)", () => {
    it("returns full status summary with uptime", async () => {
      const res = await request(app).get("/health");

      expect([200, 503]).toContain(res.statusCode);
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("database");
      expect(res.body).toHaveProperty("redis");
      expect(res.body).toHaveProperty("uptime");
    });
  });
});
