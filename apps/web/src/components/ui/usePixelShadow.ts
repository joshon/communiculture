"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const BLUE = "#0083FF";

export type ShadowDir = "bottom-left" | "bottom-right";

/** Reads the live --tile square size. See makeTileSvg for what it means. */
export function useTileSquare(): number {
  const [sq, setSq] = useState(3);

  useEffect(() => {
    const read = () =>
      setSq(
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue("--tile").trim()
        ) || 3
      );
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return sq;
}

// sq = square size in px (1, 2, or 3). SVG pattern tile = sq * 2.
// `color` is a hex string; "#" must be percent-encoded inside a data: URI.
export function makeTileSvg(sq: number, color: string = BLUE): string {
  const tile = sq * 2;
  const fill = color.replace("#", "%23");
  return (
    `url("data:image/svg+xml,` +
    `%3Csvg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'%3E` +
    `%3Crect x='0' y='0' width='${sq}' height='${sq}' fill='${fill}'/%3E` +
    `%3Crect x='${sq}' y='${sq}' width='${sq}' height='${sq}' fill='${fill}'/%3E` +
    `%3C/svg%3E")`
  );
}

/**
 * The pixel-checkerboard offset shadow shared by PixelBox / SpeechBubble and
 * PillButton, so a button's shadow is the same graphic as a speech bubble's.
 *
 * Attach `ref` to the element being shadowed; render the two returned strips as
 * siblings inside a `position: relative` wrapper around it.
 *
 * --tile is the square size (1/2/3 px). The SVG pattern tile = sq*2.
 * Shadow strips are one full pattern tile (2 squares) deep.
 * Corner phase: side strip anchored to bottom with height = floor(H/tile)*tile
 * so the last tile ends flush at the corner; both strips use backgroundPosition
 * "0 0" so phase 0 (blue) sits at the corner.
 */
export function usePixelShadow(shadowDir: ShadowDir = "bottom-left", color: string = BLUE) {
  const ref = useRef<HTMLElement | null>(null);
  const [m, setM] = useState({ sq: 3, sideH: 0, bottomW: 0 });

  useEffect(() => {
    const measure = () => {
      if (!ref.current) return;
      const sq =
        parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--tile")
            .trim()
        ) || 3;
      const tile = sq * 2; // SVG pattern repeat size
      const H = ref.current.offsetHeight;
      const W = ref.current.offsetWidth;
      setM({
        sq,
        sideH: Math.max(0, Math.floor(H / tile) * tile - sq * 2),
        bottomW: Math.max(0, Math.ceil((W + tile) / tile) * tile - sq * 2),
      });
    };

    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
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
  const svg = makeTileSvg(sq, color);
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

  // `sq` is one checker row; the strips are two rows (`tile`) deep.
  return { ref, bottomStrip, sideStrip, sq, tile, BLUE };
}
