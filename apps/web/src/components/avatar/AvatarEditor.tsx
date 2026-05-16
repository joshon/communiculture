"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { AvatarRenderer } from "./AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { useIsMobile } from "@/hooks/useIsMobile";

// ─── scale helpers ─────────────────────────────────────────────────────────────
const S = (px: number) => `${((px / 1440) * 100).toFixed(3)}vw`; // desktop ref
const M = (px: number) => `${((px / 390) * 100).toFixed(3)}vw`;  // mobile ref

// ─── 18-color palette — ordered by row ────────────────────────────────────────
export const COLOR_PALETTE: string[] = [
  "#608E76", "#90994F", "#E2F161", "#F7D45D", "#917143", "#F3BD87",
  "#6CAE8C", "#659AC7", "#6EBBD9", "#3F58D0", "#93559C", "#E96475",
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

// ─── color palette rows (shared between mobile + desktop) ─────────────────────

function PaletteRows({
  asteriskSize,
  gap,
  rowGap,
  onSelect,
}: {
  asteriskSize: string;
  gap: string;
  rowGap: string;
  onSelect: (col: string) => void;
}) {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{ position: "relative", display: "flex", gap, marginBottom: row < 2 ? rowGap : 0 }}
        >
          <div style={{
            position: "absolute", top: "50%", left: 0, right: 0,
            borderTop: "1.5px solid rgba(0,0,0,0.15)", zIndex: 0,
          }} />
          {COLOR_PALETTE.slice(row * 6, row * 6 + 6).map((col) => (
            <button
              key={col}
              onClick={() => onSelect(col)}
              className="flex-shrink-0"
              style={{ position: "relative", zIndex: 1 }}
            >
              <AsteriskIcon color={col} size={asteriskSize} />
            </button>
          ))}
        </div>
      ))}
    </>
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
  const openColors   = useRef(initialColors  ?? DEFAULT_COLORS);
  const openVariants = useRef(initialVariants ?? DEFAULT_VARIANTS);

  const [colors,      setColors]      = useState<Record<AvatarPart, string>>(openColors.current);
  const [variants,    setVariants]    = useState<Record<AvatarPart, number>>(openVariants.current);
  const [selectedPart, setSelectedPart] = useState<AvatarPart | null>("hair");
  const [, setHistory] = useState<HistoryEntry[]>([]);
  const isMobile = useIsMobile();

  const isDirtyRef = useRef(false);
  const onSaveRef  = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // ─── auto-save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirtyRef.current) return;
    const timer = setTimeout(() => { onSaveRef.current(colors, variants); }, 1200);
    return () => clearTimeout(timer);
  }, [colors, variants]);

  // ─── undo ───────────────────────────────────────────────────────────────────
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

  // ─── actions ────────────────────────────────────────────────────────────────
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
    const skinEntries    = Object.fromEntries(SKIN_PARTS.map(p => [p, skinColor]));
    const nonSkinEntries = Object.fromEntries(AVATAR_PARTS.filter(p => !SKIN_PARTS.includes(p)).map(p => [p, rand()]));
    pushToHistory(colors, variants);
    isDirtyRef.current = true;
    setColors({ ...nonSkinEntries, ...skinEntries } as Record<AvatarPart, string>);
    setVariants(Object.fromEntries(AVATAR_PARTS.map(p => [p, randVariant(p)])) as Record<AvatarPart, number>);
  }, [library, colors, variants, pushToHistory]);

  const selectedPartVariantCount = selectedPart ? (library[selectedPart]?.length ?? 1) : 0;
  const selectedVariantIdx       = selectedPart ? (variants[selectedPart] ?? 0) : 0;

  const avatarRenderer = (
    <AvatarRenderer
      library={library}
      variantIndices={variants}
      colors={colors}
      selectedPart={selectedPart}
      onPartClick={handlePartClick}
      showOutline={true}
      showLabels={true}
    />
  );

  // ─── mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ width: "100vw", minHeight: "100svh", background: "white", display: "flex", flexDirection: "column", userSelect: "none" }}>

        {/* Header: logo + nav */}
        <div style={{ padding: `${M(24)} ${M(20)} ${M(12)}`, display: "flex", flexDirection: "column" }}>
          <Link href="/dashboard" style={{ display: "block" }}>
            <Image
              src="/logo.svg"
              alt="communi*culture"
              width={200}
              height={37}
              style={{ width: M(200), height: "auto" }}
              priority
            />
            <span style={{
              display: "block",
              fontFamily: PIXELIFY,
              fontSize: M(11),
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
              marginTop: M(2),
            }}>
              a division of futurefarmers
            </span>
          </Link>
          <nav style={{
            display: "flex", flexDirection: "column", alignItems: "flex-end",
            gap: M(2), marginTop: M(12),
            fontFamily: PROLETARIAN, fontSize: M(22), color: LOGO_BLUE,
          }}>
            <Link href="/dashboard" className="hover:opacity-60 transition-opacity">continuums</Link>
            <Link href="/dashboard" className="hover:opacity-60 transition-opacity">view others</Link>
          </nav>
        </div>

        {/* Variant selector */}
        {selectedPart && selectedPartVariantCount > 1 && (
          <div style={{
            display: "flex", justifyContent: "center", flexWrap: "wrap",
            gap: M(10), padding: `${M(8)} ${M(20)}`,
          }}>
            {Array.from({ length: selectedPartVariantCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setVariantIndex(selectedPart, i)}
                className="flex-shrink-0 transition-all duration-100"
                style={{ transform: i === selectedVariantIdx ? "translateY(-4px)" : "none" }}
              >
                <AsteriskIcon color={LOGO_BLUE} size={M(20)} />
              </button>
            ))}
          </div>
        )}

        {/* 3D canvas — square */}
        <div style={{ width: "100vw", height: "100vw", position: "relative", flexShrink: 0 }}>
          {avatarRenderer}
        </div>

        {/* Reset / Random */}
        <div style={{
          display: "flex", justifyContent: "center", gap: M(48),
          fontFamily: PROLETARIAN, fontSize: M(24), color: LOGO_BLUE,
          padding: `${M(20)} 0`,
        }}>
          <button onClick={handleReset}    className="hover:opacity-60 transition-opacity lowercase">reset</button>
          <button onClick={handleRandomize} className="hover:opacity-60 transition-opacity lowercase">random</button>
        </div>

        {/* Color palette */}
        <div style={{ padding: `0 ${M(20)} ${M(40)}`, display: "flex", flexDirection: "column", alignItems: "center", gap: M(30) }}>
          <PaletteRows
            asteriskSize={M(36)}
            gap={M(16)}
            rowGap={M(30)}
            onSelect={handleColorSelect}
          />
        </div>
      </div>
    );
  }

  // ─── desktop layout ─────────────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden select-none" style={{ width: "100vw", height: "62.5vw" }}>

      {/* Full-screen canvas */}
      <div className="absolute inset-0">
        {avatarRenderer}
      </div>

      {/* Logo + nav (top-left) */}
      <div
        className="absolute flex flex-col"
        style={{ top: S(120), left: S(60), width: S(280), pointerEvents: "none" }}
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
            style={{ fontFamily: PIXELIFY, fontSize: S(12), letterSpacing: "0.2em", whiteSpace: "nowrap", marginTop: S(0) }}
          >
            a division of futurefarmers
          </span>
        </Link>
        <nav
          className="flex flex-col lowercase"
          style={{
            marginTop: S(20), gap: S(3),
            fontFamily: PROLETARIAN, fontSize: S(28), color: LOGO_BLUE,
            pointerEvents: "auto", alignItems: "flex-end",
          }}
        >
          <Link href="/dashboard" className="hover:opacity-60 transition-opacity">continuums</Link>
          <Link href="/dashboard" className="hover:opacity-60 transition-opacity">view others</Link>
        </nav>
      </div>

      {/* Palette overlay */}
      <div
        className="absolute flex flex-col"
        style={{
          top: S(490), left: S(374), width: S(242),
          pointerEvents: "none", gap: S(11),
          alignItems: "flex-end", overflow: "visible",
        }}
      >
        {/* Variant selector */}
        {selectedPart && selectedPartVariantCount > 1 && (
          <div className="flex items-end" style={{ gap: S(9), pointerEvents: "auto", overflow: "visible" }}>
            {Array.from({ length: selectedPartVariantCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setVariantIndex(selectedPart, i)}
                className="flex-shrink-0 transition-all duration-100"
                style={{ transform: i === selectedVariantIdx ? "translateY(-5px)" : "none" }}
              >
                <AsteriskIcon color={LOGO_BLUE} size={S(14)} />
              </button>
            ))}
          </div>
        )}

        {/* Color palette rows */}
        <div style={{ pointerEvents: "auto", marginTop: S(33) }}>
          <PaletteRows
            asteriskSize={S(22)}
            gap={S(22)}
            rowGap={S(33)}
            onSelect={handleColorSelect}
          />
        </div>
      </div>

      {/* Reset / Random */}
      <div
        className="absolute flex lowercase"
        style={{
          top: S(720), left: S(1008), gap: S(28),
          fontSize: S(28), color: LOGO_BLUE,
          fontFamily: PROLETARIAN, pointerEvents: "auto",
        }}
      >
        <button onClick={handleReset}    className="hover:opacity-60 transition-opacity">reset</button>
        <button onClick={handleRandomize} className="hover:opacity-60 transition-opacity">random</button>
      </div>
    </div>
  );
}
