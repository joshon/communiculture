import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { enqueueForModeration } from "@/lib/moderation";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { comment } = await req.json();
  const trimmed = typeof comment === "string" ? comment.trim() || null : null;

  const updated = await prisma.continuumParticipant.updateMany({
    where: { continuumId: params.id, userId: session.user.id },
    data: { comment: trimmed },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "not_a_participant" }, { status: 404 });
  }

  if (trimmed) {
    const participant = await prisma.continuumParticipant.findFirst({
      where: { continuumId: params.id, userId: session.user.id },
      select: { id: true },
    });
    if (participant) {
      enqueueForModeration({
        id: `comment:${participant.id}`,
        type: "comment",
        entityId: participant.id,
        content: trimmed,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
