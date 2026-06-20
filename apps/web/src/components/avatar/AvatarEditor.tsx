"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AvatarRenderer } from "./AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PillButton } from "@/components/ui/PillButton";

// ─── scale helpers ─────────────────────────────────────────────────────────────
const H = (px: number) => `${((px / 844) * 100).toFixed(3)}svh`;  // mobile: scale by height

// ─── editor canvas size — ResizeObserver measures the actual rendered div ─────
const EDITOR_MAX_H = 560;
const EDITOR_ASPECT = 500 / 560;
const EDITOR_BASE_ZOOM = 143;
// 92px = sticky header height (16px top padding + 60px avatar head + 16px bottom padding)
const EDITOR_HEADER_H = 92;

function useEditorCanvasSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(EDITOR_MAX_H);
  const [zoom, setZoom] = useState(EDITOR_BASE_ZOOM);
  const [width, setWidth] = useState(Math.round(EDITOR_MAX_H * EDITOR_ASPECT));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const h = Math.max(300, Math.min(EDITOR_MAX_H, el.clientHeight || EDITOR_MAX_H));
      setHeight(h);
      setZoom(Math.round(EDITOR_BASE_ZOOM * h / EDITOR_MAX_H));
      setWidth(Math.round(h * EDITOR_ASPECT));
    };
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    window.addEventListener("resize", measure);
    return () => { obs.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return { ref, zoom, width, height };
}

// ─── 18-color palette — ordered by row ────────────────────────────────────────
export const COLOR_PALETTE: string[] = [
  "#69472F", "#90994F", "#E2F161", "#F7D45D", "#917143", "#F3BD87",
  "#6CAE8C", "#659AC7", "#6EBBD9", "#3F58D0", "#93559C", "#E96475",
  "#EA6BA8", "#EDA5CF", "#EE9181", "#A7A6A4", "#191A1C", "#F5F3F2",
];

export const SKIN_TONES: string[] = [
  "#F5F3F2", "#F3BD87", "#EE9181", "#917143", "#917143", "#69472F",
];

export const SKIN_PARTS: AvatarPart[] = ["head", "neck", "arms", "legs"];
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
const PROLETARIAN = "Inter, sans-serif";

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
  rowGap,
  onSelect,
}: {
  asteriskSize: string;
  rowGap: string;
  onSelect: (col: string) => void;
}) {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{ position: "relative", display: "flex", justifyContent: "space-between", marginBottom: row < 2 ? rowGap : 0 }}
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
  autoSpin?: boolean;
  onSave: (colors: Record<AvatarPart, string>, variants: Record<AvatarPart, number>) => Promise<void>;
  onChange?: (colors: Record<AvatarPart, string>, variants: Record<AvatarPart, number>) => void;
}

// ─── component ────────────────────────────────────────────────────────────────

