"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const BLUE = "#0083FF";

// sq = square size in px (1, 2, or 3). SVG pattern tile = sq * 2.
function makeTileSvg(sq: number): string {
  const tile = sq * 2;
  return (
    `url("data:image/svg+xml,` +
    `%3Csvg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'%3E` +
    `%3Crect x='0' y='0' width='${sq}' height='${sq}' fill='%230083FF'/%3E` +
    `%3Crect x='${sq}' y='${sq}' width='${sq}' height='${sq}' fill='%230083FF'/%3E` +
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
 * --tile is the square size (1/2/3 px). The SVG pattern tile = sq*2.
 * Shadow strips are one full pattern tile (2 squares) deep.
 * Corner phase: side strip anchored to bottom with height = floor(H/tile)*tile
 * so the last tile ends flush at the corner; both strips use backgroundPosition
 * "0 0" so phase 0 (blue) sits at the corner.
 */
export function PixelBox({
  children,
  style,
  className,
  shadowDir = "bottom-left",
}: PixelBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ sq: 3, sideH: 0, bottomW: 0 });

  useEffect(() => {
    const measure = () => {
      if (!boxRef.current) return;
      const sq =
        parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--tile")
            .trim()
        ) || 3;
      const tile = sq * 2; // SVG pattern repeat size
      const H = boxRef.current.offsetHeight;
      const W = boxRef.current.offsetWidth;
      setM({
        sq,
        sideH: Math.max(0, Math.floor(H / tile) * tile - sq * 2),
        bottomW: Math.max(0, Math.ceil((W + tile) / tile) * tile - sq * 2),
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

  const { sq, sideH, bottomW } = m;
  const tile = sq * 2;
  const isLeft = shadowDir === "bottom-left";
  const svg = makeTileSvg(sq);
  const tileStr = `${tile}px`;
  const negTile = `-${tile}px`;

  const bottomStrip: CSSProperties = {
    position: "absolute",
    bottom: negTile,
    ...(isLeft ? { left: negTile } : { right: negTile }),
    width: `${bottomW}px`,
    height: tileStr,
    backgroundImage: svg,
    backgroundRepeat: "repeat-x",
    backgroundSize: `${tileStr} ${tileStr}`,
    backgroundPosition: "0 0",
    pointerEvents: "none",
    zIndex: 0,
  };

  const sideStrip: CSSProperties = {
    position: "absolute",
    bottom: 0,
    top: "auto",
    ...(isLeft ? { left: negTile } : { right: negTile }),
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
