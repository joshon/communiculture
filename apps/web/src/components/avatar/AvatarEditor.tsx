"use client";

import { useState, useCallback } from "react";
import { AvatarRenderer } from "./AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";

// ─── color palette ─────────────────────────────────────────────────────────────
// 5 rows × 6 cols = 30 swatches, matching the original asterisk grid feel
export const COLOR_PALETTE: string[] = [
  // Row 0 — reds / oranges
  "#cc0000", "#cc3300", "#cc6600", "#cc9900", "#ccaa33", "#c8a46e",
  // Row 1 — yellows / greens
  "#aacc00", "#66cc00", "#33cc00", "#00cc33", "#00cc99", "#00cccc",
  // Row 2 — blues / purples
  "#0066cc", "#0033cc", "#3300cc", "#6600cc", "#aa00cc", "#cc0099",
  // Row 3 — pinks / skin
  "#cc0066", "#cc3366", "#f5a0a0", "#f5c5a3", "#f5dfc0", "#c9a882",
  // Row 4 — earth / neutrals
  "#9e7a5f", "#6b4c3b", "#3d2b1f", "#999999", "#555555", "#000000",
];

// Parts that share the same skin tone — selecting a color for any one updates all
const SKIN_PARTS: AvatarPart[] = ["head", "neck", "arms", "legs"];

// Realistic skin tones used for randomization (light → dark)
const SKIN_TONES: string[] = [
  "#f5dfc0", "#f5c5a3", "#e8b88a", "#d4956a",
  "#c9a882", "#b07850", "#9e7a5f", "#8d5524",
  "#7d4427", "#6b4c3b", "#5c3317", "#4a2912",
];

// ─── avatar part positions (relative to the bordered avatar box) ───────────────
// Positions place label text anchored around the box using absolute positioning.
// [top%, left%, anchor]
const PART_LABELS: {
  part: AvatarPart;
  top: string;
  left?: string;
  right?: string;
  textAlign?: "left" | "right";
}[] = [
  { part: "hair",  top: "-7%",  left: "50%",   textAlign: "left" },
  { part: "head",  top: "8%",   right: "-70px", textAlign: "left" },
  { part: "face",  top: "22%",  left: "-64px",  textAlign: "right" },
  { part: "arms",  top: "38%",  left: "-64px",  textAlign: "right" },
  { part: "body",  top: "38%",  right: "-64px", textAlign: "left" },
  { part: "pants", top: "58%",  left: "-64px",  textAlign: "right" },
  { part: "legs",  top: "65%",  right: "-64px", textAlign: "left" },
  { part: "shoes", top: "82%",  right: "-64px", textAlign: "left" },
];

const DEFAULT_SKIN = "#f5c5a3";

const DEFAULT_COLORS: Record<AvatarPart, string> = {
  hair:  "#3d2b1f",
  head:  DEFAULT_SKIN,
  face:  "#1a1a1a",
  neck:  DEFAULT_SKIN,
  arms:  DEFAULT_SKIN,
  body:  "#4a9e6b",
  pants: "#3b6bcc",
  legs:  DEFAULT_SKIN,
  shoes: "#555555",
};

