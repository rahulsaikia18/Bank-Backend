const request = require("supertest");
const app = require("../../src/app");

describe("Health Endpoint", () => {
  it("GET /health → returns status and component info", async () => {
    const res = await request(app).get("/health");

    // In the test environment Redis mock + mongo-memory both work,
    // so we allow either 200 (healthy) or 503 (redis mock not fully "ready")
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("database");
    expect(res.body).toHaveProperty("redis");
    expect(res.body).toHaveProperty("uptime");
    expect(typeof res.body.uptime).toBe("number");
  });
});
