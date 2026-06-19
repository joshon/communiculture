import { NextResponse } from "next/server";
import { stripe, PACKS } from "@/lib/stripe";
import { prisma } from "@communiculture/db";
import { getRedis } from "@/lib/redis";
import type Stripe from "stripe";

const EVENT_TTL_SECONDS = 60 * 60 * 24 * 7; // remember processed events for 7 days

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const pack = session.metadata?.pack as keyof typeof PACKS | undefined;
    if (userId && pack && PACKS[pack]) {
      // Idempotency: Stripe retries webhooks, so don't grant credits twice for
      // the same event. We mark the event id in Redis only AFTER a successful
      // grant — that way a failed grant isn't wrongly recorded as done, and a
      // Redis outage fails open (still grants) rather than losing the purchase.
      const redis = getRedis();
      const key = `stripe:evt:${event.id}`;
      let alreadyProcessed = false;
      if (redis) {
        try { alreadyProcessed = (await redis.exists(key)) === 1; }
        catch (e) { console.error("[stripe-webhook] redis check failed, proceeding:", e); }
      }

      if (!alreadyProcessed) {
        await prisma.user.update({
          where: { id: userId },
          data: { continuumCredits: { increment: PACKS[pack].credits } },
        });
        if (redis) {
          try { await redis.set(key, "1", "EX", EVENT_TTL_SECONDS); }
          catch (e) { console.error("[stripe-webhook] redis mark failed:", e); }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
