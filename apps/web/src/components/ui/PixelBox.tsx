"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePixelShadow, type ShadowDir } from "./usePixelShadow";

const BLUE = "#0083FF";

interface PixelBoxProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** Which side the shadow extends toward. Default "bottom-left". */
  shadowDir?: ShadowDir;
}

/**
 * White box with solid blue border and a pixel-checkerboard offset shadow.
 * The shadow itself lives in usePixelShadow, shared with PillButton.
 */
export function PixelBox({
  children,
  style,
  className,
  shadowDir = "bottom-left",
}: PixelBoxProps) {
  const { ref, bottomStrip, sideStrip } = usePixelShadow(shadowDir);

  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden style={bottomStrip} />
      <div aria-hidden style={sideStrip} />

      <div
        ref={ref as React.RefObject<HTMLDivElement>}
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
