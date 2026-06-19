import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import bcrypt from "bcryptjs";

// Owner-only: set/rotate a continuum's share password. Allowed even after
// responses exist (unlike the general edit, which is locked once people join).
// Changing it invalidates existing access cookies automatically, since those
// are derived from the password hash.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const c = await prisma.continuum.findUnique({
    where: { id: params.id },
    select: { ownerId: true },
  });
  if (!c || c.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (typeof password !== "string" || !password.trim()) {
    return NextResponse.json({ error: "password_required" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password.trim(), 10);
  await prisma.continuum.update({ where: { id: params.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
