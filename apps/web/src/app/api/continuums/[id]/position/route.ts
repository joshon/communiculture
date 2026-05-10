import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { position } = await req.json();
  if (typeof position !== "number" || position < 0 || position > 1) {
    return NextResponse.json({ error: "invalid_position" }, { status: 400 });
  }

  const participant = await prisma.continuumParticipant.upsert({
    where: {
      continuumId_userId: {
        continuumId: params.id,
        userId: session.user.id,
      },
    },
    update: { position },
    create: {
      continuumId: params.id,
      userId: session.user.id,
      position,
    },
  });

  return NextResponse.json(participant);
}
