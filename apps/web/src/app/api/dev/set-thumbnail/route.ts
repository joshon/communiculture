import { NextResponse } from "next/server";
import { prisma } from "@communiculture/db";

// Saves an avatarThumbnail for any userId. Dev-only.
export async function PATCH(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  const { userId, thumbnail } = await request.json();
  if (!userId || typeof thumbnail !== "string" || !thumbnail.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarThumbnail: thumbnail },
  });

  return NextResponse.json({ ok: true });
}
