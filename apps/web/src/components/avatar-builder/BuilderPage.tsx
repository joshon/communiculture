"use client";

import { useEffect, useRef, useState } from "react";
import { BuilderCanvas } from "./BuilderCanvas";
import { PartPanel } from "./PartPanel";
import { ElementPanel } from "./ElementPanel";
import { useBuilderStore } from "./builderStore";
import type { AvatarPart, AvatarVariantLibrary } from "./types";

interface SaveFile {
  library: AvatarVariantLibrary;
  previewColors: Record<AvatarPart, string>;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(data: SaveFile, onStatus: (s: SaveStatus) => void) {
  if (saveTimer) clearTimeout(saveTimer);
  onStatus('saving');
  saveTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/dev/avatar-library', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      onStatus(res.ok ? 'saved' : 'error');
    } catch {
      onStatus('error');
    }
  }, 600);
}

export function BuilderPage() {
  const { exportJSON, loadFromJSON, resetToSeed, hydrateLibrary, hydrateColors } = useBuilderStore();
  const [notice, setNotice] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const hydratedRef = useRef(false);

  // Load saved state on mount, then auto-save on every change
  useEffect(() => {
    fetch('/api/dev/avatar-library')
      .then((r) => r.json())
      .then((data: SaveFile | null) => {
        if (data?.library) hydrateLibrary(data.library);
        if (data?.previewColors) hydrateColors(data.previewColors);
      })
      .catch(() => {/* no saved file, use seed defaults */})
      .finally(() => { hydratedRef.current = true; });

    const unsub = useBuilderStore.subscribe((state) => {
      if (!hydratedRef.current) return;
      scheduleSave({ library: state.library, previewColors: state.previewColors }, setSaveStatus);
    });

    return () => {
      unsub();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [hydrateLibrary, hydrateColors]);

  const handleExport = () => {
    const json = exportJSON();
    navigator.clipboard.writeText(json).then(() => {
      setNotice("copied to clipboard!");
      setTimeout(() => setNotice(""), 2500);
    });
  };

  const handleImport = () => {
    const json = prompt("Paste JSON:");
    if (json) loadFromJSON(json);
  };

  const handleReset = () => {
    if (confirm("Reset all variants to seed data?")) resetToSeed();
  };

  return (
    <div className="flex flex-col h-screen bg-[#111] text-white select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#0a0a0a] border-b border-white/10 shrink-0">
        <span className="text-[#0033cc] font-bold lowercase text-sm">
          communi<span className="text-white">*</span>culture
        </span>
        <span className="text-white/20 text-sm">|</span>
        <span className="text-white/50 text-xs lowercase">avatar builder</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Auto-save status */}
          {saveStatus === 'saving' && (
            <span className="text-white/30 text-xs lowercase">saving…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-500/70 text-xs lowercase">saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-400/80 text-xs lowercase">save failed</span>
          )}
          {notice && (
            <span className="text-green-400 text-xs lowercase animate-pulse">{notice}</span>
          )}
          <ToolbarBtn onClick={handleExport} accent>
            ⬆ export JSON
          </ToolbarBtn>
          <ToolbarBtn onClick={handleImport}>⬇ import JSON</ToolbarBtn>
          <ToolbarBtn onClick={handleReset} danger>
            ↺ reset to seed
          </ToolbarBtn>
        </div>
      </div>

      {/* Main layout — panels never shrink; canvas takes remaining space; scrolls horizontally if viewport too narrow */}
      <div className="flex flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <div className="shrink-0 h-full">
          <PartPanel />
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative min-w-[240px]">
          <BuilderCanvas />
          <HelpOverlay />
        </div>

        <div className="shrink-0 h-full">
          <ElementPanel />
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  accent,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs lowercase transition-colors ${
        accent
          ? "bg-[#0033cc] hover:bg-blue-700 text-white"
          : danger
          ? "bg-red-900/50 hover:bg-red-900 text-red-300"
          : "bg-white/10 hover:bg-white/20 text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function HelpOverlay() {
  return (
    <div className="absolute bottom-3 left-3 text-[10px] text-white/30 space-y-0.5 pointer-events-none">
      <p>click mesh → select element</p>
      <p>orbit: left drag · pan: right drag · zoom: scroll</p>
      <p>yellow glow = selected part · orange glow = selected element</p>
    </div>
  );
}
