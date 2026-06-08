"use client";

import type { CSSProperties, ReactNode } from "react";
import { PixelBox } from "./PixelBox";

const BLUE = "#0083FF";
const ORANGE = "#DA5F44";

// Same pixel grid as DashboardAvatarHead arrow: viewBox 44×18, tile/2 px per unit.
const ARROW_W = "calc(var(--tile, 3px) * 22)";
const ARROW_H = "calc(var(--tile, 3px) * 9)";

interface Props {
  children: ReactNode;
  /** true = avatar is to the RIGHT → arrow on right, shadow on left */
  anchorRight: boolean;
  /** px from bubble's top edge to the arrow's vertical center */
  arrowCenterY: number;
  /** when true, the arrow points UP from the top edge (used on mobile) */
  arrowUp?: boolean;
  /** for arrowUp: horizontal position of the arrow within the box, in px from left */
  arrowX?: number;
  style?: CSSProperties;
}

export function SpeechBubble({ children, anchorRight, arrowCenterY, arrowUp, arrowX, style }: Props) {
  // Arrow is positioned relative to PixelBox's inner content div.
  // same geometry as DashboardAvatarHead: right: tile*-17 puts the TIP flush
  // with the border; the rectangular body extends outward toward the avatar.
  // scaleX(-1) flips for right-side placement.
  // anchorRight=true (avatar on RIGHT): no flip, connector sticks right toward avatar — matches DashboardAvatarHead
  // anchorRight=false (avatar on LEFT): scaleX(-1) mirrors connector to the left toward avatar
  // Up arrow (mobile): rotate the left-pointing arrow so its tip points up, and
  // sit it just above the box, horizontally centred.
  const arrowStyle: CSSProperties = arrowUp
    ? {
        position: "absolute",
        top: "calc(var(--tile, 3px) * -9)",
        left: arrowX != null ? arrowX : "50%",
        transform: `translateX(-50%) rotate(-90deg)`,
        transformOrigin: "center center",
        width: ARROW_W,
        height: ARROW_H,
        display: "block",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 2,
      }
    : {
        position: "absolute",
        top: arrowCenterY,
        transform: `translateY(-50%)${!anchorRight ? " scaleX(-1)" : ""}`,
        transformOrigin: "center center",
        ...(anchorRight
          ? { right: "calc(var(--tile, 3px) * -17)" }
          : { left:  "calc(var(--tile, 3px) * -17)" }),
        width: ARROW_W,
        height: ARROW_H,
        display: "block",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 2,
      };

  return (
    <PixelBox
      shadowDir={arrowUp ? "bottom-left" : anchorRight ? "bottom-left" : "bottom-right"}
      style={{ padding: "12px 14px", ...style }}
    >
      {/* Pixel-art arrow — identical SVG to DashboardAvatarHead */}
      <svg aria-hidden style={arrowStyle} viewBox="0 0 44 18" fill="none">
        {/* Blue outline — stepped diamond pointing left (tip at x=0) */}
        <rect x="18" y="0"  width="24" height="2" fill={BLUE} />
        <rect x="10" y="0"  width="2"  height="2" fill={BLUE} />
        <rect x="16" y="2"  width="2"  height="2" fill={BLUE} />
        <rect x="8"  y="2"  width="2"  height="2" fill={BLUE} />
        <rect x="14" y="4"  width="2"  height="2" fill={BLUE} />
        <rect x="6"  y="4"  width="2"  height="2" fill={BLUE} />
        <rect x="12" y="6"  width="2"  height="2" fill={BLUE} />
        <rect x="4"  y="6"  width="2"  height="2" fill={BLUE} />
        <rect x="0"  y="6"  width="2"  height="2" fill={BLUE} />
        <rect x="2"  y="8"  width="2"  height="2" fill={BLUE} />
        <rect x="10" y="8"  width="2"  height="2" fill={BLUE} />
        <rect x="0"  y="10" width="2"  height="2" fill={BLUE} />
        <rect x="4"  y="10" width="2"  height="2" fill={BLUE} />
        <rect x="12" y="10" width="2"  height="2" fill={BLUE} />
        <rect x="6"  y="12" width="2"  height="2" fill={BLUE} />
        <rect x="14" y="12" width="2"  height="2" fill={BLUE} />
        <rect x="8"  y="14" width="2"  height="2" fill={BLUE} />
        <rect x="16" y="14" width="2"  height="2" fill={BLUE} />
        <rect x="10" y="16" width="2"  height="2" fill={BLUE} />
        <rect x="18" y="16" width="24" height="2" fill={BLUE} />
        {/* Connector bar at wide end (adjacent to box border) */}
        <rect x="42" y="2"  width="2"  height="14" fill={BLUE} />

        {/* White stepped edge fills */}
        <rect x="12" y="0"  width="6"  height="2" fill="white" />
        <rect x="10" y="2"  width="6"  height="2" fill="white" />
        <rect x="8"  y="4"  width="6"  height="2" fill="white" />
        <rect x="6"  y="6"  width="6"  height="2" fill="white" />
        <rect x="4"  y="8"  width="6"  height="2" fill="white" />
        <rect x="6"  y="10" width="6"  height="2" fill="white" />
        <rect x="8"  y="12" width="6"  height="2" fill="white" />
        <rect x="10" y="14" width="6"  height="2" fill="white" />
        <rect x="12" y="16" width="6"  height="2" fill="white" />

        {/* White interior */}
        <path d="M42 2 V4  H18 V2  Z" fill="white" />
        <path d="M42 4 V6  H16 V4  Z" fill="white" />
        <path d="M42 6 V8  H14 V6  Z" fill="white" />
        <path d="M12 8 H42 V10 H12 Z" fill="white" />
        <path d="M14 10 H42 V12 H14 Z" fill="white" />
        <path d="M16 12 H42 V14 H16 Z" fill="white" />
        <path d="M18 14 H42 V16 H18 Z" fill="white" />

        {/* Orange chevrons << */}
        <rect x="24" y="4"  width="4" height="2" fill={ORANGE} />
        <rect x="22" y="6"  width="4" height="2" fill={ORANGE} />
        <rect x="20" y="8"  width="4" height="2" fill={ORANGE} />
        <rect x="22" y="10" width="4" height="2" fill={ORANGE} />
        <rect x="24" y="12" width="4" height="2" fill={ORANGE} />
        <rect x="34" y="4"  width="4" height="2" fill={ORANGE} />
        <rect x="32" y="6"  width="4" height="2" fill={ORANGE} />
        <rect x="30" y="8"  width="4" height="2" fill={ORANGE} />
        <rect x="32" y="10" width="4" height="2" fill={ORANGE} />
        <rect x="34" y="12" width="4" height="2" fill={ORANGE} />
      </svg>

      {children}
    </PixelBox>
  );
}