export function AvatarEditor({ library, initialColors, initialVariants, autoSpin, onSave, onChange }: AvatarEditorProps) {
  const openColors   = useRef(initialColors  ?? DEFAULT_COLORS);
  const openVariants = useRef(initialVariants ?? DEFAULT_VARIANTS);

  const [colors,      setColors]      = useState<Record<AvatarPart, string>>(openColors.current);
  const [variants,    setVariants]    = useState<Record<AvatarPart, number>>(openVariants.current);
  const [selectedPart, setSelectedPart] = useState<AvatarPart | null>("hair");
  const [, setHistory] = useState<HistoryEntry[]>([]);
  // Freeze at mount — prop may change to false after first spin frame
  const [isSpinning] = useState(() => autoSpin ?? false);
  const isMobile = useIsMobile(1024);

  const isDirtyRef  = useRef(false);
  const onSaveRef   = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const colorsRef   = useRef(colors);
  const variantsRef = useRef(variants);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { colorsRef.current = colors; }, [colors]);
  useEffect(() => { variantsRef.current = variants; }, [variants]);

  // ─── auto-save (debounced) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirtyRef.current) return;
    const timer = setTimeout(() => { onSaveRef.current(colors, variants); }, 1200);
    return () => clearTimeout(timer);
  }, [colors, variants]);

  // ─── notify parent of every change (for Zustand caching) ───────────────────
  useEffect(() => {
    if (!isDirtyRef.current) return;
    onChangeRef.current?.(colors, variants);
  }, [colors, variants]);

  // ─── flush save on unmount so navigating away never loses changes ───────────
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        onSaveRef.current(colorsRef.current, variantsRef.current);
      }
    };
  }, []);

  // ─── auto-spin on first visit (no saved avatar) ─────────────────────────────
  useEffect(() => {
    if (!autoSpin) return;
    const rand = () => COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    const randV = (part: AvatarPart) => Math.floor(Math.random() * (library[part]?.length ?? 1));
    let count = 0;
    const spin = () => {
      const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
      isDirtyRef.current = true;
      setColors(Object.fromEntries(AVATAR_PARTS.map((p) => [p, SKIN_PARTS.includes(p) ? skin : rand()])) as Record<AvatarPart, string>);
      setVariants(Object.fromEntries(AVATAR_PARTS.map((p) => [p, randV(p)])) as Record<AvatarPart, number>);
      if (++count < 5) setTimeout(spin, 250);
    };
    spin();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const { ref: canvasContainerRef, zoom: canvasZoom, width: canvasW, height: canvasH } = useEditorCanvasSize();

  const avatarRenderer = (
    <AvatarRenderer
      library={library}
      variantIndices={variants}
      colors={colors}
      selectedPart={selectedPart}
      onPartClick={handlePartClick}
      showOutline={true}
      showLabels={true}
      spinning={isSpinning}
    />
  );

  const desktopAvatarRenderer = (
    <AvatarRenderer
      library={library}
      variantIndices={variants}
      colors={colors}
      selectedPart={selectedPart}
      onPartClick={handlePartClick}
      showOutline={true}
      showLabels={true}
      spinning={isSpinning}
      fixedZoom={canvasZoom}
    />
  );

  // ─── mobile layout — height-scaled, no scroll ─────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ width: "100vw", flex: 1, minHeight: 0, background: "white", display: "flex", flexDirection: "column", overflow: "hidden", userSelect: "none" }}>

        {/* Variant selector — always reserves 2-row height to prevent layout jump */}
        <div style={{
          flexShrink: 0, display: "flex", flexWrap: "wrap",
          justifyContent: "center", alignContent: "flex-start",
          padding: `${H(14)} ${H(16)} ${H(4)}`, gap: H(9),
          minHeight: H(37),
        }}>
          {selectedPart && selectedPartVariantCount > 1 && Array.from({ length: selectedPartVariantCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setVariantIndex(selectedPart, i)}
              className="flex-shrink-0 transition-all duration-100"
              style={{ transform: i === selectedVariantIdx ? "translateY(-3px)" : "none" }}
            >
              <AsteriskIcon color={LOGO_BLUE} size={H(10)} />
            </button>
          ))}
        </div>

        {/* 3D canvas — capped at 60svh so palette+buttons always have room */}
        <div style={{ flex: 1, minHeight: 0, maxHeight: "60svh", position: "relative" }}>
          {avatarRenderer}
        </div>

        {/* Color palette — wider rows */}
        <div style={{ flexShrink: 0, padding: `${H(6)} ${H(28)} ${H(10)}` }}>
          <PaletteRows
            asteriskSize={H(22.5)}
            rowGap={H(14)}
            onSelect={handleColorSelect}
          />
        </div>

        {/* Reset / Random */}
        <div style={{
          flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: H(28),
          padding: `${H(8)} 0 ${H(26)}`,
        }}>
          <button
            onClick={handleReset}
            style={{
              fontFamily: PROLETARIAN, fontSize: H(14), color: LOGO_BLUE,
              background: "none", border: "none", cursor: "pointer",
              textDecoration: "underline", padding: 0,
            }}
          >
            Reset
          </button>
          <PillButton onClick={handleRandomize} variant="secondary" label="Random" fontSize={H(14)} style={{ paddingTop: 6, paddingBottom: 6, paddingLeft: 16, paddingRight: 16 }} />
        </div>
      </div>
    );
  }

  // ─── desktop layout ─────────────────────────────────────────────────────────
  // Height is driven by CSS (100svh minus header) so the page never overflows.
  // ResizeObserver on the canvas div feeds back the actual height → correct zoom.
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      height: `calc(100svh - ${EDITOR_HEADER_H}px)`,
      boxSizing: "border-box",
      gap: "clamp(32px, 5vw, 80px)",
      padding: "clamp(24px, 4vh, 40px) clamp(16px, 4vw, 48px)",
      userSelect: "none",
    }}>

      {/* Left: part name, variant picker, palette — height matches canvas so bottom never exceeds avatar bottom */}
      <div style={{
        height: canvasH,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        flexShrink: 0,
        width: "clamp(200px, 25vw, 320px)",
        paddingBottom: "clamp(24px, 3vh, 40px)",
      }}>
        {/* Current part name */}
        <p style={{ fontFamily: PROLETARIAN, fontSize: 22, fontWeight: 500, color: "#1a1a1a", margin: "0 0 14px" }}>
          {selectedPart ?? ""}
        </p>

        {/* Variant selector — smaller than palette, left-aligned */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "clamp(6px, 0.8vw, 10px)", minHeight: 18, marginBottom: 64 }}>
          {selectedPart && selectedPartVariantCount > 1 && Array.from({ length: selectedPartVariantCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setVariantIndex(selectedPart, i)}
              className="flex-shrink-0 transition-all duration-100"
              style={{ transform: i === selectedVariantIdx ? "translateY(-3px)" : "none" }}
            >
              <AsteriskIcon color={LOGO_BLUE} size="clamp(12px, 1.2vw, 16px)" />
            </button>
          ))}
        </div>

        {/* Color palette — 15% larger than before, space-between fills row width */}
        <PaletteRows
          asteriskSize="clamp(21px, 2.1vw, 28px)"
          rowGap="clamp(18px, 2vw, 28px)"
          onSelect={handleColorSelect}
        />
      </div>

      {/* Right: avatar canvas (flex: 1 within column) + buttons pinned below */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "clamp(24px, 4vh, 40px)" }}>
        <div
          ref={canvasContainerRef}
          style={{ flex: 1, maxHeight: EDITOR_MAX_H, minHeight: 300, width: canvasW, overflow: "visible" }}
        >
          {desktopAvatarRenderer}
        </div>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 20, marginTop: 20 }}>
          <button
            onClick={handleReset}
            style={{
              fontFamily: PROLETARIAN, fontSize: 16, fontWeight: 500, color: LOGO_BLUE,
              background: "none", border: "none", cursor: "pointer",
              textDecoration: "underline", padding: 0,
            }}
          >
            Reset
          </button>
          <PillButton onClick={handleRandomize} variant="secondary" label="Random" fontSize="16px" />
        </div>
      </div>
    </div>
  );
}
