import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { nanoid } from "@/lib/nanoid";
import bcrypt from "bcryptjs";

const FREE_LIMIT = 3;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Enforce free tier limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, _count: { select: { continuums: true } } },
  });

  if (user?.plan === "FREE" && (user._count?.continuums ?? 0) >= FREE_LIMIT) {
    return NextResponse.json(
      { error: "free_limit_reached", message: "Upgrade to create more continuums" },
      { status: 402 }
    );
  }

  const { title, leftLabel, rightLabel, description, teamId, visibility, category, password } = await req.json();

  if (!title?.trim() || !leftLabel?.trim() || !rightLabel?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (visibility === "PUBLIC" && !category?.trim()) {
    return NextResponse.json({ error: "category_required" }, { status: 400 });
  }
  if (visibility === "PASSWORD" && !password?.trim()) {
    return NextResponse.json({ error: "password_required" }, { status: 400 });
  }

  const needsShareToken = visibility === "PUBLIC_LINK" || visibility === "PASSWORD";
  const shareToken = needsShareToken ? nanoid() : null;
  const passwordHash = password ? await bcrypt.hash(password.trim(), 10) : null;

  const continuum = await prisma.continuum.create({
    data: {
      title: title.trim(),
      leftLabel: leftLabel.trim(),
      rightLabel: rightLabel.trim(),
      description: description?.trim() || null,
      ownerId: userId,
      teamId: teamId || null,
      visibility: visibility ?? "PUBLIC_LINK",
      shareToken,
      category: category?.trim() || null,
      passwordHash,
    },
  });

  return NextResponse.json(continuum, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Get continuums the user owns or participates in
  const continuums = await prisma.continuum.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { participants: { some: { userId } } },
        {
          team: {
            members: { some: { userId } },
          },
        },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(continuums);
}
