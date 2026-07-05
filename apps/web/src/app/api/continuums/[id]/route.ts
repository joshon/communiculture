import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import bcrypt from "bcryptjs";
import { nanoid } from "@/lib/nanoid";
import { resolveContinuumAccess } from "@/lib/continuum-access";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const shareToken = url.searchParams.get("token");

  const { ok, continuum } = await resolveContinuumAccess({
    continuumId: params.id,
    userId: session?.user?.id ?? null,
    email: session?.user?.email,
    shareToken,
  });
  if (!ok || !continuum) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [participants, messages] = await Promise.all([
    prisma.continuumParticipant.findMany({
      where: { continuumId: params.id },
      include: { user: { select: { id: true, name: true, image: true, avatarConfig: true, isSynthetic: true } } },
    }),
    prisma.message.findMany({
      where: { continuumId: params.id },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({ continuum, participants, messages });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const c = await prisma.continuum.findUnique({
    where: { id: params.id },
    include: { _count: { select: { participants: true } } },
  });
  if (!c || c.ownerId !== session.user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (c._count.participants > 0)
    return NextResponse.json({ error: "has_responses", message: "Cannot edit after responses have been submitted" }, { status: 409 });

  const { title, leftLabel, rightLabel, visibility, category, password } = await req.json();

  const needsShareToken = visibility === "PUBLIC_LINK" || visibility === "PASSWORD";
  const shareToken = needsShareToken ? (c.shareToken ?? nanoid()) : null;
  const passwordHash = password ? await bcrypt.hash(password.trim(), 10) : (visibility === "PASSWORD" ? c.passwordHash : null);

  const updated = await prisma.continuum.update({
    where: { id: params.id },
    data: {
      ...(title?.trim() && { title: title.trim() }),
      ...(leftLabel?.trim() && { leftLabel: leftLabel.trim() }),
      ...(rightLabel?.trim() && { rightLabel: rightLabel.trim() }),
      visibility: visibility ?? c.visibility,
      category: category?.trim() || null,
      passwordHash,
      shareToken,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const c = await prisma.continuum.findUnique({ where: { id: params.id } });
  if (!c || c.ownerId !== session.user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.continuum.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
