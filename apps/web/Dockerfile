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
# npm copied packages/db into node_modules/@communiculture/db at deps time, so it
# can be stale. Symlink it to the live source so the build compiles the latest
# package, then generate the Prisma client fresh into node_modules/@prisma/client.
RUN rm -rf node_modules/@communiculture/db packages/db/node_modules \
 && ln -sfn /app/packages/db /app/node_modules/@communiculture/db \
 && ./node_modules/.bin/prisma generate --schema=./packages/db/prisma/schema.prisma
# Fail the build loudly if the generated client is stale (missing new schema fields).
RUN grep -q "lifetimeContinuums" node_modules/.prisma/client/index.d.ts \
 && echo "PRISMA CLIENT OK: lifetimeContinuums present" \
 || (echo "PRISMA CLIENT STALE: lifetimeContinuums missing" && exit 1)
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
