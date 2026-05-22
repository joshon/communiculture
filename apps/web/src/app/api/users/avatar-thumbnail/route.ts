import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { thumbnail } = await request.json();
  if (typeof thumbnail !== "string" || !thumbnail.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid thumbnail" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarThumbnail: thumbnail },
  });

  return NextResponse.json({ ok: true });
}
