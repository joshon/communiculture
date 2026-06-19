import Redis from "ioredis";

// Lazy singleton Redis client for the web app (used for webhook idempotency).
// Returns null when REDIS_URL isn't configured so callers can degrade gracefully.
let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
    client.on("error", (e) => console.error("[redis] error:", e.message));
  }
  return client;
}
