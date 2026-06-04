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
COPY --from=deps /app/packages/db ./packages/db
COPY . .
RUN ./node_modules/.bin/prisma generate --schema=./packages/db/prisma/schema.prisma
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
