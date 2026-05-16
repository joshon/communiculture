"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

const LABEL = "relative z-10 block px-3 py-1 text-[10px] uppercase tracking-widest text-white font-bold text-center active:translate-x-1 active:translate-y-1";

function PixelButton({ children, href, onClick }: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <div className="relative" style={{ paddingRight: 4, paddingBottom: 4 }}>
      {/* Dark shadow, offset 4px right+down */}
      <div
        className="absolute pointer-events-none"
        style={{ top: 4, left: 4, right: 0, bottom: 0, background: "#1A2B6E" }}
      />
      {href ? (
        <Link href={href} className={LABEL} style={{ background: "#3F58D0" }}>
          {children}
        </Link>
      ) : (
        <button onClick={onClick} className={LABEL} style={{ background: "#3F58D0" }}>
          {children}
        </button>
      )}
    </div>
  );
}

export function SiteChrome() {
  return (
    <div
      className="fixed top-3 right-3 z-50 flex gap-2"
      style={{ fontFamily: "var(--font-pixelify)" }}
    >
      <PixelButton href="#">about</PixelButton>
      <PixelButton onClick={() => signOut({ callbackUrl: "/" })}>log out</PixelButton>
    </div>
  );
}
