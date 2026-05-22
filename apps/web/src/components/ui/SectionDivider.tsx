"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { S, H } from "@/lib/scale";

const PRO = "Proletarian, sans-serif";

export function SectionDivider({ label }: { label: string }) {
  const mobile = useIsMobile(768);
  const fs = mobile ? `clamp(16px, ${H(20)}, 24px)` : `clamp(20px, ${S(28)}, 34px)`;

  return (
    <div>
      <div style={{ borderTop: "1px solid #D8D8D8", marginBottom: "clamp(12px, 1.2vw, 18px)" }} />
      <div style={{ textAlign: "center" }}>
        <span style={{
          fontFamily: PRO,
          fontSize: fs,
          color: "#1a1a1a",
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </div>
    </div>
  );
}
