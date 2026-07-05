import { NextResponse } from "next/server";
import { prisma } from "@communiculture/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Drives the progressive login flow: given an email, does that account have a
// password set? If so the UI prompts for it; otherwise (new user, or an account
// that only ever used Google / magic link) we fall back to sending a sign-in link.
// Note: this reveals whether an email has a password — an acceptable tradeoff
// for the progressive UX on this app.
export async function POST(req: Request) {
  // Throttle per IP so this can't be used to bulk-enumerate which emails are
  // registered / have a password.
  if (!(await rateLimit(`check-email:${clientIp(req)}`, 30, 3600))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let email: string | undefined;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { passwordHash: true },
  });

  return NextResponse.json({ hasPassword: Boolean(user?.passwordHash) });
}
