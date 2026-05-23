"use client";

import { useEffect } from "react";

const BASE_W = 1440;
const BASE_H = 900;

export function ScaleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const update = () => {
      const scale = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
      document.documentElement.style.setProperty("--scale", String(scale));

      // --tile: 3 discrete sizes (1px squares=2px tile, 2px=4px, 3px=6px)
      // 2px at scale < 1.2 (laptops up to ~1730px wide), 4px at 1.2–2.0, 6px at 4K+
      const tileRaw = scale * 6; // kept for reference
      const tile = scale < 1.2 ? 2 : scale < 2.0 ? 4 : 6;

      // --border: same size as one checkerboard square (tile / 2)
      const border = tile / 2;

      document.documentElement.style.setProperty("--tile",   `${tile}px`);
      document.documentElement.style.setProperty("--border", `${border}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return <>{children}</>;
}
