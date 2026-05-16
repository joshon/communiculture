"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

const S = (px: number) => `${((px / 1440) * 100).toFixed(3)}vw`;
const H = (px: number) => `${((px / 844) * 100).toFixed(3)}svh`;

function PixelButton({ children, href, onClick, scale }: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  scale: (px: number) => string;
}) {
  const [pressed, setPressed] = useState(false);
  const offset = scale(4);

  const pressOn  = () => setPressed(true);
  const pressOff = () => setPressed(false);

  const fgStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 10,
    display: "block",
    background: "#3F58D0",
    color: "white",
    fontWeight: "bold",
    fontSize: scale(10),
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    textAlign: "center",
    paddingLeft: scale(12),
    paddingRight: scale(12),
    paddingTop: scale(5),
    paddingBottom: scale(5),
    transform: pressed ? `translate(${offset}, ${offset})` : "none",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ position: "relative", paddingRight: offset, paddingBottom: offset }}>
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
  const isMobile = useIsMobile();
  const scale = isMobile ? H : S;

  return (
    <div style={{
      position: "fixed",
      top: scale(12),
      right: scale(12),
      zIndex: 50,
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: scale(8),
      fontFamily: "var(--font-pixelify)",
    }}>
      <PixelButton href="#" scale={scale}>about</PixelButton>
      <PixelButton onClick={() => signOut({ callbackUrl: "/" })} scale={scale}>log out</PixelButton>

    </div>
  );
}
