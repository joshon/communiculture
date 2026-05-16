import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

// List connected accounts for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true, id: true },
  });
  const hasPassword = !!(await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  }))?.passwordHash;

  return NextResponse.json({ accounts, hasPassword });
}

// Disconnect a provider (DELETE /api/users/accounts?provider=google)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  // Must have at least one other auth method before disconnecting
  const [accountCount, user] = await Promise.all([
    prisma.account.count({ where: { userId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } }),
  ]);
  if (accountCount <= 1 && !user?.passwordHash) {
    return NextResponse.json({ error: "Cannot remove only auth method" }, { status: 400 });
  }

  await prisma.account.deleteMany({
    where: { userId: session.user.id, provider },
  });
  return NextResponse.json({ ok: true });
}
