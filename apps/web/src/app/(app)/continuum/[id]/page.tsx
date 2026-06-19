export const dynamic = "force-dynamic"; // always fetch fresh participants

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { notFound, redirect } from "next/navigation";
import { ContinuumView } from "@/components/continuum/ContinuumView";
import { ContinuumPasswordGate } from "@/components/continuum/ContinuumPasswordGate";
import { cookies } from "next/headers";
import crypto from "crypto";

interface Props {
  params: { id: string };
  searchParams: { token?: string; seeding?: string };
}

export default async function ContinuumPage({ params, searchParams }: Props) {
  const isSeeding = searchParams.seeding === "1";
  const shareToken = searchParams.token;

  // Send anonymous visitors to log in, then back to this exact link (so shared
  // links work instead of 404ing).
  const session = await getServerSession(authOptions);
  if (!session) {
    const back = `/continuum/${params.id}${shareToken ? `?token=${encodeURIComponent(shareToken)}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  }

  const userId = session.user.id;

  // Access control
  const continuum = await prisma.continuum.findUnique({
    where: { id: params.id },
    include: { team: { include: { members: true } } },
  });

  if (!continuum) notFound();

  const isOwner = continuum.ownerId === userId;
  const isTeamMember = continuum.team?.members.some((m) => m.userId === userId);
  // Already placed themselves here → no gate, regardless of visibility.
  const isParticipant = !!(await prisma.continuumParticipant.findUnique({
    where: { continuumId_userId: { continuumId: params.id, userId } },
    select: { id: true },
  }).catch(() => null));
  const tokenMatches = !!shareToken && shareToken === continuum.shareToken;
  const publicLinkOk = continuum.visibility === "PUBLIC_LINK" && tokenMatches;

  // Password-protected: a matching share token gets the visitor to the gate;
  // entering the password sets a cookie (keyed off the password hash) that grants
  // access until the password changes.
  let passwordOk = false;
  let showPasswordGate = false;
  if (continuum.visibility === "PASSWORD" && tokenMatches && continuum.passwordHash) {
    const expected = crypto.createHash("sha256").update(continuum.id + continuum.passwordHash).digest("hex");
    passwordOk = cookies().get(`cc_pw_${continuum.id}`)?.value === expected;
    showPasswordGate = !passwordOk;
  }

  if (!isOwner && !isTeamMember && !publicLinkOk && !passwordOk && !isParticipant) {
    if (showPasswordGate) {
      return <ContinuumPasswordGate continuumId={continuum.id} token={shareToken ?? ""} title={continuum.title} />;
    }
    notFound();
  }

  const [currentUser, participants, messages, owner] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { avatarConfig: true } }),
    prisma.continuumParticipant.findMany({
      where: { continuumId: params.id },
      include: {
        user: { select: { id: true, name: true, image: true, avatarConfig: true, isSynthetic: true, avatarThumbnail: true } },
      },
    }),
    prisma.message.findMany({
      where: { continuumId: params.id },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.user.findUnique({
      where: { id: continuum.ownerId },
      select: { id: true, name: true, slogan: true, url: true, avatarThumbnail: true },
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
      continuum={{ ...continuum, createdAt: continuum.createdAt.toISOString(), owner: owner ?? null }}
      participants={participants as any}
      messages={messages as any}
      sessionToken={sessionToken}
      currentUserAvatarConfig={(currentUser?.avatarConfig ?? {}) as any}
      seeding={isSeeding}
    />
  );
}
