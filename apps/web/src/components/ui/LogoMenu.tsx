"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PixelBox } from "@/components/ui/PixelBox";

const BLUE = "#0083FF";
const INTER = "var(--font-inter), Inter, sans-serif";

// CSS calc helpers that respond to --scale
const sc = (px: number) => `calc(var(--scale, 1) * ${px}px)`;

// SVG is 44×18 at 2px/design-pixel (22×9 design pixels).
const ARROW_W = "calc(var(--tile, 3px) * 22)";
const ARROW_H = "calc(var(--tile, 3px) * 9)";

interface Props {
  /** Rendered logo width (CSS length). */
  logoWidth: string;
  isMobile: boolean;
}

/**
 * Site-wide menu anchored to the Communiculture logo. Visually it is the
 * DashboardAvatarHead user menu mirrored to the left: the dropdown opens to the
 * right of the logo, the pixel arrow is flipped to point back at the logo, and
 * the checkerboard shadow falls to the bottom-right.
 */
export function LogoMenu({ logoWidth, isMobile }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

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
    // Always 14px to match the dashboard tabs (Popular / Recent / …).
    fontSize: 14,
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
        aria-label="Site menu"
        style={{ display: "block", background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <Image
          src="/logo.svg"
          alt="communi*culture"
          width={208}
          height={41}
          priority
          style={{ width: logoWidth, height: "auto", display: "block" }}
        />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: 0,
          left: `calc(100% + var(--tile, 3px) * 17)`,
          zIndex: 9999,
          ...((isMobile
            ? { "--scale": "1.5" }
            : { "--scale": "1.0417", "--tile": "2px" }) as Record<string, string>),
        }}>
          <PixelBox shadowDir="bottom-right" style={{ minWidth: isMobile ? "min(calc(var(--scale,1.5) * 180px), calc(100vw - 90px))" : sc(180) }}>
            <style>{`.cc-mi{color:rgba(0,0,0,0.6)}.cc-mi:hover{color:#000}`}</style>

            {/*
              Arrow tab: the user-menu arrow mirrored horizontally (scaleX(-1)) so the
              connector bar aligns with the box's LEFT border and the stepped tip points
              left toward the logo.
            */}
            <svg
              aria-hidden
              style={{
                position: "absolute",
                top: sc(10),
                left: `calc(var(--tile, 3px) * -17)`,
                width: ARROW_W,
                height: ARROW_H,
                display: "block",
                overflow: "visible",
                pointerEvents: "none",
                transform: "scaleX(-1)",
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

              {/* Orange chevrons */}
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

            <div style={{ ...itemStyle, color: "#000", fontWeight: 700, cursor: "default" }}>
              Communiculture
            </div>
            <div style={{ borderTop: `1px solid ${BLUE}` }} />
            <Link href="/dashboard" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>Continuums</Link>
            <Link href="/everyone" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>View everyone</Link>
            <div style={{ borderTop: `1px solid ${BLUE}` }} />
            <Link href="/about" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>About Communiculture</Link>
            <Link href="/contact" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>Contact</Link>
            <Link href="/terms" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>Terms</Link>
            <Link href="/privacy" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>Privacy</Link>
            {isAdmin && (
              <>
                <div style={{ borderTop: `1px solid ${BLUE}` }} />
                <Link href="/admin" onClick={() => setOpen(false)} className="cc-mi" style={itemStyle}>Admin</Link>
              </>
            )}
          </PixelBox>
        </div>
      )}
    </div>
  );
}
