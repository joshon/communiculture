"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { S, H } from "@/lib/scale";

const BLUE = "#0083FF";
const DARK_BLUE = "#3F58D0";
const INTER = "var(--font-inter)";

interface OAuthButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export function OAuthButton({ onClick, icon, label }: OAuthButtonProps) {
  const mobile = useIsMobile(768);
  const fs = mobile ? `clamp(13px, ${H(15)}, 18px)` : `clamp(13px, ${S(16)}, 20px)`;
  const py = mobile ? `clamp(9px, ${H(11)}, 14px)`  : `clamp(9px, ${S(12)}, 16px)`;
  const mb = mobile ? `clamp(8px, ${H(10)}, 14px)`  : `clamp(8px, ${S(12)}, 16px)`;

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(8px, 1vw, 12px)",
        width: "100%",
        border: `1.5px solid ${BLUE}`,
        borderRadius: 10,
        paddingTop: py,
        paddingBottom: py,
        paddingLeft: "20px",
        paddingRight: "20px",
        fontFamily: INTER,
        fontSize: fs,
        color: "#1a1a1a",
        background: "white",
        cursor: "pointer",
        marginBottom: mb,
        letterSpacing: "0.02em",
      }}
    >
      <span style={{ display: "flex", width: 16, height: 16, flexShrink: 0, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
