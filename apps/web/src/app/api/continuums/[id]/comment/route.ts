import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { comment } = await req.json();

  const updated = await prisma.continuumParticipant.updateMany({
    where: { continuumId: params.id, userId: session.user.id },
    data: { comment: typeof comment === "string" ? comment.trim() || null : null },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "not_a_participant" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
