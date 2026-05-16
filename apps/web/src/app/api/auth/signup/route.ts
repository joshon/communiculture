import { NextResponse } from "next/server";
import { prisma } from "@communiculture/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { name: name || null, email, passwordHash },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("signup error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
