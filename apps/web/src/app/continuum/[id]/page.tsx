export const dynamic = "force-dynamic"; // always fetch fresh participants

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { notFound, redirect } from "next/navigation";
import { ContinuumView } from "@/components/continuum/ContinuumView";
import { ContinuumPasswordGate } from "@/components/continuum/ContinuumPasswordGate";
import { cookies } from "next/headers";
import crypto from "crypto";
import { isAdminEmail } from "@/lib/admin";

interface Props {
  params: { id: string };
  searchParams: { token?: string; seeding?: string };
}

export default async function ContinuumPage({ params, searchParams }: Props) {
  const isSeeding = searchParams.seeding === "1";
  const shareToken = searchParams.token;

  // Continuums are publicly viewable — anonymous visitors are allowed for
  // listed/link/password continuums. userId is null for anonymous viewers.
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const continuum = await prisma.continuum.findUnique({
    where: { id: params.id },
    include: { team: { include: { members: true } } },
  });
  if (!continuum) notFound();

  const isOwner = !!userId && continuum.ownerId === userId;
  const isTeamMember = !!userId && !!continuum.team?.members.some((m) => m.userId === userId);
  // Already placed themselves here → no gate, regardless of visibility.
  const isParticipant =
    !!userId &&
    !!(await prisma.continuumParticipant
      .findUnique({ where: { continuumId_userId: { continuumId: params.id, userId } }, select: { id: true } })
      .catch(() => null));
  const tokenMatches = !!shareToken && shareToken === continuum.shareToken;
  const publiclyListed = continuum.visibility === "PUBLIC"; // anyone can view a listed continuum
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

  if (!isOwner && !isTeamMember && !publiclyListed && !publicLinkOk && !passwordOk && !isParticipant) {
    if (showPasswordGate) {
      return <ContinuumPasswordGate continuumId={continuum.id} token={shareToken ?? ""} title={continuum.title} />;
    }
    // Anonymous visitor hitting a private/team continuum → let them sign in and
    // come back (membership may grant access).
    if (!userId) {
      const back = `/continuum/${params.id}${shareToken ? `?token=${encodeURIComponent(shareToken)}` : ""}`;
      redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
    }
    notFound();
  }

  // Banned from this continuum by the owner/admin → no access (owner & site
  // admins are exempt so they can still moderate).
  const viewerIsAdmin = isAdminEmail(session?.user?.email);
  if (userId && !isOwner && !viewerIsAdmin) {
    const banned = await prisma.continuumBan
      .findUnique({ where: { continuumId_userId: { continuumId: params.id, userId } }, select: { id: true } })
      .catch(() => null);
    if (banned) notFound();
  }

  // Signed-in but not onboarded (no display name yet) → send them through the
  // focused onboarding (name + avatar) first, then back to this continuum.
  if (userId) {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!me?.name?.trim()) {
      const back = `/continuum/${params.id}${shareToken ? `?token=${encodeURIComponent(shareToken)}` : ""}`;
      redirect(`/welcome?next=${encodeURIComponent(back)}`);
    }
  }

  const [currentUser, participants, messages, owner] = await Promise.all([
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { avatarConfig: true } })
      : Promise.resolve(null),
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

  // JWT token for socket auth — only signed-in viewers get a live socket;
  // anonymous viewers see a read-only snapshot.
  const cookieStore = cookies();
  const sessionToken = userId
    ? cookieStore.get("next-auth.session-token")?.value ??
      cookieStore.get("__Secure-next-auth.session-token")?.value ??
      ""
    : "";

  // Hidden comments (by AI moderation, or deleted by the owner/admin) are
  // blanked for everyone — a deleted comment should be gone for all viewers,
  // including the owner who removed it.
  const safeParticipants = participants.map((p) =>
    (p as { commentHidden?: boolean }).commentHidden ? { ...p, comment: null } : p
  );

  return (
    <ContinuumView
      continuum={{ ...continuum, createdAt: continuum.createdAt.toISOString(), owner: owner ?? null }}
      participants={safeParticipants as any}
      messages={messages as any}
      sessionToken={sessionToken}
      authenticated={!!userId}
      currentUserAvatarConfig={(currentUser?.avatarConfig ?? {}) as any}
      seeding={isSeeding}
    />
  );
}
