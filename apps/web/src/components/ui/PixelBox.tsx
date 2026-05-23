"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const BLUE = "#0083FF";

function makeTileSvg(tile: number): string {
  const half = tile / 2;
  return (
    `url("data:image/svg+xml,` +
    `%3Csvg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'%3E` +
    `%3Crect x='0' y='0' width='${half}' height='${half}' fill='%230083FF'/%3E` +
    `%3Crect x='${half}' y='${half}' width='${half}' height='${half}' fill='%230083FF'/%3E` +
    `%3C/svg%3E")`
  );
}

interface PixelBoxProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** Which side the shadow extends toward. Default "bottom-left". */
  shadowDir?: "bottom-left" | "bottom-right";
}

/**
 * White box with solid blue border and a pixel-checkerboard offset shadow.
 *
 * Shadow strips are exactly ONE square (tile/2 = border width) deep — the same
 * weight as the border — giving a compact offset-shadow look.
 *
 * Corner phase alignment: side strip anchored to bottom with height = floor(H/tile)*tile
 * so the last tile ends flush at the corner; bottom strip anchored from the corner
 * side. Both strips use backgroundPosition "0 0" so phase 0 (blue) sits at the corner.
 */
export function PixelBox({
  children,
  style,
  className,
  shadowDir = "bottom-left",
}: PixelBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ tile: 6, borderPx: 3, sideH: 0, bottomW: 0 });

  useEffect(() => {
    const measure = () => {
      if (!boxRef.current) return;
      const tile =
        parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--tile")
            .trim()
        ) || 6;
      const borderPx = tile / 2;
      const H = boxRef.current.offsetHeight;
      const W = boxRef.current.offsetWidth;
      setM({
        tile,
        borderPx,
        // Whole tiles only — no partial tile at top of side strip.
        sideH: Math.floor(H / tile) * tile,
        // Covers W + one full tile; rounds up to tile boundary for clean right end.
        bottomW: Math.ceil((W + tile) / tile) * tile,
      });
    };

    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { tile, borderPx, sideH, bottomW } = m;
  const isLeft = shadowDir === "bottom-left";
  const svg = makeTileSvg(tile);
  const tileStr = `${tile}px`;
  const negT = `-${tile}px`;

  // Bottom strip: one TILE tall (two squares), extends one tile under the side strip
  // corner so the L-shape is complete.
  const bottomStrip: CSSProperties = {
    position: "absolute",
    bottom: negT,
    ...(isLeft ? { left: negT } : { right: negT }),
    width: `${bottomW}px`,
    height: tileStr,
    backgroundImage: svg,
    backgroundRepeat: "repeat-x",
    backgroundSize: `${tileStr} ${tileStr}`,
    backgroundPosition: "0 0",
    pointerEvents: "none",
    zIndex: 0,
  };

  // Side strip: one TILE wide (two squares), height = floor(H/tile)*tile so
  // it ends on a tile boundary at the corner — phase 0 (blue) aligns with bottom strip.
  const sideStrip: CSSProperties = {
    position: "absolute",
    bottom: 0,
    top: "auto",
    ...(isLeft ? { left: negT } : { right: negT }),
    width: tileStr,
    height: sideH > 0 ? `${sideH}px` : 0,
    backgroundImage: svg,
    backgroundRepeat: "repeat-y",
    backgroundSize: `${tileStr} ${tileStr}`,
    backgroundPosition: "0 0",
    pointerEvents: "none",
    zIndex: 0,
  };

  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden style={bottomStrip} />
      <div aria-hidden style={sideStrip} />

      <div
        ref={boxRef}
        className={className}
        style={{
          position: "relative",
          overflow: "visible",
          background: "white",
          border: `var(--border, 2px) solid ${BLUE}`,
          zIndex: 1,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
