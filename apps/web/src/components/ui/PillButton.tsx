import Link from "next/link";
import type { CSSProperties } from "react";

const BLUE = "#0083FF";

interface PillButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

export function PillButton({ children, href, onClick, style }: PillButtonProps) {
  const base: CSSProperties = {
    display: "inline-block",
    background: BLUE,
    color: "white",
    fontFamily: "Proletarian, sans-serif",
    fontSize: "clamp(15px, 1.3vw, 20.5px)",
    lineHeight: 1,
    paddingTop: "7px",
    paddingBottom: "1px",
    paddingLeft: "16px",
    paddingRight: "16px",
    borderRadius: 99,
    letterSpacing: "0.08em",
    textTransform: "lowercase",
    cursor: "pointer",
    border: "none",
    ...style,
  };

  if (href) {
    return <Link href={href} style={base}>{children}</Link>;
  }

  return <button onClick={onClick} style={base}>{children}</button>;
}
