import { NextResponse } from "next/server";
import { prisma } from "@communiculture/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Verify a visitor's password for a "Link with password" continuum. On success
// we set an httpOnly cookie whose value is derived from the continuum's password
// hash — so it can't be forged and is invalidated automatically if the owner
// changes the password.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let token: unknown, password: unknown;
  try {
    ({ token, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const c = await prisma.continuum.findUnique({
    where: { id: params.id },
    select: { visibility: true, shareToken: true, passwordHash: true },
  });

  // Don't reveal whether the continuum exists — same response for bad token.
  if (!c || c.visibility !== "PASSWORD" || !c.passwordHash || token !== c.shareToken) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ok = typeof password === "string" && (await bcrypt.compare(password, c.passwordHash));
  if (!ok) return NextResponse.json({ error: "incorrect" }, { status: 401 });

  const value = crypto.createHash("sha256").update(params.id + c.passwordHash).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(`cc_pw_${params.id}`, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production", // allow over http on localhost
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
