import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ContinuumPreviewBar } from "@/components/dashboard/ContinuumPreviewBar";
import { CreateContinuumButton } from "@/components/continuum/CreateContinuumButton";
import { PillButton } from "@/components/ui/PillButton";
import { AppHeader } from "@/components/ui/AppHeader";

const INTER = "Inter, sans-serif";

function formatDate(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [userRecord, continuums] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { avatarConfig: true, avatarThumbnail: true, plan: true },
    }).catch(() => null),
    prisma.continuum.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        _count: { select: { participants: true } },
        participants: { select: { position: true, userId: true } },
      },
    }),
  ]);

  // No v2 avatar yet — send them to set one up
  const cfg = userRecord?.avatarConfig as Record<string, unknown> | null;
  if (!cfg || cfg.format !== "v2") redirect("/profile/avatar");

  const canCreate = userRecord?.plan !== "FREE" || continuums.length < 3;
  const avatarSize = "60px";

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>

      <AppHeader />

      {/* Content — centred column */}
      <main style={{
        paddingTop: "clamp(32px, 5vw, 56px)",
        paddingBottom: 80,
        paddingLeft: "clamp(16px, 5vw, 48px)",
        paddingRight: "clamp(16px, 5vw, 48px)",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

        <p style={{ fontFamily: INTER, fontSize: 16, fontWeight: 500, color: "#1a1a1a", marginBottom: 24 }}>
          Continuums you own
        </p>

        {continuums.length === 0 ? (
          <p style={{ fontFamily: INTER, fontSize: 16, color: "#999", marginBottom: 32 }}>
            No continuums yet — create one to get started
          </p>
        ) : (
          continuums.map((c) => {
            const allPositions = c.participants.map((p) => p.position);
            const myPosition = c.participants.find((p) => p.userId === userId)?.position ?? null;

            return (
              <Link key={c.id} href={`/continuum/${c.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                {/* Date + response count */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontFamily: INTER, fontSize: 14, fontWeight: 400, color: "#1a1a1a" }}>
                    {formatDate(c.createdAt)}
                  </span>
                  <span style={{ fontFamily: INTER, fontSize: 14, fontWeight: 400, color: "#1a1a1a" }}>
                    {c._count.participants} Response{c._count.participants !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Title */}
                <p style={{ fontFamily: INTER, fontSize: 16, fontWeight: 500, color: "#1a1a1a", margin: "0 0 6px" }}>
                  {c.title}
                </p>

                {/* Left / right labels */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: INTER, fontSize: 16, fontWeight: 400, color: "#1a1a1a" }}>{c.leftLabel}</span>
                  <span style={{ fontFamily: INTER, fontSize: 16, fontWeight: 400, color: "#1a1a1a" }}>{c.rightLabel}</span>
                </div>

                <ContinuumPreviewBar
                  positions={allPositions}
                  userPosition={myPosition}
                  thumbnailUrl={userRecord?.avatarThumbnail ?? null}
                  avatarSize={avatarSize}
                />

                <div style={{ height: 1, background: "#000", margin: "16px 0" }} />
              </Link>
            );
          })
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 16, marginTop: 8 }}>
          <PillButton
            href="/continuums"
            fontSize="16px"
            style={{ background: "none", color: "#0083FF", textDecoration: "underline", paddingLeft: 0, paddingRight: 0 }}
          >
            see all your continuums
          </PillButton>
          <CreateContinuumButton canCreate={canCreate} count={continuums.length} />
        </div>

        </div>{/* end centred column */}
      </main>
    </div>
  );
}
