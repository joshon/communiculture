"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AvatarRenderer } from "./AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";

// ─── 18-color palette ─────────────────────────────────────────────────────────
export const COLOR_PALETTE: string[] = [
  "#191A1C", "#3F58D0", "#608E76", "#659AC7",
  "#6CAE8C", "#6EBBD9", "#90994F", "#917143",
  "#93559C", "#A7A6A4", "#E2F161", "#E96475",
  "#EA6BA8", "#EDA5CF", "#EE9181", "#F3BD87",
  "#F5F3F2", "#F7D45D",
];

const SKIN_TONES: string[] = [
  "#F5F3F2", "#F3BD87", "#EE9181", "#917143", "#191A1C",
];

const SKIN_PARTS: AvatarPart[] = ["head", "neck", "arms", "legs"];
const DEFAULT_SKIN = "#F3BD87";

const DEFAULT_COLORS: Record<AvatarPart, string> = {
  hair:  "#191A1C",
  head:  DEFAULT_SKIN,
  face:  "#191A1C",
  neck:  DEFAULT_SKIN,
  arms:  DEFAULT_SKIN,
  body:  "#6CAE8C",
  pants: "#3F58D0",
  legs:  DEFAULT_SKIN,
  shoes: "#917143",
};

const DEFAULT_VARIANTS = Object.fromEntries(
  AVATAR_PARTS.map((p) => [p, 0])
) as Record<AvatarPart, number>;

const LOGO_BLUE = "#0083FF";

// ─── asterisk SVG ─────────────────────────────────────────────────────────────

