import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { nanoid } from "@/lib/nanoid";

// POST /api/users/accounts/link-start
// Creates a short-lived token recording the intent to link a new OAuth provider
// to the currently logged-in user (even if the provider uses a different email).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await req.json();
  if (!provider) {
    return NextResponse.json({ error: "provider required" }, { status: 400 });
  }

  const token = nanoid(32);
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Reuse VerificationToken table: identifier encodes userId + provider
  await prisma.verificationToken.deleteMany({
    where: { identifier: `link:${session.user.id}:${provider}` },
  });
  await prisma.verificationToken.create({
    data: { identifier: `link:${session.user.id}:${provider}`, token, expires },
  });

  return NextResponse.json({ token });
}
