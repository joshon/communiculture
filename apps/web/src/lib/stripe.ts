import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export const PACKS = {
  PACK10: {
    priceId: process.env.STRIPE_PACK10_PRICE_ID!,
    name: "10 continuums",
    price: "$10",
    credits: 10,
  },
  PACK50: {
    priceId: process.env.STRIPE_PACK50_PRICE_ID!,
    name: "50 continuums",
    price: "$40",
    credits: 50,
  },
} as const;
