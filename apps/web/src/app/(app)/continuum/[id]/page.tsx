export const dynamic = "force-dynamic"; // always fetch fresh participants

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { notFound } from "next/navigation";
import { ContinuumView } from "@/components/continuum/ContinuumView";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

interface Props {
  params: { id: string };
  searchParams: { token?: string };
}

export default async function ContinuumPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  const userId = session.user.id;
  const shareToken = searchParams.token;

  // Access control
  const continuum = await prisma.continuum.findUnique({
    where: { id: params.id },
    include: { team: { include: { members: true } } },
  });

  if (!continuum) notFound();

  const isOwner = continuum.ownerId === userId;
  const isTeamMember = continuum.team?.members.some((m) => m.userId === userId);
  const hasShareToken = continuum.visibility === "PUBLIC_LINK" && shareToken === continuum.shareToken;

  if (!isOwner && !isTeamMember && !hasShareToken) notFound();

  const [currentUser, participants, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { avatarConfig: true } }),
    prisma.continuumParticipant.findMany({
      where: { continuumId: params.id },
      include: {
        user: { select: { id: true, name: true, image: true, avatarConfig: true, isSynthetic: true } },
      },
    }),
    prisma.message.findMany({
      where: { continuumId: params.id },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  // Get JWT token for socket auth (server-side)
  const cookieStore = cookies();
  const sessionToken =
    cookieStore.get("next-auth.session-token")?.value ??
    cookieStore.get("__Secure-next-auth.session-token")?.value ??
    "";

  return (
    <ContinuumView
      continuum={continuum}
      participants={participants as any}
      messages={messages as any}
      sessionToken={sessionToken}
      currentUserAvatarConfig={(currentUser?.avatarConfig ?? {}) as any}
    />
  );
}
