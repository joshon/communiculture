"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { S, H } from "@/lib/scale";

export function PageTitle({ children, fontSize }: { children: React.ReactNode; fontSize?: string }) {
  const mobile = useIsMobile(768);
  const fs = fontSize ?? (mobile
    ? `clamp(28px, ${H(40)}, 48px)`
    : `clamp(40px, ${S(58)}, 80px)`);

  return (
    <h1 style={{
      fontFamily: "Inter, sans-serif",
      fontWeight: "regular",
      fontSize: fs,
      color: "#1A1A1A",
      margin: 0,
      lineHeight: 1,
      letterSpacing: "-0.01em",
    }}>
      {children}
    </h1>
  );
}
