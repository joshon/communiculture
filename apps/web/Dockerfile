FROM node:20-alpine AS base
RUN apk add --no-cache openssl

# Install dependencies using npm (avoids pnpm/Prisma compatibility issues)
FROM base AS deps
WORKDIR /app
COPY package.json ./
COPY packages/db/ ./packages/db/
# Replace workspace:* with file: so npm understands it
RUN node -e "const p=JSON.parse(require('fs').readFileSync('./package.json','utf8')); p.dependencies['@communiculture/db']='file:./packages/db'; require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2));"
RUN npm install --legacy-peer-deps

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Copy the schema to a dedicated path FIRST so this layer's cache key is tied to
# the schema's content. When the schema changes, every step below busts — this is
# what stops Railway's builder from replaying a stale `prisma generate`.
COPY packages/db/prisma/schema.prisma ./.schema-cachekey
# npm copied packages/db into node_modules/@communiculture/db at deps time, so it
# can be stale. Symlink it to the live source so the build compiles the latest
# package, then force-clean any cached client and generate it fresh.
RUN rm -rf node_modules/@communiculture/db packages/db/node_modules \
            node_modules/.prisma/client node_modules/@prisma/client/.prisma \
 && ln -sfn /app/packages/db /app/node_modules/@communiculture/db \
 && ./node_modules/.bin/prisma generate --schema=./packages/db/prisma/schema.prisma
# Fail the build loudly if the generated client is stale (missing new schema
# fields). The real generated types live in node_modules/.prisma/client.
RUN echo "--- schema field check ---"; \
    grep -c "lifetimeContinuums" ./.schema-cachekey | sed 's/^/schema lifetimeContinuums count: /'; \
    F=$(grep -rl "lifetimeContinuums" node_modules/.prisma 2>/dev/null | head -1); \
    if [ -n "$F" ]; then \
      echo "PRISMA CLIENT OK: lifetimeContinuums present in $F"; \
    else \
      echo "PRISMA CLIENT STALE: lifetimeContinuums missing from generated client"; \
      find node_modules/.prisma -name index.d.ts 2>/dev/null | head; \
      exit 1; \
    fi
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
