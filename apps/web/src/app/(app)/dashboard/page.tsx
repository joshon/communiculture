import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import Link from "next/link";
import Image from "next/image";
import { Scene } from "@/components/layout/Scene";
import { PageTitle } from "@/components/ui/PageTitle";
import { PillButton } from "@/components/ui/PillButton";
import { DashboardAvatarHead } from "@/components/dashboard/DashboardAvatarHead";
import { ContinuumPreviewBar } from "@/components/dashboard/ContinuumPreviewBar";
import { CreateContinuumButton } from "@/components/continuum/CreateContinuumButton";
import { U } from "@/lib/scale";
import type { AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { DEFAULT_AVATAR } from "@/store/avatarStore";

const PRO = "Inter, sans-serif";
const INTER = "var(--font-inter), Inter, sans-serif";
const PIXEL = "CommPixel, monospace";
const BLUE = "#0083FF";

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

  const rawConfig = (userRecord?.avatarConfig as Record<string, string> | null) ?? {};
  const avatarColors = Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, rawConfig[p] ?? DEFAULT_AVATAR[p as keyof typeof DEFAULT_AVATAR]])
  ) as Record<AvatarPart, string>;

  const canCreate = userRecord?.plan !== "FREE" || continuums.length < 3;

  const pagePadTop   = `clamp(12px, ${U(50)}, 60px)`;
  const pageLeftPad  = `clamp(16px, ${U(38)}, 48px)`;
  const logoW        = `clamp(180px, ${U(475)}, 600px)`;
  const titleFs      = `clamp(11px, ${U(41)}, 56px)`;
  const logoMb       = `clamp(14px, ${U(32)}, 48px)`;
  const titleMb      = `clamp(20px, ${U(40)}, 56px)`;
  const continuumML  = `clamp(60px, ${U(240)}, 320px)`;
  const avatarSize   = `clamp(60px, ${U(100)}, 130px)`;

  return (
    <Scene style={{ background: "white" }}>
      <main style={{
        height: "100%",
        paddingTop: pagePadTop,
        paddingLeft: pageLeftPad,
        paddingRight: pageLeftPad,
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Row 1: Logo (left) + Avatar (right) */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: logoMb, flexShrink: 0 }}>
          <Link href="/dashboard" style={{ display: "block" }}>
            <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
              style={{ width: logoW, height: "auto" }} priority />
          </Link>
          <DashboardAvatarHead thumbnailUrl={userRecord?.avatarThumbnail ?? null} size={avatarSize} />
        </div>

        {/* Row 2: "home" title */}
        <div style={{ marginBottom: titleMb, flexShrink: 0 }}>
          <PageTitle fontSize={titleFs}>home</PageTitle>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ width: "40%", minWidth: 280, maxWidth: 640, margin: "0 auto" }}>

            {/* Section header */}
            <p style={{
              fontFamily: PRO,
              fontSize: `clamp(10px, ${U(18)}, 9999px)`,
              color: "#111",
              marginBottom: `clamp(8px, ${U(16)}, 22px)`,
            }}>
              continuums you own
            </p>

            {continuums.length === 0 ? (
              <p style={{ fontFamily: PRO, color: "#999", fontSize: "clamp(12px, 1vw, 14px)" }}>
                no continuums yet — create one to get started
              </p>
            ) : (
              continuums.map((c) => {
                const allPositions = c.participants.map((p) => p.position);
                const myPosition = c.participants.find((p) => p.userId === userId)?.position ?? null;

                return (
                  <Link key={c.id} href={`/continuum/${c.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                    {/* Date + response count */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: `clamp(2px, ${U(4)}, 6px)` }}>
                      <span style={{ fontFamily: INTER, fontSize: `clamp(9px, ${U(10)}, 12px)`, color: "#111" }}>
                        {formatDate(c.createdAt)}
                      </span>
                      <span style={{ fontFamily: INTER, fontSize: `clamp(9px, ${U(10)}, 12px)`, color: "#111" }}>
                        {c._count.participants} Response{c._count.participants !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Title */}
                    <p style={{ fontFamily: INTER, fontWeight: "bold", fontSize: `clamp(14px, ${U(18)}, 22px)`, color: "#111", margin: `0 0 clamp(4px, ${U(5)}, 7px)` }}>
                      {c.title}
                    </p>

                    {/* Labels */}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: INTER, fontSize: `clamp(12px, ${U(15)}, 18px)`, color: "#111" }}>{c.leftLabel}</span>
                      <span style={{ fontFamily: INTER, fontSize: `clamp(12px, ${U(15)}, 18px)`, color: "#111" }}>{c.rightLabel}</span>
                    </div>

                    {/* Spectrum bar */}
                    <ContinuumPreviewBar
                      positions={allPositions}
                      userPosition={myPosition}
                      thumbnailUrl={userRecord?.avatarThumbnail ?? null}
                      avatarSize={avatarSize}
                    />

                    {/* Divider */}
                    <div style={{ height: 1, background: "#000", margin: `clamp(10px, ${U(14)}, 20px) 0` }} />
                  </Link>
                );
              })
            )}

            {/* Footer */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: `clamp(12px, ${U(18)}, 24px)`,
              paddingBottom: `clamp(16px, ${U(24)}, 32px)`,
            }}>
              <PillButton href="/continuums"
                fontSize={`clamp(10px, ${U(18)}, 9999px)`}
                style={{
                  background: "none",
                  color: BLUE,
                  textDecoration: "underline",
                  paddingTop: U(7),
                  paddingBottom: U(7),
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
              >see all your continuums</PillButton>
              <CreateContinuumButton canCreate={canCreate} count={continuums.length} />
            </div>

          </div>
        </div>

      </main>
    </Scene>
  );
}