const DEFAULT_VARIANTS = Object.fromEntries(
  AVATAR_PARTS.map((p) => [p, 0])
) as Record<AvatarPart, number>;

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

  const handlePartSelect = useCallback((part: AvatarPart) => {
    setSelectedPart((prev) => (prev === part ? null : part));
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    if (!selectedPart) return;
    if (SKIN_PARTS.includes(selectedPart)) {
      // Changing any skin part updates all skin parts together
      setColors((prev) => ({
        ...prev,
        ...Object.fromEntries(SKIN_PARTS.map((p) => [p, color])),
      }));
    } else {
      setColors((prev) => ({ ...prev, [selectedPart]: color }));
    }
  }, [selectedPart]);

  const cycleVariant = useCallback((part: AvatarPart, dir: 1 | -1) => {
    const count = library[part]?.length ?? 1;
    setVariants((prev) => ({
      ...prev,
      [part]: ((prev[part] ?? 0) + dir + count) % count,
    }));
  }, [library]);

  const handleReset = useCallback(() => {
    setColors(DEFAULT_COLORS);
    setVariants(DEFAULT_VARIANTS);
    setSelectedPart("hair");
  }, []);

  const handleRandomize = useCallback(() => {
    const rand = () => COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    const randVariant = (part: AvatarPart) => {
      const count = library[part]?.length ?? 1;
      return Math.floor(Math.random() * count);
    };
    // Pick one skin tone and apply it to all skin parts
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
  const selectedVariantLabel = selectedPart
    ? library[selectedPart]?.[variants[selectedPart] ?? 0]?.label ?? ""
    : "";

  return (
    <div className="flex h-full min-h-[600px] bg-white select-none font-mono">

      {/* ── Left: color palette + variant selector ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">

        {selectedPart ? (
          <>
            {/* Variant cycler — only shown when part has multiple variants */}
            {selectedPartVariantCount > 1 && (
              <div className="flex items-center gap-3 text-[#0033cc] lowercase text-sm">
                <button
                  onClick={() => cycleVariant(selectedPart, -1)}
                  className="hover:text-black transition-colors px-1"
                >
                  ←
                </button>
                <span className="w-32 text-center text-xs text-black/60">
                  {selectedVariantLabel}
                </span>
                <button
                  onClick={() => cycleVariant(selectedPart, 1)}
                  className="hover:text-black transition-colors px-1"
                >
                  →
                </button>
              </div>
            )}

            {/* Color asterisk grid */}
            <div>
              <p className="text-[10px] text-black/30 lowercase mb-3 text-center tracking-widest">
                {SKIN_PARTS.includes(selectedPart) ? "skin color (head · neck · arms · legs)" : `${selectedPart} color`}
              </p>
              <div className="grid grid-cols-6 gap-y-1 gap-x-2">
                {COLOR_PALETTE.map((col) => (
                  <button
                    key={col}
                    onClick={() => handleColorSelect(col)}
                    className="text-xl leading-none transition-transform hover:scale-125"
                    style={{
                      color: col,
                      textShadow: colors[selectedPart] === col
                        ? `0 0 0 2px #0033cc, 0 0 0 3px #0033cc`
                        : "none",
                      fontWeight: colors[selectedPart] === col ? 900 : 400,
                      filter: colors[selectedPart] === col
                        ? "drop-shadow(0 0 3px #0033cc)"
                        : "none",
                    }}
                    title={col}
                  >
                    *
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-black/30 lowercase text-center">
            click a part to edit
          </p>
        )}
      </div>

      {/* ── Right: Avatar + labels ── */}
      {/* pr-24 ensures the right-side absolute labels (–70px offset) are never clipped */}
      <div className="shrink-0 flex items-center justify-center pr-24 pl-8">
        <div className="relative">

          {/* Part labels — positioned around the avatar box */}
          {PART_LABELS.map(({ part, top, left, right, textAlign }) => (
            <button
              key={part}
              onClick={() => handlePartSelect(part)}
              style={{
                position: "absolute",
                top,
                left,
                right,
                zIndex: 10,
                textAlign,
                whiteSpace: "nowrap",
              }}
              className={`text-xs lowercase transition-colors ${
                selectedPart === part
                  ? "text-[#0033cc] underline"
                  : "text-[#0033cc] hover:text-black"
              }`}
            >
              {selectedPart === part ? <s>{part}</s> : part}
            </button>
          ))}

          {/* Submit / Reset — right side of avatar box */}
          <div
            style={{
              position: "absolute",
              right: "-70px",
              top: "50%",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              transform: "translateY(-50%)",
              zIndex: 10,
            }}
          >
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="text-xs lowercase text-[#0033cc] hover:text-black transition-colors disabled:opacity-40"
            >
              {saving ? "saving…" : "submit"}
            </button>
            <button
              onClick={handleReset}
              className="text-xs lowercase text-[#0033cc] hover:text-black transition-colors"
            >
              reset
            </button>
          </div>

          {/* Random — below avatar box */}
          <div
            style={{
              position: "absolute",
              bottom: "-28px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
            }}
          >
            <button
              onClick={handleRandomize}
              className="text-xs lowercase text-[#0033cc] hover:text-black transition-colors"
            >
              random
            </button>
          </div>

          {/* Avatar canvas */}
          <div
            style={{
              width: 280,
              height: 460,
              background: "#ffffff",
              overflow: "hidden",
            }}
          >
            <AvatarRenderer
              library={library}
              variantIndices={variants}
              colors={colors}
              selectedPart={selectedPart}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
