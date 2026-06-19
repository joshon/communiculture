import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { redirect } from "next/navigation";
import { CreateContinuumButton } from "@/components/continuum/CreateContinuumButton";
import { AppHeader } from "@/components/ui/AppHeader";
import { canCreateContinuum, continuumsAllowed } from "@/lib/plans";
import { DashboardContinuumList, type ContinuumItem } from "@/components/dashboard/DashboardContinuumList";

const INTER = "Inter, sans-serif";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const continuumSelect = {
    id: true,
    title: true,
    leftLabel: true,
    rightLabel: true,
    createdAt: true,
    deletedAt: true,
    ownerId: true,
    visibility: true,
    shareToken: true,
    _count: {
      select: {
        participants: { where: { user: { isSynthetic: false } } },
      },
    },
    participants: {
      select: {
        position: true,
        userId: true,
        user: { select: { isSynthetic: true } },
      },
    },
  } as const;

  const [userRecord, continuums, totalOwned] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, avatarConfig: true, avatarThumbnail: true, lifetimeContinuums: true, continuumCredits: true },
    }).catch(() => null),

    prisma.continuum.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { AND: [{ visibility: "PUBLIC_LINK" }, { deletedAt: null }] },
          { AND: [{ team: { members: { some: { userId } } } }, { deletedAt: null }] },
          { AND: [{ participants: { some: { userId } } }, { deletedAt: null }] },
        ],
      },
      select: continuumSelect,
      orderBy: { createdAt: "desc" },
    }),

    // Count ALL continuums ever created by this user (including deleted) for limit purposes
    prisma.continuum.count({ where: { ownerId: userId } }),
  ]);

  // First-run onboarding: choose a name (and optionally a password) before the avatar.
  if (!userRecord?.name?.trim()) redirect("/welcome");

  const cfg = userRecord?.avatarConfig as Record<string, unknown> | null;
  if (!cfg || cfg.format !== "v2") redirect("/profile/avatar");

  const userLimits = {
    lifetimeContinuums: userRecord?.lifetimeContinuums ?? false,
    continuumCredits: userRecord?.continuumCredits ?? 0,
    totalOwned,
  };
  const canCreate = canCreateContinuum(userLimits);
  const allowed = continuumsAllowed(userLimits);

  function toItem(c: typeof continuums[number]): ContinuumItem {
    return {
      id: c.id,
      title: c.title,
      leftLabel: c.leftLabel,
      rightLabel: c.rightLabel,
      createdAt: c.createdAt.toISOString(),
      deletedAt: c.deletedAt?.toISOString() ?? null,
      ownerId: c.ownerId,
      shareToken: c.visibility === "PUBLIC_LINK" ? (c.shareToken ?? null) : null,
      participantCount: c._count.participants,
      myPosition: c.participants.find(p => p.userId === userId)?.position ?? null,
      allPositions: c.participants.filter(p => !p.user.isSynthetic).map(p => p.position),
    };
  }

  const items = continuums.filter(c => !c.deletedAt).map(toItem);
  const archived = continuums.filter(c => c.ownerId === userId && c.deletedAt).map(toItem);

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <AppHeader />

      <main style={{
        paddingTop: "clamp(32px, 5vw, 56px)",
        paddingBottom: 80,
        paddingLeft: "clamp(16px, 5vw, 48px)",
        paddingRight: "clamp(16px, 5vw, 48px)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <p style={{ fontFamily: INTER, fontSize: 16, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
              Continuums
            </p>
            <CreateContinuumButton
              canCreate={canCreate}
              totalOwned={totalOwned}
              allowed={allowed}
            />
          </div>

          <DashboardContinuumList
            items={items}
            archived={archived}
            userId={userId}
            thumbnailUrl={userRecord?.avatarThumbnail ?? null}
          />

        </div>
      </main>
    </div>
  );
}
