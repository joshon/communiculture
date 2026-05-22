import type { CSSProperties, ReactNode } from "react";

type VEdge = "top" | "middle" | "bottom";
type HEdge = "left" | "center" | "right";

interface PlaceProps {
  children: ReactNode;
  /** Vertical anchor edge (default: top) */
  v?: VEdge;
  /** Horizontal anchor edge (default: left) */
  h?: HEdge;
  /** Offset from the vertical anchor, in scale units (default: 0) */
  y?: number;
  /** Offset from the horizontal anchor, in scale units (default: 0) */
  x?: number;
  style?: CSSProperties;
  className?: string;
}

export function Place({ children, v = "top", h = "left", x = 0, y = 0, style, className }: PlaceProps) {
  const pos: CSSProperties = { position: "absolute" };

  const ux = `calc(var(--scale, 1) * ${x}px)`;
  const uy = `calc(var(--scale, 1) * ${y}px)`;

  // Vertical placement
  let ty = "0%";
  if (v === "top")         pos.top = uy;
  else if (v === "bottom") pos.bottom = uy;
  else { pos.top = "50%"; ty = `calc(-50% + ${uy})`; }

  // Horizontal placement
  let tx = "0%";
  if (h === "left")        pos.left = ux;
  else if (h === "right")  pos.right = ux;
  else { pos.left = "50%"; tx = `calc(-50% + ${ux})`; }

  if (tx !== "0%" || ty !== "0%") pos.transform = `translate(${tx}, ${ty})`;

  return (
    <div style={{ ...pos, ...style }} className={className}>
      {children}
    </div>
  );
}
