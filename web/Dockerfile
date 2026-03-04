# ══════════════════════════════════════════════════════════════════════════════
# ShinobiDroid — Web Dashboard Dockerfile (Next.js Standalone)
#
# Multi-stage build:
#   1. deps    — install npm dependencies
#   2. builder — build Next.js with standalone output
#   3. runner  — minimal production image (non-root)
#
# Security:
#   - Runs as non-root user (nextjs:nodejs)
#   - No dev dependencies in final image
#   - No source code in final image (only standalone output)
#   - Read-only filesystem compatible
# ══════════════════════════════════════════════════════════════════════════════

FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies only (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ── Build Stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js (standalone mode configured in next.config.ts)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Production Stage ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (includes server + minimal node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check — verifies the Next.js server responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
