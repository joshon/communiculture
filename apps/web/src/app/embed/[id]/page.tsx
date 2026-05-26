/**
 * Embeddable continuum view for MS Teams, Google Meet, and Zoom apps.
 * Stripped-down UI — no nav, no sidebar. Accepts ?token= for PUBLIC_LINK continuums.
 * Works both authenticated and via share token.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ContinuumView } from "@/components/continuum/ContinuumView";

interface Props {
  params: { id: string };
  searchParams: { token?: string };
}

export default async function EmbedPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const shareToken = searchParams.token;

  const continuum = await prisma.continuum.findUnique({
    where: { id: params.id },
    include: { team: { include: { members: true } } },
  });

  if (!continuum) notFound();

  // Access: owner, team member, or public link
  let hasAccess = false;
  if (session) {
    const userId = session.user.id;
    hasAccess =
      continuum.ownerId === userId ||
      continuum.team?.members.some((m) => m.userId === userId) ||
      (continuum.visibility === "PUBLIC_LINK" && shareToken === continuum.shareToken);
  } else if (continuum.visibility === "PUBLIC_LINK" && shareToken === continuum.shareToken) {
    // Unauthenticated public link — show read-only view
    hasAccess = true;
  }

  if (!hasAccess) notFound();

  const userId = session?.user?.id;
  const [currentUser, participants, messages] = await Promise.all([
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { avatarConfig: true } }) : null,
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
      take: 50,
    }),
  ]);

  const cookieStore = cookies();
  const sessionToken =
    cookieStore.get("next-auth.session-token")?.value ??
    cookieStore.get("__Secure-next-auth.session-token")?.value ??
    "";

  return (
    <div className="w-full h-screen overflow-hidden bg-white">
      {/* Minimal branding */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
        <span className="text-comm-blue font-bold lowercase text-sm">
          communi<span className="text-black">*</span>culture
        </span>
        <span className="text-gray-300 text-xs">·</span>
        <span className="text-gray-500 text-xs lowercase">which is more {continuum.title}?</span>
      </div>
      {session ? (
        <ContinuumView
          continuum={continuum}
          participants={participants as any}
          messages={messages as any}
          sessionToken={sessionToken}
          currentUserAvatarConfig={(currentUser?.avatarConfig ?? {}) as any}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-gray-500 lowercase text-sm">sign in to participate</p>
          <a
            href={`/login?callbackUrl=/embed/${params.id}?token=${shareToken}`}
            className="bg-comm-blue text-white px-4 py-2 text-xs lowercase"
          >
            sign in
          </a>
        </div>
      )}
    </div>
  );
}
