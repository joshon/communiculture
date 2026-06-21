import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, type FeedbackType } from "@communiculture/db";
import { getRedis } from "@/lib/redis";

const TYPES: FeedbackType[] = ["BUG", "IDEA", "GENERAL", "OTHER"];
const MAX_LEN = 4000;
const RATE_LIMIT = 5; // submissions per hour, per user (or IP if anonymous)

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  let body: { type?: unknown; message?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const type: FeedbackType = TYPES.includes(body.type as FeedbackType) ? (body.type as FeedbackType) : "GENERAL";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : null;

  if (!message) return NextResponse.json({ error: "empty_message" }, { status: 400 });

  // Rate limit: keyed by user when logged in, else by IP.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const redis = getRedis();
  if (redis) {
    try {
      const key = `fb:rl:${userId ?? ip}`;
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, 3600);
      if (n > RATE_LIMIT) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
    } catch {
      /* fail open — don't block feedback if Redis is down */
    }
  }

  await prisma.feedback.create({
    data: {
      type,
      message: message.slice(0, MAX_LEN),
      userId,
      // Optional reply-to email the submitter chose to share (logged in or not).
      // No promise of a response — it just gives us the option to reply.
      email: email || null,
    },
  });

  return NextResponse.json({ ok: true });
}
