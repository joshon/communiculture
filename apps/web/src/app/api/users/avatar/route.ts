import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { avatarConfig } = await req.json();

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarConfig, onboardingComplete: true },
    select: { avatarConfig: true },
  });

  return NextResponse.json(user);
}
