import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name, slogan, url } = await req.json();

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name?.trim() || null,
      slogan: slogan?.trim() || null,
      url: url?.trim() || null,
    },
    select: { id: true, name: true, slogan: true, url: true },
  });

  return NextResponse.json(user);
}
