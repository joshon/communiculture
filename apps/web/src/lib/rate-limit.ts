import { getRedis } from "@/lib/redis";

// Fixed-window rate limiter backed by Redis. Returns true if the action is
// allowed, false if the caller is over `limit` within `windowSec`.
//
// Fails OPEN (allows) when Redis is unavailable — these limits protect against
// abuse/cost, and we'd rather serve legit users during a Redis outage than lock
// everyone out. Redis is a core dependency here (socket adapter, webhook
// idempotency), so a sustained outage is already a broader incident.
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    const k = `rl:${key}`;
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, windowSec);
    return n <= limit;
  } catch {
    return true;
  }
}

// Pull the client IP from proxy headers (Railway/Vercel set x-forwarded-for).
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
