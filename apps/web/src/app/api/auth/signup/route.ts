import { NextResponse } from "next/server";
import { prisma } from "@communiculture/db";
import bcrypt from "bcryptjs";
import { enqueueForModeration } from "@/lib/moderation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(`signup:${clientIp(req)}`, 10, 3600))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) || null : null;

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });
    if (name) {
      enqueueForModeration({
        id: `username:${user.id}`,
        type: "username",
        entityId: user.id,
        content: `Username: ${name}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("signup error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
