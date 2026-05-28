import { NextResponse } from "next/server";
import { prisma } from "@communiculture/db";

// Returns synthetic users that are missing avatarThumbnail, with their avatarConfig.
// Dev-only endpoint — not guarded by auth since it only reads non-PII synthetic data.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { avatarThumbnail: null },
    select: { id: true, name: true, avatarConfig: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}
