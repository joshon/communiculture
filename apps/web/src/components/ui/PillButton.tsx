import Link from "next/link";
import type { CSSProperties } from "react";

const BLUE = "#0083FF";

function ArrowIcon({ color = "white" }: { color?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 7, flexShrink: 0 }}>
      <path d="M5.56702 1.11302L9.61902 5.56128L5.56702 10.0098M9.61902 5.56128L1.11283 5.56128"
        stroke={color} strokeWidth="2.22569" strokeLinecap="round"/>
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
  variant?: "primary" | "secondary";
}

export function PillButton({
  children, href, onClick, type = "button",
  loading, arrow, label, fontSize, style, variant = "primary",
}: PillButtonProps) {
  const fs = fontSize ?? "18px";
  const isPrimary = variant === "primary";

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    background: isPrimary ? BLUE : "white",
    color: isPrimary ? "white" : BLUE,
    border: isPrimary ? "none" : `1.5px solid ${BLUE}`,
    fontFamily: "Inter, sans-serif",
    fontSize: fs,
    fontWeight: 600,
    lineHeight: 1,
    paddingTop: "8px",
    paddingBottom: "8px",
    paddingLeft: "20px",
    paddingRight: "20px",
    borderRadius: 99,
    cursor: loading ? "default" : "pointer",
    opacity: loading ? 0.6 : 1,
    whiteSpace: "nowrap",
    ...style,
  };

  const arrowColor = isPrimary ? "white" : BLUE;

  const content = loading ? "…" : (
    <>
      {label ?? children}
      {arrow && <ArrowIcon color={arrowColor} />}
    </>
  );

  if (href) return (
    <Link href={href} style={base}>
      {label ?? children}
    </Link>
  );

  return (
    <button type={type} onClick={onClick} disabled={loading} style={base}>
      {content}
    </button>
  );
}
