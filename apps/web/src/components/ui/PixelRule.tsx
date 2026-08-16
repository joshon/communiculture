"use client";

import type { CSSProperties } from "react";
import { makeTileSvg, useTileSquare } from "./usePixelShadow";

/**
 * A horizontal checkerboard rule — the same graphic as the drop shadow under
 * buttons and speech bubbles, used as a divider rather than a shadow.
 *
 * Two checker rows deep (one full pattern tile), matching the shadow strips, so
 * the whole app's pixel furniture reads as one system and rescales together
 * with --tile.
 */
export function PixelRule({ style }: { style?: CSSProperties }) {
  const sq = useTileSquare();
  const tile = sq * 2;

  return (
    <div
      aria-hidden
      style={{
        width: "100%",
        height: tile,
        backgroundImage: makeTileSvg(sq),
        backgroundRepeat: "repeat-x",
        backgroundSize: `${tile}px ${tile}px`,
        // Phase 0 puts a blue square at the left edge, as the shadow strips do.
        backgroundPosition: "0 0",
        ...style,
      }}
    />
  );
}
