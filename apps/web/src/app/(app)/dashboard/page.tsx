import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { redirect } from "next/navigation";
import { CreateContinuumButton } from "@/components/continuum/CreateContinuumButton";
import { AppHeader } from "@/components/ui/AppHeader";
import { FREE_CONTINUUM_LIMIT } from "@/lib/plans";
import { DashboardContinuumList, type ContinuumItem } from "@/components/dashboard/DashboardContinuumList";

const INTER = "Inter, sans-serif";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [userRecord, continuums, ownedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { avatarConfig: true, avatarThumbnail: true, plan: true },
    }).catch(() => null),

    // All continuums the user can see:
    // – ones they own
    // – public-link continuums (discoverable)
    // – ones they've been invited to via team
    // – ones they participate in
    prisma.continuum.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { visibility: "PUBLIC_LINK" },
          { team: { members: { some: { userId } } } },
          { participants: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        title: true,
        leftLabel: true,
        rightLabel: true,
        createdAt: true,
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
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.continuum.count({ where: { ownerId: userId } }),
  ]);

  // No v2 avatar yet — send to set one up
  const cfg = userRecord?.avatarConfig as Record<string, unknown> | null;
  if (!cfg || cfg.format !== "v2") redirect("/profile/avatar");

  const canCreate = userRecord?.plan !== "FREE" || ownedCount < FREE_CONTINUUM_LIMIT;

  const items: ContinuumItem[] = continuums.map(c => ({
    id: c.id,
    title: c.title,
    leftLabel: c.leftLabel,
    rightLabel: c.rightLabel,
    createdAt: c.createdAt.toISOString(),
    ownerId: c.ownerId,
    shareToken: c.visibility === "PUBLIC_LINK" ? (c.shareToken ?? null) : null,
    participantCount: c._count.participants,
    myPosition: c.participants.find(p => p.userId === userId)?.position ?? null,
    allPositions: c.participants
      .filter(p => !p.user.isSynthetic)
      .map(p => p.position),
  }));

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

          {/* Page header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
          }}>
            <p style={{ fontFamily: INTER, fontSize: 16, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
              Continuums
            </p>
            <CreateContinuumButton canCreate={canCreate} count={ownedCount} />
          </div>

          <DashboardContinuumList
            items={items}
            userId={userId}
            thumbnailUrl={userRecord?.avatarThumbnail ?? null}
          />

        </div>
      </main>
    </div>
  );
}
