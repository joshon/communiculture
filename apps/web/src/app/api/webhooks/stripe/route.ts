import { NextResponse } from "next/server";
import { stripe, PACKS } from "@/lib/stripe";
import { prisma } from "@communiculture/db";
import type Stripe from "stripe";

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
      await prisma.user.update({
        where: { id: userId },
        data: { continuumCredits: { increment: PACKS[pack].credits } },
      });
    }
  }

  return NextResponse.json({ received: true });
}
