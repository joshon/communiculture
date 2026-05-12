"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AvatarRenderer } from "./AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";

// ─── vw scale helper (reference width: 1440px) ────────────────────────────────
const S = (px: number) => `${((px / 1440) * 100).toFixed(3)}vw`;

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

  return (
    <div className="relative h-screen overflow-hidden select-none">

      {/* ── Full-screen canvas ── */}
      <div className="absolute inset-0">
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

      {/* ── Logo + nav overlay (top-left) ── */}
      <div
        className="absolute"
        style={{
          top: S(70),
          left: S(40),
          pointerEvents: "none",
        }}
      >
        <Link href="/dashboard" className="block overflow-visible" style={{ pointerEvents: "auto" }}>
          <Image
            src="/logo.svg"
            alt="communi*culture"
            width={200}
            height={37}
            style={{ width: S(240), height: "auto" }}
            priority
          />
          <span
            className="block text-black/40 uppercase leading-none"
            style={{
              fontFamily: "var(--font-pixelify)",
              fontSize: S(10),
              letterSpacing: "0.2em",
              whiteSpace: "nowrap",
              marginTop: S(5),
            }}
          >
            a division of futurefarmers
          </span>
        </Link>

        <nav
          className="flex flex-col lowercase"
          style={{
            marginTop: S(18),
            gap: S(5),
            fontFamily: "var(--font-pixelify)",
            fontSize: S(20),
            color: LOGO_BLUE,
            pointerEvents: "auto",
          }}
        >
          <Link href="/dashboard" className="hover:opacity-60 transition-opacity">continuums</Link>
          <Link href="/dashboard" className="hover:opacity-60 transition-opacity">view others</Link>
        </nav>
      </div>

      {/* ── Palette + controls overlay (mid-left, higher and further right) ── */}
      <div
        className="absolute flex flex-col"
        style={{
          bottom: "22vh",
          left: S(200),
          pointerEvents: "none",
          gap: S(10),
        }}
      >
        {/* Variant selector */}
        {selectedPart && selectedPartVariantCount > 1 && (
          <div
            className="flex items-end"
            style={{ gap: S(8), pointerEvents: "auto", overflow: "visible" }}
          >
            {Array.from({ length: selectedPartVariantCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setVariantIndex(selectedPart, i)}
                className="flex-shrink-0 transition-all duration-100"
                style={{
                  transform: i === selectedVariantIdx ? "translateY(-5px)" : "none",
                }}
                title={`variant ${i + 1}`}
              >
                <AsteriskIcon color={LOGO_BLUE} size={S(13)} />
              </button>
            ))}
          </div>
        )}

        {/* Color label */}
        {selectedPart && (
          <p
            className="lowercase"
            style={{
              color: "rgba(0,0,0,0.3)",
              fontSize: S(9),
              letterSpacing: "0.2em",
              margin: 0,
            }}
          >
            {SKIN_PARTS.includes(selectedPart) ? "skin" : `${selectedPart} color`}
          </p>
        )}

        {/* Color palette — 3 rows with divider lines */}
        <div style={{ pointerEvents: "auto" }}>
          {[0, 1, 2].map((row) => (
            <div key={row}>
              <div style={{ display: "flex", gap: S(10), paddingBottom: S(8) }}>
                {COLOR_PALETTE.slice(row * 6, row * 6 + 6).map((col) => {
                  const isActive = col === activeColor;
                  return (
                    <button
                      key={col}
                      onClick={() => handleColorSelect(col)}
                      className="flex-shrink-0 transition-transform hover:scale-110"
                      style={{ transform: isActive ? "scale(1.3)" : undefined }}
                      title={col}
                    >
                      <AsteriskIcon color={col} size={S(20)} />
                    </button>
                  );
                })}
              </div>
              <div
                style={{
                  borderBottom: "1.5px solid rgba(0,0,0,0.18)",
                  marginBottom: S(8),
                }}
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div
          className="flex lowercase"
          style={{
            gap: S(20),
            fontSize: S(14),
            color: LOGO_BLUE,
            fontFamily: "var(--font-pixelify)",
            pointerEvents: "auto",
          }}
        >
          <button onClick={handleSubmit} disabled={saving} className="hover:opacity-60 transition-opacity disabled:opacity-30">
            {saving ? "saving…" : "submit"}
          </button>
          <button onClick={handleReset} className="hover:opacity-60 transition-opacity">reset</button>
          <button onClick={handleRandomize} className="hover:opacity-60 transition-opacity">random</button>
        </div>
      </div>
    </div>
  );
}
