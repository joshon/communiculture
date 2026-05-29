import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";
import { ContinuumPreviewBar } from "@/components/dashboard/ContinuumPreviewBar";

const INTER = "Inter, sans-serif";
const AVATAR_SIZE = "52px";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function UserStandingPage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = session!.user.id;
  const { userId: targetUserId } = params;

  // Load target user
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, avatarThumbnail: true, isSynthetic: true },
  });
  if (!targetUser || targetUser.isSynthetic) notFound();

  // Continuums where target participates AND viewer has access:
  // – PUBLIC_LINK continuums (anyone can see)
  // – continuums viewer is also participating in
  // – continuums viewer owns
  // – continuums in a team viewer belongs to
  const continuums = await prisma.continuum.findMany({
    where: {
      participants: { some: { userId: targetUserId } },
      OR: [
        { visibility: "PUBLIC_LINK" },
        { participants: { some: { userId: viewerId } } },
        { ownerId: viewerId },
        { team: { members: { some: { userId: viewerId } } } },
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
        select: { participants: { where: { user: { isSynthetic: false } } } },
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
  });

  // Load viewer's own thumbnail for the preview bar
  const viewerRecord = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { avatarThumbnail: true },
  });

  const breadcrumbs = [
    { label: "home", href: "/dashboard" },
    { label: targetUser.name ?? "user" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <AppHeader breadcrumbs={breadcrumbs} />

      <main style={{
        paddingTop: "clamp(32px, 5vw, 56px)",
        paddingBottom: 80,
        paddingLeft: "clamp(16px, 5vw, 48px)",
        paddingRight: "clamp(16px, 5vw, 48px)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            {targetUser.avatarThumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={targetUser.avatarThumbnail}
                alt=""
                style={{ width: 64, height: 64, objectFit: "contain", flexShrink: 0 }}
              />
            )}
            <div>
              <p style={{ fontFamily: INTER, fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
                {targetUser.name ?? "Anonymous"}
              </p>
              <p style={{ fontFamily: INTER, fontSize: 14, color: "#888", margin: "4px 0 0" }}>
                Where {targetUser.name?.split(" ")[0] ?? "they"} stand
              </p>
            </div>
          </div>

          {/* Continuum list */}
          {continuums.length === 0 ? (
            <p style={{ fontFamily: INTER, fontSize: 15, color: "#999" }}>
              No shared continuums yet.
            </p>
          ) : (
            continuums.map(c => {
              const href = c.ownerId === viewerId || !c.shareToken
                ? `/continuum/${c.id}`
                : `/continuum/${c.id}?token=${c.shareToken}`;
              const theirPosition = c.participants.find(p => p.userId === targetUserId)?.position ?? null;
              const myPosition = c.participants.find(p => p.userId === viewerId)?.position ?? null;
              const allPositions = c.participants.filter(p => !p.user.isSynthetic).map(p => p.position);

              return (
                <Link key={c.id} href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontFamily: INTER, fontSize: 13, color: "#aaa" }}>
                      {formatDate(c.createdAt.toISOString())}
                    </span>
                    <span style={{ fontFamily: INTER, fontSize: 13, color: "#aaa" }}>
                      {c._count.participants} {c._count.participants === 1 ? "response" : "responses"}
                    </span>
                  </div>

                  <p style={{ fontFamily: INTER, fontSize: 16, fontWeight: 600, color: "#1a1a1a", margin: "0 0 6px" }}>
                    {c.title}
                  </p>

                  {theirPosition !== null && (() => {
                    const hasTheirThumb = !!targetUser.avatarThumbnail;
                    return (
                      <ContinuumPreviewBar
                        positions={allPositions}
                        userPosition={theirPosition}
                        thumbnailUrl={targetUser.avatarThumbnail ?? null}
                        avatarSize={AVATAR_SIZE}
                        showDots={false}
                        secondaryPosition={hasTheirThumb ? myPosition : null}
                        secondaryThumbnailUrl={hasTheirThumb ? (viewerRecord?.avatarThumbnail ?? null) : null}
                      />
                    );
                  })()}

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: INTER, fontSize: 14, color: "#555" }}>{c.leftLabel}</span>
                    <span style={{ fontFamily: INTER, fontSize: 14, color: "#555" }}>{c.rightLabel}</span>
                  </div>

                  <div style={{ height: 1, background: "#ebebeb", margin: "14px 0" }} />
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
