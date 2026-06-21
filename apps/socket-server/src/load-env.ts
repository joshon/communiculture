import { existsSync } from "fs";
import { resolve } from "path";

// Next.js auto-loads .env, but this socket server is plain tsx/node and loads
// nothing on its own. In local dev, pull in the monorepo root .env so
// DATABASE_URL / NEXTAUTH_SECRET / REDIS_URL are available. On Railway the env
// is injected by the platform and no .env file exists, so this is a no-op and
// never overrides the real (platform) values.
//
// This module is imported first (for its side effect) so the env is populated
// before any env-dependent module (@communiculture/db, next-auth) is evaluated.
const ROOT_ENV = resolve(__dirname, "../../../.env");
if (existsSync(ROOT_ENV)) {
  try {
    (process as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(ROOT_ENV);
  } catch {
    /* ignore — fall back to whatever is already in process.env */
  }
}
