/**
 * Load Test — HPA Trigger Simulation
 *
 * Purpose: Generate enough sustained CPU load on the bank-api to trigger
 * the Kubernetes HPA to scale the Deployment from 2 → N pods.
 *
 * Usage:
 *   # Against local server (docker compose up first):
 *   node scripts/loadtest.js
 *
 *   # Against a K8s cluster:
 *   BASE_URL=http://api.yourbank.com node scripts/loadtest.js
 *
 * While running, open another terminal and watch:
 *   kubectl get hpa bank-api-hpa -w
 *   kubectl get pods -l app=bank-api -w
 */

"use strict";

const autocannon = require("autocannon");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const DURATION = parseInt(process.env.DURATION || "120", 10); // seconds
const CONNECTIONS = parseInt(process.env.CONNECTIONS || "50", 10);

console.log("┌──────────────────────────────────────────────────┐");
console.log("│         Bank API — HPA Load Test                  │");
console.log("├──────────────────────────────────────────────────┤");
console.log(`│  Target  : ${BASE_URL.padEnd(38)}│`);
console.log(`│  Duration: ${String(DURATION + "s").padEnd(38)}│`);
console.log(`│  Connections: ${String(CONNECTIONS).padEnd(35)}│`);
console.log("├──────────────────────────────────────────────────┤");
console.log("│  Observe HPA (in another terminal):               │");
console.log("│    kubectl get hpa bank-api-hpa -w                │");
console.log("│    kubectl get pods -l app=bank-api -w            │");
console.log("│                                                    │");
console.log("│  Expected HPA progression:                        │");
console.log("│    CPU > 70%  → 2 pods → 4 pods → 6+ pods        │");
console.log("│    CPU < 70%  → (after 5 min) → 2 pods           │");
console.log("└──────────────────────────────────────────────────┘\n");

const instance = autocannon(
  {
    url: BASE_URL,
    connections: CONNECTIONS,
    duration: DURATION,
    pipelining: 1,

    // Use /health/live — a lightweight but CPU-exercising endpoint.
    // In a real test you would also hit /api/auth/login, /api/accounts, etc.
    requests: [
      {
        method: "GET",
        path: "/health/live",
      },
      {
        method: "GET",
        path: "/metrics",
      },
    ],
  },
  (err, result) => {
    if (err) {
      console.error("Load test error:", err);
      process.exit(1);
    }

    console.log("\n─── Results ────────────────────────────────────────");
    console.log(`  Requests sent    : ${result.requests.total.toLocaleString()}`);
    console.log(`  Throughput       : ${result.requests.average.toFixed(1)} req/s`);
    console.log(`  Avg latency      : ${result.latency.mean.toFixed(2)} ms`);
    console.log(`  p95 latency      : ${result.latency.p95} ms`);
    console.log(`  p99 latency      : ${result.latency.p99} ms`);
    console.log(`  Errors           : ${result.errors}`);
    console.log(`  Non-2xx          : ${result.non2xx}`);
    console.log("────────────────────────────────────────────────────");
    console.log("\n✓ Load test complete.");
    console.log("  CPU should now drop below 70%.");
    console.log("  After 5 minutes, the HPA will scale back to 2 pods.");
  }
);

// Live progress to stdout
autocannon.track(instance, { renderProgressBar: true });

// Graceful Ctrl+C
process.on("SIGINT", () => {
  instance.stop();
});
