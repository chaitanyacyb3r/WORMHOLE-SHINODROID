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
# Placeholder values for build-time only — Next.js prerendering needs these
# to create a Supabase client, but actual values are injected at runtime.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key-for-build-only
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

# Copy entrypoint script (replaces placeholder env vars at runtime)
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

# Health check — verifies the Next.js server responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Entrypoint injects real NEXT_PUBLIC_* values, then starts the server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]

