# 🏦 Bank Backend (Production-Ready Architecture)

A secure, scalable, and highly observable Node.js banking backend built with **Express**, **MongoDB**, **Redis**, and **Kubernetes**. 

This project implements real-world banking principles including immutable ledger-based accounting, strict atomic transactions with pessimistic locking, idempotency for safe retries, and asynchronous job processing.

---

## 🚀 Key Features & Architectural Upgrades

### 1️⃣ Core Banking Engine
- **Ledger-Based Accounting**: Balances are calculated dynamically (`Credits - Debits`); there is no `balance` column, ensuring mathematical correctness.
- **Strict Atomic Transactions**: Uses MongoDB Multi-Document ACID Transactions.
- **Concurrency & Race Conditions**: Uses **Pessimistic Locking** (`findOneAndUpdate`) to serialize concurrent transfers, preventing double-spend TOCTOU (Time-Of-Check to Time-Of-Use) vulnerabilities.
- **Idempotency**: Prevents accidental duplicate transfers caused by network retries.

### 2️⃣ Caching & Rate Limiting (Redis)
- **Redis-Backed Rate Limiting**: Global rate limit (`100 req / 15m`) and strict Auth rate limit (`5 req / 1m`) to prevent brute-force and DDoS attacks. Works across multiple Kubernetes pods.
- **High-Performance Caching**: Redis caches non-sensitive profile queries, dropping read latency significantly.

### 3️⃣ Asynchronous Workers (BullMQ)
- Email notifications (registration, successful transfers) are offloaded to **BullMQ** using Redis.
- Implements **Exponential Backoff** and retry mechanisms so the API never waits for an external SMTP server.

### 4️⃣ Observability & Tracing
- **Prometheus & Grafana**: Exposes `/metrics` providing real-time dashboards on Requests/Sec, Error Rates, p95 Latencies, Event Loop Lag, and Heap Usage.
- **Centralized Logging (Winston)**: Fully structured JSON logging.
- **Correlation IDs (AsyncLocalStorage)**: Injects a unique `req_id` seamlessly through the entire service stack, making it trivial to trace a single transaction across thousands of log lines.
- **Audit Trails**: Irreversible audit logging of all financial actions with automatic PII redaction (masking account numbers and passwords).

### 5️⃣ CI/CD & Infrastructure
- **Dockerized**: Multi-stage `Dockerfile` stripping all dev dependencies, creating a lean and secure `node:20-alpine` image running as a non-root user.
- **Kubernetes (K8s) Ready**: Complete manifests (`deployment`, `service`, `ingress`, `configmap`, `hpa`, `issuer`).
- **Liveness vs Readiness Probes**: Split probes prevent cascading failures if the database drops.
- **HPA Auto-Scaling**: Asymmetric scaling policies react instantly to traffic spikes and scale down conservatively.
- **GitHub Actions**: Fully automated CI (Lint + Jest tests) and CD (Build + push to GHCR).

---

## 🗂️ Project Structure

```text
Bank-Backend
├── .github/workflows      # CI/CD Pipelines
├── grafana/               # Grafana dashboards & provisioning
├── k8s/                   # Kubernetes manifests (Deployment, HPA, Ingress)
├── scripts/               # Load testing (autocannon)
├── src
│   ├── config/            # DB, Redis, Env validation
│   ├── controllers/       # HTTP Request/Response handling
│   ├── middleware/        # Rate Limiting, Error Handling, Metrics, Auth
│   ├── models/            # Mongoose Schemas
│   ├── queues/            # BullMQ Job Enqueueing
│   ├── routes/            # Express Routers
│   ├── services/          # Core Business Logic & DB Transactions
│   ├── utils/             # Winston Logger, AppErrors, Trace IDs
│   └── workers/           # BullMQ Background Job Processors
├── tests/                 # Jest + Supertest (100% Core coverage)
├── docker-compose.yml     # Local dev infrastructure
├── Dockerfile             # Multi-stage production build
└── server.js              # Application entry point
```

---

## 📦 Getting Started (Docker Compose)

The easiest way to run the entire stack (API, MongoDB, Redis, Prometheus, Grafana) locally:

```bash
# 1. Clone the repository
git clone https://github.com/rahulsaikia18/Bank-Backend.git
cd Bank-Backend

# 2. Setup Environment Variables
cp .env.example .env
# Edit .env and set JWT_SECRET and Email credentials

# 3. Start the entire observability and application stack
docker compose up --build
```

### Accessing Services:
- **API Base URL**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`
- **Prometheus Metrics**: `http://localhost:5000/metrics`
- **Grafana Dashboard**: `http://localhost:3000` (User: `admin` / Pass: `admin`)

---

## 🧪 Testing

The test suite requires `mongodb-memory-server` and `ioredis-mock`.

```bash
# Install dependencies
npm install

# Run Jest tests
npm test

# Run Load Test (to trigger Kubernetes HPA or monitor Grafana)
npm run loadtest
```

---

## 🔌 Core API Endpoints

### 🔐 Authentication
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login (returns JWT)
- `GET  /api/auth/me` — Get profile (Redis Cached)
- `POST /api/auth/logout` — Blacklists the current token

### 🏦 Accounts
- `POST /api/accounts` — Create a new checking/savings account
- `GET  /api/accounts` — List user's accounts
- `GET  /api/accounts/balance/:accountId` — Get live ledger balance

### 💸 Transactions
- `POST /api/transactions` — Transfer money (Atomic, Locked, Idempotent)
  - Requires `Idempotency-Key` header.
- `POST /api/transactions/system/initial-funds` — Seed a new account (System Admin only)

---

## 👨‍💻 Author
**Rahul Saikia**  
Full Stack Developer | Node.js Architecture
