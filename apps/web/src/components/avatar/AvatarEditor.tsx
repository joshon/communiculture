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

// Skin-tone subset of the palette (light → dark)
const SKIN_TONES: string[] = [
  "#F5F3F2", "#F3BD87", "#EE9181", "#917143", "#191A1C",
];

// Parts that share the same skin tone
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

// ─── asterisk SVG ─────────────────────────────────────────────────────────────

function AsteriskIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 28 / 27)}
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

  // First click selects; second click on same part cycles to next variant
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

  // Active color for the selected part (accounts for skin linking)
  const activeColor = selectedPart
    ? (SKIN_PARTS.includes(selectedPart) ? colors["head"] : colors[selectedPart])
    : null;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden select-none">

      {/* ── Left column: logo / nav / variant selector / color palette ── */}
      <div className="flex flex-col w-full md:w-52 flex-shrink-0 px-6 py-8 md:h-full md:overflow-y-auto">

        {/* Logo + tagline */}
        <Link href="/dashboard" className="block flex-shrink-0">
          <Image src="/logo.svg" alt="communi*culture" width={140} height={26} priority />
          <span
            className="block text-[9px] text-black/50 uppercase tracking-[0.2em] leading-none mt-1"
            style={{ fontFamily: "var(--font-pixelify)" }}
          >
            a division of futurefarmers
          </span>
        </Link>

        {/* Nav */}
        <nav
          className="mt-3 flex flex-col gap-0.5 text-sm text-[#3F58D0] lowercase flex-shrink-0"
          style={{ fontFamily: "var(--font-pixelify)" }}
        >
          <Link href="/dashboard" className="hover:underline">continuums</Link>
          <Link href="/dashboard" className="hover:underline">view others</Link>
        </nav>

        {/* Flexible spacer pushes controls toward bottom on desktop */}
        <div className="hidden md:block flex-1 min-h-6" />

        {/* Variant selector — row of raised/flat asterisks */}
        <div className="mt-6 md:mt-0 min-h-[36px]">
          {selectedPart && selectedPartVariantCount > 1 && (
            <div className="flex items-end gap-2 flex-wrap">
              {Array.from({ length: selectedPartVariantCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setVariantIndex(selectedPart, i)}
                  className="transition-all duration-100"
                  style={{
                    transform: i === selectedVariantIdx ? "translateY(-5px)" : "none",
                    opacity: i === selectedVariantIdx ? 1 : 0.55,
                  }}
                  title={`variant ${i + 1}`}
                >
                  <AsteriskIcon color="#3F58D0" size={i === selectedVariantIdx ? 22 : 18} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color label */}
        {selectedPart && (
          <p className="text-[9px] text-black/30 lowercase mt-4 mb-2 tracking-widest">
            {SKIN_PARTS.includes(selectedPart) ? "skin" : `${selectedPart} color`}
          </p>
        )}

        {/* Color palette — 18 colors, 3×6 grid */}
        <div className="grid grid-cols-6 gap-y-1.5 gap-x-1">
          {COLOR_PALETTE.map((col) => {
            const isActive = col === activeColor;
            return (
              <button
                key={col}
                onClick={() => handleColorSelect(col)}
                className="transition-transform hover:scale-110"
                style={{ transform: isActive ? "scale(1.25)" : undefined }}
                title={col}
              >
                <AsteriskIcon color={col} size={isActive ? 26 : 21} />
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-4 text-xs text-[#3F58D0] lowercase flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="hover:text-black transition-colors disabled:opacity-40"
          >
            {saving ? "saving…" : "submit"}
          </button>
          <button onClick={handleReset} className="hover:text-black transition-colors">
            reset
          </button>
          <button onClick={handleRandomize} className="hover:text-black transition-colors">
            random
          </button>
        </div>
      </div>

      {/* ── Right column: 3D avatar with floating labels ── */}
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
