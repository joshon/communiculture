"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { usePixelShadow } from "./usePixelShadow";

const BLUE = "#0083FF";

// Square edges — corners sit flush with the pixel checkerboard shadow.
const RADIUS = 0;

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
  /** Leading "+" glyph, for buttons that create something. */
  plus?: boolean;
  label?: string;
  fontSize?: string;
  style?: CSSProperties;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function PillButton({
  children, href, onClick, type = "button",
  loading, arrow, plus, label, fontSize, style, variant = "primary", disabled,
}: PillButtonProps) {
  const fs = fontSize ?? "clamp(13px, 3vw, 16px)";
  const isPrimary = variant === "primary";
  const inactive = loading || disabled;

  // Same graphic as the speech-bubble shadow on continuum person rollovers.
  const { ref, bottomStrip, sideStrip, sq } = usePixelShadow("bottom-right");

  // Opacity belongs on the wrapper so the shadow dims with the button.
  const { opacity: styleOpacity, ...restStyle } = style ?? {};

  const base: CSSProperties = {
    position: "relative",
    zIndex: 1,
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
    borderRadius: RADIUS,
    cursor: inactive ? (disabled ? "not-allowed" : "default") : "pointer",
    whiteSpace: "nowrap",
    // One checker row on hover, two on press — see .cc-pill in globals.css.
    ["--pb-1" as string]: `${sq}px`,
    ["--pb-2" as string]: `${sq * 2}px`,
    ...restStyle,
  };

  // Only the shadowed (pressable) state moves; a dimmed button stays put.
  const pressClass = inactive ? undefined : "cc-pill";

  const arrowColor = isPrimary ? "white" : BLUE;

  const content = loading ? "…" : (
    <>
      {plus && <span aria-hidden style={{ marginRight: 9, flexShrink: 0 }}>+</span>}
      {label ?? children}
      {arrow && <ArrowIcon color={arrowColor} />}
    </>
  );

  const wrapper: CSSProperties = {
    position: "relative",
    display: "inline-block",
    verticalAlign: "bottom",
    opacity: inactive ? 0.5 : styleOpacity ?? 1,
  };

  // The shadow reads as the button's "active" state — drop it while the button
  // can't be pressed.
  //
  // Rendered AFTER the button so `.cc-pill:active ~ .cc-pill-shadow` can hide
  // it on press. Paint order is unaffected: the button's z-index (1) still
  // beats the strips' (0) regardless of DOM order. Hiding matters because the
  // strips are deliberately over-wide to keep the checker pattern phase-locked
  // at the corner, so a few px can survive to the left of a pressed button.
  const shadow = inactive ? null : (
    <>
      <div aria-hidden className="cc-pill-shadow" style={bottomStrip} />
      <div aria-hidden className="cc-pill-shadow" style={sideStrip} />
    </>
  );

  if (href) return (
    <span style={wrapper}>
      <Link ref={ref as React.RefObject<HTMLAnchorElement>} href={href} className={pressClass} style={base}>
        {content}
      </Link>
      {shadow}
    </span>
  );

  return (
    <span style={wrapper}>
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        className={pressClass}
        type={type}
        onClick={onClick}
        disabled={inactive}
        style={base}
      >
        {content}
      </button>
      {shadow}
    </span>
  );
}
