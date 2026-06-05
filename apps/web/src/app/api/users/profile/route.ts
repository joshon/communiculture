import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { enqueueForModeration } from "@/lib/moderation";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slogan, url } = await req.json();

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name ?? undefined,
      slogan: slogan ?? undefined,
      url: url ?? undefined,
      onboardingComplete: true,
    },
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
}
