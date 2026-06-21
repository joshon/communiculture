# Build context: REPO ROOT (service rootDirectory must be unset/null, and
# RAILWAY_DOCKERFILE_PATH=apps/socket-server/Dockerfile selects this file over
# the repo-root web Dockerfile). The socket server is run with tsx at runtime
# because it imports @communiculture/db, whose package main is TypeScript
# (src/index.ts) — plain `node dist/index.js` can't load that.
# Debian (not alpine): Prisma's engine needs libssl, and node:20-alpine ships an
# OpenSSL the bundled engine can't load (libssl.so.1.1 missing). node:20-slim
# has libssl3 and Prisma detects openssl-3.0.x cleanly.
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# ── Install workspace deps ────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/socket-server/package.json ./apps/socket-server/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile

# ── Generate the Prisma client ────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/socket-server/node_modules ./apps/socket-server/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY . .
RUN pnpm --filter @communiculture/db db:generate

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SOCKET_PORT=3001
# Carry the whole workspace + generated client so tsx can run the TS sources
# (the socket server and the @communiculture/db package it imports).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/socket-server ./apps/socket-server
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
EXPOSE 3001
CMD ["pnpm", "--filter", "@communiculture/socket-server", "start"]
