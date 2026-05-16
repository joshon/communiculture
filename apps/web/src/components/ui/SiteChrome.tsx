"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";

const S = (px: number) => `${((px / 1440) * 100).toFixed(3)}vw`;

function PixelButton({ children, href, onClick }: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const offset = S(4);

  const pressOn  = () => setPressed(true);
  const pressOff = () => setPressed(false);

  const fgStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 10,
    display: "block",
    background: "#3F58D0",
    color: "white",
    fontWeight: "bold",
    fontSize: S(10),
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    textAlign: "center",
    paddingLeft: S(12),
    paddingRight: S(12),
    paddingTop: S(5),
    paddingBottom: S(5),
    transform: pressed ? `translate(${offset}, ${offset})` : "none",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ position: "relative", paddingRight: offset, paddingBottom: offset }}>
      {/* Dark shadow offset */}
      <div style={{
        position: "absolute",
        top: offset, left: offset, right: 0, bottom: 0,
        background: "#1A2B6E",
        pointerEvents: "none",
      }} />
      {href ? (
        <Link href={href} style={fgStyle}
          onMouseDown={pressOn} onMouseUp={pressOff} onMouseLeave={pressOff}
          onTouchStart={pressOn} onTouchEnd={pressOff} onTouchCancel={pressOff}
        >{children}</Link>
      ) : (
        <button onClick={onClick} style={fgStyle}
          onMouseDown={pressOn} onMouseUp={pressOff} onMouseLeave={pressOff}
          onTouchStart={pressOn} onTouchEnd={pressOff} onTouchCancel={pressOff}
        >{children}</button>
      )}
    </div>
  );
}

export function SiteChrome() {
  return (
    <div style={{
      position: "fixed",
      top: S(12),
      right: S(12),
      zIndex: 50,
      display: "flex",
      gap: S(8),
      fontFamily: "var(--font-pixelify)",
    }}>
      <PixelButton href="#">about</PixelButton>
      <PixelButton onClick={() => signOut({ callbackUrl: "/" })}>log out</PixelButton>
    </div>
  );
}
