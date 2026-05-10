import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as "PLUS" | "PRO" | undefined;
      if (userId && plan) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      if (!customer.deleted && customer.metadata?.userId) {
        await prisma.user.update({
          where: { id: customer.metadata.userId },
          data: { plan: "FREE" },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.status !== "active") {
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer.deleted && customer.metadata?.userId) {
          await prisma.user.update({
            where: { id: customer.metadata.userId },
            data: { plan: "FREE" },
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
