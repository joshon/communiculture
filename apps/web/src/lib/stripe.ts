import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export const PLANS = {
  PLUS: {
    priceId: process.env.STRIPE_PLUS_PRICE_ID!,
    name: "Plus",
    price: "$9/mo",
    features: ["Unlimited continuums", "Up to 5 teams", "Analytics"],
  },
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    name: "Pro",
    price: "$29/mo",
    features: ["Everything in Plus", "Unlimited teams", "Plugin integrations", "Priority support"],
  },
} as const;
