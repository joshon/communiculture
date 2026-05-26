import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { position, positionZ } = await req.json();
  if (typeof position !== "number" || position < 0 || position > 100) {
    return NextResponse.json({ error: "invalid_position" }, { status: 400 });
  }
  const z = typeof positionZ === "number" ? Math.max(0, Math.min(100, positionZ)) : 50;

  const participant = await prisma.continuumParticipant.upsert({
    where: {
      continuumId_userId: {
        continuumId: params.id,
        userId: session.user.id,
      },
    },
    update: { position, positionZ: z },
    create: {
      continuumId: params.id,
      userId: session.user.id,
      position,
      positionZ: z,
    },
  });

  return NextResponse.json(participant);
}
