"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { AvatarRenderer } from "./AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";

// ─── vw scale helper (reference width: 1440px) ────────────────────────────────
const S = (px: number) => `${((px / 1440) * 100).toFixed(3)}vw`;

// ─── 18-color palette — ordered by row ────────────────────────────────────────
export const COLOR_PALETTE: string[] = [
  // row 1: greens, yellows, earth tones
  "#608E76", "#90994F", "#E2F161", "#F7D45D", "#917143", "#F3BD87",
  // row 2: teals, blues, purple, coral
  "#6CAE8C", "#659AC7", "#6EBBD9", "#3F58D0", "#93559C", "#E96475",
  // row 3: pinks, neutrals
  "#EA6BA8", "#EDA5CF", "#EE9181", "#A7A6A4", "#191A1C", "#F5F3F2",
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
const PROLETARIAN = "Proletarian, sans-serif";
const PIXELIFY = "var(--font-pixelify)";

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
      <rect x="24.2249" y="4.58984" width="5.55007" height="27.9725" transform="rotate(60 24.2249 4.58984)" fill={color} />
      <rect x="27" y="18.5762" width="5.55007" height="27.9725" transform="rotate(120 27 18.5762)" fill={color} />
    </svg>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────

type HistoryEntry = { colors: Record<AvatarPart, string>; variants: Record<AvatarPart, number> };

interface AvatarEditorProps {
  library: AvatarVariantLibrary;
  initialColors?: Record<AvatarPart, string>;
  initialVariants?: Record<AvatarPart, number>;
  onSave: (colors: Record<AvatarPart, string>, variants: Record<AvatarPart, number>) => Promise<void>;
}

// ─── component ────────────────────────────────────────────────────────────────

export function AvatarEditor({ library, initialColors, initialVariants, onSave }: AvatarEditorProps) {
  // Capture the state as it was when the page opened (for reset)
  const openColors  = useRef(initialColors  ?? DEFAULT_COLORS);
  const openVariants = useRef(initialVariants ?? DEFAULT_VARIANTS);

  const [colors,   setColors]   = useState<Record<AvatarPart, string>>(openColors.current);
  const [variants, setVariants] = useState<Record<AvatarPart, number>>(openVariants.current);
  const [selectedPart, setSelectedPart] = useState<AvatarPart | null>("hair");
  const [, setHistory] = useState<HistoryEntry[]>([]);

  const isDirtyRef = useRef(false);
  const onSaveRef  = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // ─── auto-save (debounced 1.2 s) ──────────────────────────────────────────
  useEffect(() => {
    if (!isDirtyRef.current) return;
    const timer = setTimeout(() => { onSaveRef.current(colors, variants); }, 1200);
    return () => clearTimeout(timer);
  }, [colors, variants]);

  // ─── undo ─────────────────────────────────────────────────────────────────
  const pushToHistory = useCallback((c: Record<AvatarPart, string>, v: Record<AvatarPart, number>) => {
    setHistory(prev => [...prev.slice(-29), { colors: c, variants: v }]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setColors(last.colors);
      setVariants(last.variants);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo]);

  // ─── actions ──────────────────────────────────────────────────────────────
  const cycleVariant = useCallback((part: AvatarPart, dir: 1 | -1) => {
    const count = library[part]?.length ?? 1;
    pushToHistory(colors, variants);
    isDirtyRef.current = true;
    setVariants(prev => ({ ...prev, [part]: ((prev[part] ?? 0) + dir + count) % count }));
  }, [library, colors, variants, pushToHistory]);

  const setVariantIndex = useCallback((part: AvatarPart, idx: number) => {
    pushToHistory(colors, variants);
    isDirtyRef.current = true;
    setVariants(prev => ({ ...prev, [part]: idx }));
  }, [colors, variants, pushToHistory]);

  const handlePartClick = useCallback((part: AvatarPart) => {
    if (selectedPart === part) {
      cycleVariant(part, 1);
    } else {
      setSelectedPart(part);
    }
  }, [selectedPart, cycleVariant]);

  const handleColorSelect = useCallback((color: string) => {
    if (!selectedPart) return;
    pushToHistory(colors, variants);
    isDirtyRef.current = true;
    if (SKIN_PARTS.includes(selectedPart)) {
      setColors(prev => ({ ...prev, ...Object.fromEntries(SKIN_PARTS.map(p => [p, color])) }));
    } else {
      setColors(prev => ({ ...prev, [selectedPart]: color }));
    }
  }, [selectedPart, colors, variants, pushToHistory]);

  const handleReset = useCallback(() => {
    pushToHistory(colors, variants);
    isDirtyRef.current = true;
    setColors(openColors.current);
    setVariants(openVariants.current);
    setSelectedPart("hair");
  }, [colors, variants, pushToHistory]);

  const handleRandomize = useCallback(() => {
    const rand = () => COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    const randVariant = (part: AvatarPart) => Math.floor(Math.random() * (library[part]?.length ?? 1));
    const skinColor = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const skinEntries  = Object.fromEntries(SKIN_PARTS.map(p => [p, skinColor]));
    const nonSkinEntries = Object.fromEntries(
      AVATAR_PARTS.filter(p => !SKIN_PARTS.includes(p)).map(p => [p, rand()])
    );
    pushToHistory(colors, variants);
    isDirtyRef.current = true;
    setColors({ ...nonSkinEntries, ...skinEntries } as Record<AvatarPart, string>);
    setVariants(Object.fromEntries(AVATAR_PARTS.map(p => [p, randVariant(p)])) as Record<AvatarPart, number>);
  }, [library, colors, variants, pushToHistory]);

  const selectedPartVariantCount = selectedPart ? (library[selectedPart]?.length ?? 1) : 0;
  const selectedVariantIdx       = selectedPart ? (variants[selectedPart] ?? 0) : 0;

  return (
    <div className="relative overflow-hidden select-none" style={{ width: "100vw", height: "62.5vw" }}>

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

      {/* ── Logo + nav (top-left) ── */}
      <div
        className="absolute flex flex-col"
        style={{
          top: S(120),
          left: S(60),
          width: S(280),
          pointerEvents: "none",
        }}
      >
        <Link href="/dashboard" className="block overflow-visible" style={{ pointerEvents: "auto" }}>
          <Image
            src="/logo.svg"
            alt="communi*culture"
            width={200}
            height={37}
            style={{ width: S(260), height: "auto", marginLeft: S(80) }}
            priority
          />
          <span
            className="block text-black/40 uppercase leading-none"
            style={{
              fontFamily: PIXELIFY,
              fontSize: S(12),
              letterSpacing: "0.2em",
              whiteSpace: "nowrap",
              marginTop: S(0),
            }}
          >
            a division of futurefarmers
          </span>
        </Link>

        <nav
          className="flex flex-col lowercase"
          style={{
            marginTop: S(20),
            gap: S(3),
            fontFamily: PROLETARIAN,
            fontSize: S(24),
            color: LOGO_BLUE,
            pointerEvents: "auto",
            alignItems: "flex-end",
          }}
        >
          <Link href="/dashboard" className="hover:opacity-60 transition-opacity">continuums</Link>
          <Link href="/dashboard" className="hover:opacity-60 transition-opacity">view others</Link>
        </nav>
      </div>

      {/* ── Palette overlay (right-aligned column) ── */}
      <div
        className="absolute flex flex-col"
        style={{
          top: S(490),
          left: S(340),
          pointerEvents: "none",
          gap: S(10),
          alignItems: "flex-end",
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
                style={{ transform: i === selectedVariantIdx ? "translateY(-5px)" : "none" }}
                title={`variant ${i + 1}`}
              >
                <AsteriskIcon color={LOGO_BLUE} size={S(13)} />
              </button>
            ))}
          </div>
        )}

        {/* Color palette — 3 rows, line runs exactly behind each row */}
        <div style={{ pointerEvents: "auto", marginTop: S(30) }}>
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              style={{
                position: "relative",
                display: "flex",
                gap: S(20),
                marginBottom: row < 2 ? S(30) : 0,
              }}
            >
              {/* Line spans only the width of this row's asterisks */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  borderTop: "1.5px solid rgba(0,0,0,0.15)",
                  zIndex: 0,
                }}
              />
              {COLOR_PALETTE.slice(row * 6, row * 6 + 6).map((col) => {
                return (
                  <button
                    key={col}
                    onClick={() => handleColorSelect(col)}
                    className="flex-shrink-0 transition-transform"
                    style={{
                      position: "relative",
                      zIndex: 1,
                    }}
                    title={col}
                  >
                    <AsteriskIcon color={col} size={S(20)} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Reset / Random — under avatar ── */}
      <div
        className="absolute flex lowercase"
        style={{
          top: S(820),
          left: S(936),
          gap: S(28),
          fontSize: S(24),
          color: LOGO_BLUE,
          fontFamily: PROLETARIAN,
          pointerEvents: "auto",
        }}
      >
        <button onClick={handleReset}    className="hover:opacity-60 transition-opacity">reset</button>
        <button onClick={handleRandomize} className="hover:opacity-60 transition-opacity">random</button>
      </div>
    </div>
  );
}
