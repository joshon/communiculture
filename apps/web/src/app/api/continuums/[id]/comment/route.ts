import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { enqueueForModeration } from "@/lib/moderation";
import { resolveContinuumAccess } from "@/lib/continuum-access";

const MAX_COMMENT_LEN = 1000;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const shareToken = new URL(req.url).searchParams.get("token");
  const { ok } = await resolveContinuumAccess({
    continuumId: params.id,
    userId: session.user.id,
    email: session.user.email,
    shareToken,
  });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { comment } = await req.json();
  const trimmed = typeof comment === "string" ? comment.trim().slice(0, MAX_COMMENT_LEN) || null : null;

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