function AsteriskIcon({ color, size = 24 }: { color: string; size?: number | string }) {
  const isNum = typeof size === "number";
  return (
    <svg
      width={isNum ? (size as number) : undefined}
      height={isNum ? Math.round((size as number) * 28 / 27) : undefined}
      style={!isNum ? { width: size as string, height: "auto", display: "block" } : { display: "block" }}
      viewBox="0 0 27 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="10.7251" width="5.55007" height="27.9725" fill={color} />
      <rect
        x="24.2249" y="4.58984"
        width="5.55007" height="27.9725"
        transform="rotate(60 24.2249 4.58984)"
        fill={color}
      />
      <rect
        x="27" y="18.5762"
        width="5.55007" height="27.9725"
        transform="rotate(120 27 18.5762)"
        fill={color}
      />
    </svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

interface AvatarEditorProps {
  library: AvatarVariantLibrary;
  initialColors?: Record<AvatarPart, string>;
  initialVariants?: Record<AvatarPart, number>;
  onSave: (colors: Record<AvatarPart, string>, variants: Record<AvatarPart, number>) => Promise<void>;
}

export function AvatarEditor({
  library,
  initialColors,
  initialVariants,
  onSave,
}: AvatarEditorProps) {
  const [colors, setColors] = useState<Record<AvatarPart, string>>(
    initialColors ?? DEFAULT_COLORS
  );
  const [variants, setVariants] = useState<Record<AvatarPart, number>>(
    initialVariants ?? DEFAULT_VARIANTS
  );
  const [selectedPart, setSelectedPart] = useState<AvatarPart | null>("hair");
  const [saving, setSaving] = useState(false);

  const cycleVariant = useCallback((part: AvatarPart, dir: 1 | -1) => {
    const count = library[part]?.length ?? 1;
    setVariants((prev) => ({
      ...prev,
      [part]: ((prev[part] ?? 0) + dir + count) % count,
    }));
  }, [library]);

  const setVariantIndex = useCallback((part: AvatarPart, idx: number) => {
    setVariants((prev) => ({ ...prev, [part]: idx }));
  }, []);

  const handlePartClick = useCallback((part: AvatarPart) => {
    setSelectedPart((prev) => {
      if (prev === part) {
        cycleVariant(part, 1);
        return part;
      }
      return part;
    });
  }, [cycleVariant]);

  const handleColorSelect = useCallback((color: string) => {
    if (!selectedPart) return;
    if (SKIN_PARTS.includes(selectedPart)) {
      setColors((prev) => ({
        ...prev,
        ...Object.fromEntries(SKIN_PARTS.map((p) => [p, color])),
      }));
    } else {
      setColors((prev) => ({ ...prev, [selectedPart]: color }));
    }
  }, [selectedPart]);

  const handleReset = useCallback(() => {
    setColors(DEFAULT_COLORS);
    setVariants(DEFAULT_VARIANTS);
    setSelectedPart("hair");
  }, []);

  const handleRandomize = useCallback(() => {
    const rand = () => COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    const randVariant = (part: AvatarPart) => Math.floor(Math.random() * (library[part]?.length ?? 1));
    const skinColor = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const skinEntries = Object.fromEntries(SKIN_PARTS.map((p) => [p, skinColor]));
    const nonSkinEntries = Object.fromEntries(
      AVATAR_PARTS.filter((p) => !SKIN_PARTS.includes(p)).map((p) => [p, rand()])
    );
    setColors({ ...nonSkinEntries, ...skinEntries } as Record<AvatarPart, string>);
    setVariants(Object.fromEntries(AVATAR_PARTS.map((p) => [p, randVariant(p)])) as Record<AvatarPart, number>);
  }, [library]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(colors, variants);
    } finally {
      setSaving(false);
    }
  }, [colors, variants, onSave]);

  const selectedPartVariantCount = selectedPart ? (library[selectedPart]?.length ?? 1) : 0;
  const selectedVariantIdx = selectedPart ? (variants[selectedPart] ?? 0) : 0;
  const activeColor = selectedPart
    ? (SKIN_PARTS.includes(selectedPart) ? colors["head"] : colors[selectedPart])
    : null;

  // Shared text style for nav/labels/actions — vw-scaled, logo blue
  const textStyle = (size: string) => ({
    fontFamily: "var(--font-pixelify)",
    fontSize: size,
    color: LOGO_BLUE,
  });

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden select-none">

      {/* ── Left column ──
          On mobile: full width, stacked above canvas.
          On desktop: fixed vw-based width so canvas gets the rest.
          md:w-[14vw] overrides w-full at ≥768px viewport.
      */}
      <div
        className="flex flex-col flex-shrink-0 overflow-visible
                   w-full md:w-[14vw] md:min-w-[160px] md:max-w-[220px]
                   md:h-full md:overflow-y-auto"
        style={{
          paddingLeft:   "clamp(14px, 1.8vw, 28px)",
          paddingRight:  "clamp(10px, 1.2vw, 20px)",
          paddingTop:    "clamp(20px, 5vw, 80px)",   // push logo ~1/6 down
          paddingBottom: "clamp(12px, 1.5vw, 20px)",
          // Desktop: this div is a flex column so the spacer can push palette down
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo + tagline */}
        <Link href="/dashboard" className="block flex-shrink-0 overflow-visible">
          <Image
            src="/logo.svg"
            alt="communi*culture"
            width={200}
            height={37}
            style={{ width: "clamp(90px, 9vw, 160px)", height: "auto" }}
            priority
          />
          {/* Intentionally single-line; overflows to right, not wrapped */}
          <span
            className="block text-black/40 uppercase leading-none mt-1"
            style={{
              fontFamily: "var(--font-pixelify)",
              fontSize: "clamp(6px, 0.55vw, 9px)",
              letterSpacing: "0.2em",
              whiteSpace: "nowrap",
            }}
          >
            a division of futurefarmers
          </span>
        </Link>

        {/* Nav */}
        <nav className="mt-3 flex flex-col gap-0.5 flex-shrink-0 lowercase">
          <Link href="/dashboard" className="hover:opacity-60 transition-opacity" style={textStyle("clamp(11px, 1vw, 16px)")}>continuums</Link>
          <Link href="/dashboard" className="hover:opacity-60 transition-opacity" style={textStyle("clamp(11px, 1vw, 16px)")}>view others</Link>
        </nav>

        {/* Flexible spacer — proportional gap between nav and palette */}
        <div className="flex-1 min-h-[16px] max-h-[30vh]" />

        {/* Variant selector — single row, all same size, raised = selected */}
        <div className="flex-shrink-0" style={{ minHeight: "clamp(14px, 1.8vw, 22px)" }}>
          {selectedPart && selectedPartVariantCount > 1 && (
            <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
              {Array.from({ length: selectedPartVariantCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setVariantIndex(selectedPart, i)}
                  className="flex-shrink-0 transition-all duration-100"
                  style={{
                    transform: i === selectedVariantIdx ? "translateY(-4px)" : "none",
                    opacity:   i === selectedVariantIdx ? 1 : 0.4,
                  }}
                  title={`variant ${i + 1}`}
                >
                  <AsteriskIcon color={LOGO_BLUE} size="clamp(9px, 1.1vw, 14px)" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color label */}
        {selectedPart && (
          <p
            className="lowercase mt-3 mb-1.5 flex-shrink-0"
            style={{ color: "rgba(0,0,0,0.3)", fontSize: "clamp(6px, 0.5vw, 9px)", letterSpacing: "0.2em" }}
          >
            {SKIN_PARTS.includes(selectedPart) ? "skin" : `${selectedPart} color`}
          </p>
        )}

        {/* Color palette — content-sized columns, not stretched to container */}
        <div
          className="flex-shrink-0"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, max-content)",
            gap: "clamp(3px, 0.4vw, 7px)",
          }}
        >
          {COLOR_PALETTE.map((col) => {
            const isActive = col === activeColor;
            return (
              <button
                key={col}
                onClick={() => handleColorSelect(col)}
                className="transition-transform hover:scale-110"
                style={{ transform: isActive ? "scale(1.3)" : undefined }}
                title={col}
              >
                <AsteriskIcon color={col} size={`clamp(16px, 1.6vw, 22px)`} />
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div
          className="mt-4 flex gap-4 flex-shrink-0 lowercase"
          style={{ fontSize: "clamp(9px, 0.8vw, 13px)", color: LOGO_BLUE, fontFamily: "var(--font-pixelify)" }}
        >
          <button onClick={handleSubmit} disabled={saving} className="hover:opacity-60 transition-opacity disabled:opacity-30">
            {saving ? "saving…" : "submit"}
          </button>
          <button onClick={handleReset} className="hover:opacity-60 transition-opacity">reset</button>
          <button onClick={handleRandomize} className="hover:opacity-60 transition-opacity">random</button>
        </div>
      </div>

      {/* ── Right column: 3D avatar (flex-1 fills the rest of the row) ── */}
      <div className="flex-1 min-h-[360px] md:h-full">
        <AvatarRenderer
          library={library}
          variantIndices={variants}
          colors={colors}
          selectedPart={selectedPart}
          onPartClick={handlePartClick}
          showOutline={true}
          showLabels={true}
        />
      </div>
    </div>
  );
}
