import Link from "next/link";
import type { CSSProperties } from "react";

const BLUE = "#0083FF";

function ArrowIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 7, flexShrink: 0 }}>
      <path d="M5.56702 1.11302L9.61902 5.56128L5.56702 10.0098M9.61902 5.56128L1.11283 5.56128"
        stroke="white" strokeWidth="2.22569" strokeLinecap="round"/>
    </svg>
  );
}

interface PillButtonProps {
  children?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  loading?: boolean;
  arrow?: boolean;
  label?: string;
  fontSize?: string;
  style?: CSSProperties;
}

export function PillButton({
  children, href, onClick, type = "button",
  loading, arrow, label, fontSize, style,
}: PillButtonProps) {
  const fs = fontSize ?? "clamp(13px, 1vw, 16px)";

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    background: BLUE,
    color: "white",
    fontFamily: "Proletarian, sans-serif",
    fontSize: fs,
    lineHeight: 1,
    paddingTop: "6px",
    paddingBottom: "6px",
    paddingLeft: "16px",
    paddingRight: "16px",
    borderRadius: 99,
    letterSpacing: "0.08em",
    cursor: loading ? "default" : "pointer",
    border: "none",
    opacity: loading ? 0.6 : 1,
    whiteSpace: "nowrap",
    ...style,
  };

  const content = loading ? "…" : (
    <>
      <span style={{ transform: "translateY(2px)" }}>{label ?? children}</span>
      {arrow && <ArrowIcon />}
    </>
  );

  if (href) return <Link href={href} style={base}><span style={{ transform: "translateY(2px)" }}>{label ?? children}</span></Link>;

  return (
    <button type={type} onClick={onClick} disabled={loading} style={base}>
      {content}
    </button>
  );
}
