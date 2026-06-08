"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useAvatarStore } from "@/store/avatarStore";
import { PixelBox } from "@/components/ui/PixelBox";
import { useIsMobile } from "@/hooks/useIsMobile";

const BLUE = "#0083FF";
const DARK = "#1A1A1A";
const INTER = "var(--font-inter), Inter, sans-serif";

// CSS calc helpers that respond to --scale
const sc = (px: number) => `calc(var(--scale, 1) * ${px}px)`;

// SVG is 44×18 at 2px/design-pixel (22×9 design pixels).
// --tile is now square size (1/2/3 px); scale factor = tile/2 per SVG unit → tile*22 wide, tile*9 tall.
const ARROW_W = "calc(var(--tile, 3px) * 22)";
const ARROW_H = "calc(var(--tile, 3px) * 9)";

interface Props {
  thumbnailUrl: string | null;
  size: string;
}

export function DashboardAvatarHead({ thumbnailUrl: serverThumbnailUrl, size }: Props) {
  const storeThumbnailUrl = useAvatarStore((s) => s.thumbnailUrl);
  const thumbnailUrl = storeThumbnailUrl ?? serverThumbnailUrl;
  const { data: session } = useSession();
  const userName = session?.user?.name;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile(1024);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: `${sc(9)} ${sc(18)}`,
    fontFamily: INTER,
    // Desktop: fixed 16px to match the breadcrumbs. Mobile: scales up.
    fontSize: isMobile ? sc(14) : 16,
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    whiteSpace: "nowrap",
    textDecoration: "none",
    lineHeight: 1.4,
  };

  return (
    <div ref={ref} style={{ flexShrink: 0, position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "block", background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="your avatar"
            style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
        ) : (
          <div style={{ width: size, height: size }} />
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: `calc(${size} * 2/3 - var(--scale, 1) * 18px - var(--tile, 3px) * 4.5)`,
          right: `calc(100% + var(--tile, 3px) * 17)`,
          zIndex: 9999,
          // Mobile scales up; desktop is pinned to the ~1500px-wide size (1500/1440)
          // so the menu doesn't grow with viewport width.
          ...((isMobile
            ? { "--scale": "1.5" }
            : { "--scale": "1.0417", "--tile": "2px" }) as Record<string, string>),
        }}>
          <PixelBox shadowDir="bottom-left" style={{ minWidth: isMobile ? "min(calc(var(--scale,1.5) * 160px), calc(100vw - 90px))" : sc(160) }}>
            <style>{`.cc-mi{color:rgba(0,0,0,0.6)}.cc-mi:hover{color:#000}`}</style>

            {/*
              Arrow tab: pixel-art arrow, flipped so the connector bar aligns with
              the box's right border and the stepped tip points right toward the avatar.
              Coordinates are on a 2px grid; all rotation/matrix transforms removed.
            */}
            <svg
              aria-hidden
              style={{
                position: "absolute",
                top: sc(10),
                // Position so the SVG left edge is at the outer right border edge.
                // The tip (SVG x=0) sits flush with the border; arrow body extends right.
                right: `calc(var(--tile, 3px) * -17)`,
                width: ARROW_W,
                height: ARROW_H,
                display: "block",
                overflow: "visible",
                pointerEvents: "none",
                zIndex: 2,
              }}
              viewBox="0 0 44 18"
              fill="none"
            >
              {/* Blue outlines */}
              <rect x="18" y="0"  width="24" height="2" fill={BLUE} />
              <rect x="10" y="0"  width="2"  height="2" fill={BLUE} />
              <rect x="16" y="2"  width="2"  height="2" fill={BLUE} />
              <rect x="8"  y="2"  width="2"  height="2" fill={BLUE} />
              <rect x="14" y="4"  width="2"  height="2" fill={BLUE} />
              <rect x="6"  y="4"  width="2"  height="2" fill={BLUE} />
              <rect x="12" y="6"  width="2"  height="2" fill={BLUE} />
              <rect x="4"  y="6"  width="2"  height="2" fill={BLUE} />
              <rect x="0"  y="6"  width="2"  height="2" fill={BLUE} />
              <rect x="2"  y="8"  width="2"  height="2" fill={BLUE} />
              <rect x="10" y="8"  width="2"  height="2" fill={BLUE} />
              <rect x="0"  y="10" width="2"  height="2" fill={BLUE} />
              <rect x="4"  y="10" width="2"  height="2" fill={BLUE} />
              <rect x="12" y="10" width="2"  height="2" fill={BLUE} />
              <rect x="6"  y="12" width="2"  height="2" fill={BLUE} />
              <rect x="14" y="12" width="2"  height="2" fill={BLUE} />
              <rect x="8"  y="14" width="2"  height="2" fill={BLUE} />
              <rect x="16" y="14" width="2"  height="2" fill={BLUE} />
              <rect x="10" y="16" width="2"  height="2" fill={BLUE} />
              <rect x="18" y="16" width="24" height="2" fill={BLUE} />
              {/* Right connector bar */}
              <rect x="42" y="2"  width="2"  height="14" fill={BLUE} />

              {/* White step fills (interior edge strips) */}
              <rect x="12" y="0"  width="6"  height="2" fill="white" />
              <rect x="10" y="2"  width="6"  height="2" fill="white" />
              <rect x="8"  y="4"  width="6"  height="2" fill="white" />
              <rect x="6"  y="6"  width="6"  height="2" fill="white" />
              <rect x="4"  y="8"  width="6"  height="2" fill="white" />
              <rect x="6"  y="10" width="6"  height="2" fill="white" />
              <rect x="8"  y="12" width="6"  height="2" fill="white" />
              <rect x="10" y="14" width="6"  height="2" fill="white" />
              <rect x="12" y="16" width="6"  height="2" fill="white" />

              {/* White fill — main interior */}
              <path d="M42 2 V4  H18 V2  Z" fill="white" />
              <path d="M42 4 V6  H16 V4  Z" fill="white" />
              <path d="M42 6 V8  H14 V6  Z" fill="white" />
              <path d="M12 8 H42 V10 H12 Z" fill="white" />
              <path d="M14 10 H42 V12 H14 Z" fill="white" />
              <path d="M16 12 H42 V14 H16 Z" fill="white" />
              <path d="M18 14 H42 V16 H18 Z" fill="white" />

              {/* Orange chevrons ( << ) */}
              <rect x="24" y="4"  width="4" height="2" fill="#DA5F44" />
              <rect x="22" y="6"  width="4" height="2" fill="#DA5F44" />
              <rect x="20" y="8"  width="4" height="2" fill="#DA5F44" />
              <rect x="22" y="10" width="4" height="2" fill="#DA5F44" />
              <rect x="24" y="12" width="4" height="2" fill="#DA5F44" />

              <rect x="34" y="4"  width="4" height="2" fill="#DA5F44" />
              <rect x="32" y="6"  width="4" height="2" fill="#DA5F44" />
              <rect x="30" y="8"  width="4" height="2" fill="#DA5F44" />
              <rect x="32" y="10" width="4" height="2" fill="#DA5F44" />
              <rect x="34" y="12" width="4" height="2" fill="#DA5F44" />
            </svg>

            {userName && (
              <div style={{ ...itemStyle, color: "#000", fontWeight: 700, cursor: "default" }}>
                {userName}
              </div>
            )}
            {userName && <div style={{ borderTop: `1px solid ${BLUE}` }} />}
            <Link href="/profile" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>Edit profile</Link>
            <Link href="/profile/avatar" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>Edit avatar</Link>
            <div style={{ borderTop: `1px solid ${BLUE}` }} />
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="cc-mi" style={itemStyle}>Log out</button>
            <div style={{ borderTop: `1px solid ${BLUE}` }} />
            <Link href="/about" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>About Communiculture</Link>
          </PixelBox>
        </div>
      )}
    </div>
  );
}
