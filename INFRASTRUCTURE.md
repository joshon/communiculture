# Communiculture — Infrastructure

## Hosting: Railway (Hobby plan)

All services run on Railway at https://railway.com/project/a2dfb436-d702-42ec-811c-9841a0c9d67a

| Service | Type | URL |
|---|---|---|
| web | Next.js 14 app | https://communiculture.org |
| socket-server | Node.js Socket.io server | https://socket-server-production-9798.up.railway.app |
| Postgres | Railway managed PostgreSQL | Internal: postgres.railway.internal |
| Redis | Railway managed Redis | Internal: redis.railway.internal |

## Domain: communiculture.org
- Registrar: Squarespace
- DNS: A record @ → Railway IP, CNAME www → Railway domain
- SSL: Auto-provisioned by Railway

## Auth: NextAuth.js
- Providers: Google, Microsoft (Azure AD), Facebook, Email magic link
- Sessions stored in PostgreSQL via Prisma adapter

## Database
- PostgreSQL on Railway
- Schema managed with Prisma (`packages/db/prisma/schema.prisma`)
- To apply schema changes: `prisma db push` (or `prisma migrate deploy` once migrations are created)

## Build & Deploy
- Monorepo with pnpm workspaces + Turborepo
- Both services deployed via `railway up` from repo root
- Build system: Railpack (Railway's auto-builder)
  - `RAILPACK_BUILD_CMD` and `RAILPACK_START_CMD` set per service
- GitHub repo: https://github.com/joshon/communiculture (auto-deploy on push to main not yet configured — use `railway up`)

## Environment Variables (production)
Set in Railway dashboard per service. Key vars:
- `DATABASE_URL` — references `${{Postgres.DATABASE_URL}}`
- `REDIS_URL` — references `${{Redis.REDIS_URL}}`
- `NEXTAUTH_URL` — https://communiculture.org
- `NEXT_PUBLIC_SOCKET_URL` — socket server URL
- OAuth credentials (GOOGLE_*, AZURE_AD_*, FACEBOOK_*)

## Local Development
```bash
docker-compose up        # Postgres + Redis
pnpm dev                 # All services via Turborepo
```
See `.env.example` for required environment variables.
