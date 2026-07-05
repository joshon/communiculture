import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { enqueueForModeration } from "@/lib/moderation";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const cap = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : undefined);
  const name = cap(body.name, 100);
  const slogan = cap(body.slogan, 200);
  let url = cap(body.url, 300);
  // Only accept http(s) links; drop anything else (e.g. javascript:) silently.
  if (url && !/^https?:\/\//i.test(url)) url = "";

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || undefined,
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
