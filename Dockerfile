# ── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first to exploit layer caching
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# ── Stage 2: Final Production Image ─────────────────────────────────────────
FROM node:20-alpine AS runner

# Create a non-root user to avoid running as root inside the container
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create the logs directory and grant ownership to the non-root user
RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

# Healthcheck — Docker polls this; it mirrors our /health route
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
