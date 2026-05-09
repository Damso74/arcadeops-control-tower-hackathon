# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────
#  ArcadeOps Control Tower — Dockerfile
#
#  Multi-stage build for a Next.js 16 standalone bundle. Optimized for:
#    - Vultr Container Registry / Vultr VPS deployment
#    - any plain Node 20 host
#    - rebuilds without leaking secrets into image layers
#
#  Replay mode runs with zero env vars. Gemini Reliability Judge
#  activates only when GEMINI_API_KEY is provided at runtime
#  (e.g. `docker run -e GEMINI_API_KEY=...`). NEVER bake secrets into
#  the image — pass them as runtime env or via a secret manager.
# ──────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies (cacheable) ─────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Alpine + Next.js need libc6-compat for some native bindings
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# ── Stage 2: build the Next.js standalone bundle ──────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Stage 3: minimal runtime image ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user — defense-in-depth for any container escape.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy the standalone build (server.js + minimal node_modules) and the
# static + public assets. This is the smallest deployable surface for
# Next.js production.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Container-level healthcheck against the in-app health route. The route
# does not depend on any external service, so this is safe to run on a
# fresh Vultr VPS with zero env vars.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
