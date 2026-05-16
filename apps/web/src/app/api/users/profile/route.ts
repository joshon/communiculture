import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slogan, url } = await req.json();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name ?? undefined,
      slogan: slogan ?? undefined,
      url: url ?? undefined,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ ok: true });
}
