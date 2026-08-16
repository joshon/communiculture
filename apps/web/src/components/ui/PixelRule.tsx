"use client";

import type { CSSProperties } from "react";
import { makeTileSvg, useTileSquare } from "./usePixelShadow";
import { BUTTON_BORDER_W } from "./PillButton";

/**
 * A horizontal checkerboard rule — the same graphic as the drop shadow under
 * buttons and speech bubbles, used as a divider rather than a shadow.
 *
 * Two checker rows deep (one full pattern tile), matching the shadow strips, so
 * the whole app's pixel furniture reads as one system and rescales together
 * with --tile.
 */
const BLUE = "#0083FF";

interface Props {
  style?: CSSProperties;
  /**
   * Draw a solid blue line above the checkers, at the same stroke width as a
   * secondary button's border so the two read as the same weight.
   */
  solidTop?: boolean;
}

/**
 * The rule's checkers run slightly larger than the shadow strips' so they stay
 * legible as a divider. The SVG is unchanged — only the rendered size scales —
 * so the button/bubble shadows keep their exact --tile sizing.
 */
const CHECKER_SCALE = 1.1;

export function PixelRule({ style, solidTop }: Props) {
  const sq = useTileSquare();
  // Two checker rows deep, matching the shadow strips, then scaled up.
  const tile = sq * 2 * CHECKER_SCALE;

  const checkers: CSSProperties = {
    width: "100%",
    height: tile,
    backgroundImage: makeTileSvg(sq),
    backgroundRepeat: "repeat-x",
    backgroundSize: `${tile}px ${tile}px`,
    // Phase 0 puts a blue square at the left edge, as the shadow strips do.
    backgroundPosition: "0 0",
  };

  if (!solidTop) return <div aria-hidden style={{ ...checkers, ...style }} />;

  return (
    <div aria-hidden style={{ width: "100%", ...style }}>
      <div style={{ width: "100%", height: BUTTON_BORDER_W, background: BLUE }} />
      <div style={checkers} />
    </div>
  );
}
