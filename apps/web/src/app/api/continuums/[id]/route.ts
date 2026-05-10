import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

async function canAccess(userId: string, continuumId: string, shareToken?: string | null) {
  const c = await prisma.continuum.findUnique({
    where: { id: continuumId },
    include: { team: { include: { members: true } } },
  });
  if (!c) return null;

  if (c.ownerId === userId) return c;
  if (c.visibility === "PUBLIC_LINK" && shareToken && c.shareToken === shareToken) return c;
  if (
    c.visibility === "TEAM" &&
    c.team?.members.some((m) => m.userId === userId)
  )
    return c;
  if (c.participants && (await prisma.continuumParticipant.findUnique({
    where: { continuumId_userId: { continuumId, userId } },
  })))
    return c;

  return null;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const shareToken = url.searchParams.get("token");

  const userId = session?.user.id ?? "__guest__";

  const continuum = await canAccess(userId, params.id, shareToken);
  if (!continuum) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [participants, messages] = await Promise.all([
    prisma.continuumParticipant.findMany({
      where: { continuumId: params.id },
      include: { user: { select: { id: true, name: true, image: true, avatarConfig: true } } },
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const c = await prisma.continuum.findUnique({ where: { id: params.id } });
  if (!c || c.ownerId !== session.user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.continuum.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
