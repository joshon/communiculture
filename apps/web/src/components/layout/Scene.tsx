import type { CSSProperties, ReactNode } from "react";

interface SceneProps {
  children: ReactNode;
  /** "hidden" = viewport-locked, no scroll (default).
   *  "scroll" = allows vertical scroll when content overflows. */
  overflow?: "hidden" | "scroll";
  style?: CSSProperties;
}

export function Scene({ children, overflow = "hidden", style }: SceneProps) {
  return (
    <div style={{
      width: "100vw",
      height: "100svh",
      overflow: overflow === "scroll" ? "hidden auto" : "hidden",
      position: "relative",
      ...style,
    }}>
      {children}
    </div>
  );
}
