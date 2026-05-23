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
 * White box with solid blue border and a pixel-checkerboard drop shadow.
 *
 * Shadow strips are anchored to the corner so the checkerboard phase is always
 * aligned there — no partial squares at the corner or at strip ends.
 *
 * Side strip: anchored to bottom, height = floor(H / tile) * tile (whole tiles only).
 * Bottom strip: anchored from the corner side, width = ceil((W + tile) / tile) * tile.
 * Both use backgroundPosition "0 0" so the corner tile phase is 0 on both strips.
 */
export function PixelBox({
  children,
  style,
  className,
  shadowDir = "bottom-left",
}: PixelBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ tile: 6, sideH: 0, bottomW: 0 });

  useEffect(() => {
    const measure = () => {
      if (!boxRef.current) return;
      const tile =
        parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--tile")
            .trim()
        ) || 6;
      const H = boxRef.current.offsetHeight;
      const W = boxRef.current.offsetWidth;
      setM({
        tile,
        // Round H *down* to whole tiles — no partial tile visible at top of strip.
        sideH: Math.floor(H / tile) * tile,
        // Round up so the strip fully covers W; last tile may protrude slightly.
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

  const { tile, sideH, bottomW } = m;
  const isLeft = shadowDir === "bottom-left";
  const svg = makeTileSvg(tile);
  const tileStr = `${tile}px`;
  const negTile = `-${tile}px`;

  // Bottom strip: one tile tall, extends under the side strip at the corner.
  // Anchored from the corner side so backgroundPosition "0 0" starts at the corner.
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

  // Side strip: anchored to bottom so the last tile ends flush at the corner row.
  // Height is floor(H/tile)*tile — whole tiles only, clean top edge.
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
