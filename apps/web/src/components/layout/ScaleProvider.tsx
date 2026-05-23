"use client";

import { useEffect } from "react";

const BASE_W = 1440;
const BASE_H = 900;

export function ScaleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const update = () => {
      const scale = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
      document.documentElement.style.setProperty("--scale", String(scale));

      // --tile: square size in px (1, 2, or 3).
      // 1px at scale < 0.9 (most laptops/phones), 2px at 0.9–1.5, 3px at 4K+
      const tile = scale < 0.9 ? 1 : scale < 1.5 ? 2 : 3;

      // --border: one checkerboard square wide
      const border = tile;

      document.documentElement.style.setProperty("--tile",   `${tile}px`);
      document.documentElement.style.setProperty("--border", `${border}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return <>{children}</>;
}
