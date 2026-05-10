"use client";

import { useState, useEffect, useCallback } from "react";
import { useBuilderStore } from "./builderStore";
import type { AlignOp } from "./builderStore";
import type { MeshElement, MeshType } from "./types";
import { isSymmetric, isCentered } from "./types";
import { STICKER_NAMES } from "@/lib/stickerTextures";

export function ElementPanel() {
  const {
    library,
    selectedPart,
    editingVariantIndex,
    selectedElementId,
    selectedElementIds,
    snapEnabled,
    past,
    clipboard,
    setSelectedElementId,
    toggleSelectedElementId,
    setSnapEnabled,
    alignSelectedElements,
    undo,
    addElement,
    deleteElement,
    updateElement,
    duplicateSelectedElements,
    deleteSelectedElements,
    copySelectedElements,
    pasteElements,
    mirrorElementsX,
  } = useBuilderStore();

  const [addPair, setAddPair] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedElementIds.length > 0) {
          duplicateSelectedElements(selectedPart, editingVariantIndex, selectedElementIds);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          copySelectedElements();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        const { clipboard } = useBuilderStore.getState();
        if (clipboard.length > 0) {
          e.preventDefault();
          pasteElements();
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          deleteSelectedElements();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, duplicateSelectedElements, deleteSelectedElements, copySelectedElements, pasteElements, selectedPart, editingVariantIndex, selectedElementIds]);

  const variant = library[selectedPart]?.[editingVariantIndex];
  if (!variant) return null;

  const symmetric = isSymmetric(selectedPart);
  const centered = isCentered(selectedPart);
  const willAddPair = symmetric || addPair;

  // Symmetric: show only even-indexed (primaries).
  // Manual pairs: show only the first of each pair (lower index).
  const displayElements = symmetric
    ? variant.elements.filter((_, i) => i % 2 === 0)
    : variant.elements.filter((el, i) => {
        if (!el.pairedWith) return true;
        const pairedIdx = variant.elements.findIndex((e) => e.id === el.pairedWith);
        return pairedIdx === -1 || i < pairedIdx;
      });

  const selectedEl = variant.elements.find((el) => el.id === selectedElementId) ?? null;
  const multiSelect = selectedElementIds.length >= 2;

  return (
    <div className="w-72 flex flex-col bg-[#1a1a1a] text-white text-xs overflow-hidden h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-white/40 uppercase tracking-widest text-[10px]">
            {selectedPart} / {variant.label}
          </p>
          <button
            onClick={undo}
            disabled={past.length === 0}
            title="Undo (⌘Z)"
            className={`px-2 py-0.5 text-[9px] transition-colors ${
              past.length > 0
                ? "bg-white/10 hover:bg-white/20 text-white/60 cursor-pointer"
                : "bg-white/5 text-white/20 cursor-default"
            }`}
          >
            ↩ undo
          </button>
        </div>
        {symmetric && (
          <p className="text-orange-400/60 text-[9px] mt-0.5">↔ left+right — editing left, right mirrors automatically</p>
        )}
        {centered && (
          <p className="text-blue-400/60 text-[9px] mt-0.5">⊕ centered — default x=0, use pair to add bilateral elements</p>
        )}
      </div>

      {/* Element list */}
      <div className="p-2 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-white/40 uppercase tracking-widest text-[10px]">
            elements ({displayElements.length}{symmetric ? " pairs" : ""})
          </p>
          <p className="text-white/25 text-[9px]">shift+click multi-select</p>
        </div>
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={() => { if (selectedElementIds.length > 0) copySelectedElements(); }}
            disabled={selectedElementIds.length === 0}
            title="copy selected (⌘C)"
            className={`px-2 py-0.5 text-[9px] transition-colors ${
              selectedElementIds.length > 0
                ? "bg-white/10 hover:bg-white/20 text-white/60 cursor-pointer"
                : "bg-white/5 text-white/20 cursor-default"
            }`}
          >
            ⌘C copy
          </button>
          <button
            onClick={() => { if (clipboard.length > 0) pasteElements(); }}
            disabled={clipboard.length === 0}
            title="paste (⌘V)"
            className={`px-2 py-0.5 text-[9px] transition-colors ${
              clipboard.length > 0
                ? "bg-green-700/50 hover:bg-green-700/80 text-green-300 cursor-pointer"
                : "bg-white/5 text-white/20 cursor-default"
            }`}
          >
            ⌘V paste{clipboard.length > 0 ? ` (${clipboard.length})` : ""}
          </button>
        </div>
        {displayElements.length === 0 && (
          <p className="text-white/20 italic py-2">no elements — add one below</p>
        )}
        <div className="space-y-0.5">
          {displayElements.map((el, i) => {
            const isPrimary = el.id === selectedElementId;
            const isInMulti = selectedElementIds.includes(el.id);
            return (
              <div
                key={el.id}
                onClick={(e) => {
                  if (e.shiftKey) {
                    toggleSelectedElementId(el.id);
                  } else {
                    setSelectedElementId(el.id === selectedElementId ? null : el.id);
                  }
                }}
                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors ${
                  isPrimary
                    ? "bg-orange-600/60"
                    : isInMulti
                    ? "bg-blue-600/40"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-white/30 w-4">{i + 1}</span>
                <TypeBadge type={el.type} />
                <span className="flex-1 text-white/70 font-mono text-[10px]">
                  {symmetric
                    ? `y=${el.position[1].toFixed(2)} z=${el.position[2].toFixed(2)}`
                    : `[${el.position.map((v) => v.toFixed(2)).join(", ")}]`}
                </span>
                {(symmetric || el.pairedWith) && <span className="text-orange-400/40 text-[9px]">↔</span>}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const ids = selectedElementIds.includes(el.id) ? selectedElementIds : [el.id];
                    duplicateSelectedElements(selectedPart, editingVariantIndex, ids);
                  }}
                  title="duplicate (⌘D)"
                  className="text-blue-400/50 hover:text-blue-400 px-1"
                >
                  ⧉
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteElement(selectedPart, editingVariantIndex, el.id);
                  }}
                  className="text-red-400/60 hover:text-red-400 px-1"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-select alignment */}
      {multiSelect && (
        <div className="p-2 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/40 uppercase tracking-widest text-[10px]">
              align ({selectedElementIds.length} selected)
            </p>
            <button
              onClick={() => duplicateSelectedElements(selectedPart, editingVariantIndex, selectedElementIds)}
              className="px-2 py-0.5 text-[9px] bg-blue-600/40 hover:bg-blue-600/70 text-blue-200 transition-colors"
              title="duplicate selected (⌘D)"
            >
              ⧉ duplicate
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {([
              ["left",    "⬅ left"],
              ["centerX", "⊕ ctr X"],
              ["right",   "➡ right"],
              ["bottom",  "⬇ bot"],
              ["middleY", "⊕ ctr Y"],
              ["top",     "⬆ top"],
            ] as [AlignOp, string][]).map(([op, label]) => (
              <button
                key={op}
                onClick={() => alignSelectedElements(op)}
                className="bg-white/10 hover:bg-white/20 py-1 text-[9px] text-white/70"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected element editor */}
      <div className="flex-1 overflow-y-auto p-2">
        {selectedEl ? (
          <ElementEditor
            element={selectedEl}
            symmetric={symmetric}
            centered={centered}
            onChange={(patch) =>
              updateElement(selectedPart, editingVariantIndex, selectedEl.id, patch)
            }
          />
        ) : (
          <p className="text-white/20 italic py-4 text-center">
            click an element to edit
          </p>
        )}
      </div>

      {/* Add element + controls */}
      <div className="p-2 border-t border-white/10 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-white/40 uppercase tracking-widest text-[10px]">
            add element
          </p>
          <div className="flex gap-1">
            {/* Snap toggle */}
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[9px] transition-colors ${
                snapEnabled
                  ? "bg-blue-600/80 text-white"
                  : "bg-white/10 text-white/50 hover:bg-white/20"
              } cursor-pointer`}
            >
              ⊞ snap
            </button>
            {/* Pair toggle — always shown; symmetric is always-on locked */}
            <button
              onClick={() => !symmetric && setAddPair((v) => !v)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[9px] transition-colors ${
                willAddPair
                  ? "bg-orange-600/80 text-white"
                  : "bg-white/10 text-white/50 hover:bg-white/20"
              } ${symmetric ? "opacity-60 cursor-default" : "cursor-pointer"}`}
            >
              ↔ pair{symmetric ? " (locked)" : ""}
            </button>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["box", "sphere", "cylinder", "tapered", "plane"] as MeshType[]).map((type) => (
            <button
              key={type}
              onClick={() => addElement(selectedPart, editingVariantIndex, type, willAddPair)}
              className="flex-1 bg-white/10 hover:bg-white/20 py-1.5 lowercase text-center"
            >
              {type}
            </button>
          ))}
        </div>
        {/* Manual mirror only for free parts */}
        {!symmetric && !centered && (
          <button
            onClick={() => mirrorElementsX(selectedPart, editingVariantIndex)}
            className="w-full bg-white/5 hover:bg-white/15 py-1.5 lowercase text-white/60"
          >
            ↔ mirror all on X
          </button>
        )}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: MeshType }) {
  const colors: Record<MeshType, string> = {
    box: "bg-blue-700",
    sphere: "bg-green-700",
    cylinder: "bg-purple-700",
    tapered: "bg-amber-700",
    plane: "bg-pink-700",
  };
  const labels: Record<MeshType, string> = {
    box: "B",
    sphere: "S",
    cylinder: "C",
    tapered: "T▲",
    plane: "P",
  };
  return (
    <span className={`${colors[type]} px-1 py-0.5 text-[9px] uppercase tracking-wide`}>
      {labels[type]}
    </span>
  );
}

type ScaleAnchorH = 'left' | 'center' | 'right';
type ScaleAnchorV = 'top' | 'center' | 'bottom';

function ElementEditor({
  element,
  symmetric,
  centered,
  onChange,
}: {
  element: MeshElement;
  symmetric?: boolean;
  centered?: boolean;
  onChange: (patch: Partial<MeshElement>) => void;
}) {
  const [anchorH, setAnchorH] = useState<ScaleAnchorH>('center');
  const [anchorV, setAnchorV] = useState<ScaleAnchorV>('center');

  const updateVec = (
    key: "position" | "scale" | "rotation",
    axis: 0 | 1 | 2,
    value: number
  ) => {
    const next = [...element[key]] as [number, number, number];
    next[axis] = value;
    onChange({ [key]: next });
  };

  const updateScale = useCallback((axis: 0 | 1 | 2, newVal: number) => {
    const delta = newVal - element.scale[axis];
    const newScale = [...element.scale] as [number, number, number];
    newScale[axis] = newVal;
    const newPos = [...element.position] as [number, number, number];
    if (axis === 0) {
      if (anchorH === 'left')  newPos[0] += delta / 2;
      if (anchorH === 'right') newPos[0] -= delta / 2;
    } else if (axis === 1) {
      if (anchorV === 'bottom') newPos[1] += delta / 2;
      if (anchorV === 'top')    newPos[1] -= delta / 2;
    }
    onChange({ scale: newScale, position: newPos });
  }, [element.scale, element.position, anchorH, anchorV, onChange]);

  return (
    <div className="space-y-4">
      {/* Position */}
      <div>
        <Label>position</Label>
        <div className="space-y-1 mt-1">
          <AxisRow
            label="X"
            value={element.position[0]}
            min={-2} max={2} step={0.01}
            onChange={(v) => updateVec("position", 0, v)}
          />
          <AxisRow label="Y" value={element.position[1]} min={-0.5} max={3} step={0.01} onChange={(v) => updateVec("position", 1, v)} />
          <AxisRow label="Z" value={element.position[2]} min={-1} max={1} step={0.01} onChange={(v) => updateVec("position", 2, v)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>scale (w / h / d)</Label>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-px">
              {(['left','center','right'] as ScaleAnchorH[]).map((v, i) => (
                <button key={v} onClick={() => setAnchorH(v)}
                  title={`scale from ${v}`}
                  className={`w-5 h-4 text-[9px] leading-none transition-colors ${anchorH === v ? 'bg-orange-600 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}>
                  {['⬅','⊕','➡'][i]}
                </button>
              ))}
            </div>
            <div className="flex gap-px">
              {(['top','center','bottom'] as ScaleAnchorV[]).map((v, i) => (
                <button key={v} onClick={() => setAnchorV(v)}
                  title={`scale from ${v}`}
                  className={`w-5 h-4 text-[9px] leading-none transition-colors ${anchorV === v ? 'bg-orange-600 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}>
                  {['⬆','⊕','⬇'][i]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1 mt-1">
          <AxisRow label="W" value={element.scale[0]} min={0.01} max={2} step={0.01} onChange={(v) => updateScale(0, v)} />
          <AxisRow label="H" value={element.scale[1]} min={0.01} max={2} step={0.01} onChange={(v) => updateScale(1, v)} />
          <AxisRow label="D" value={element.scale[2]} min={0.01} max={2} step={0.01} onChange={(v) => updateVec("scale", 2, v)} />
        </div>
      </div>

      <div>
        <Label>rotation (rad)</Label>
        <div className="space-y-1 mt-1">
          <AxisRow label="X" value={element.rotation[0]} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => updateVec("rotation", 0, v)} />
          <AxisRow label="Y" value={element.rotation[1]} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => updateVec("rotation", 1, v)} />
          <AxisRow label="Z" value={element.rotation[2]} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => updateVec("rotation", 2, v)} />
        </div>
      </div>

      {/* Type selector */}
      <div>
        <Label>type</Label>
        <div className="flex gap-1 flex-wrap mt-1">
          {(["box", "sphere", "cylinder", "tapered", "plane"] as MeshType[]).map((t) => (
            <button
              key={t}
              onClick={() => onChange({ type: t, ...(t === "tapered" && !element.topScale && { topScale: [0.6, 0.6] }) })}
              className={`flex-1 py-1 lowercase text-center text-[10px] ${
                element.type === t
                  ? "bg-orange-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Rounded corners — only for box type */}
      {element.type === "box" && (
        <div>
          <Label>corner radius</Label>
          <p className="text-white/25 text-[9px] mb-1">0 = sharp · 0.05–0.15 = subtle rounding</p>
          <div className="mt-1 space-y-1">
            <AxisRow
              label="r"
              value={element.radius ?? 0}
              min={0} max={0.4} step={0.005}
              onChange={(v) => onChange({ radius: v === 0 ? undefined : v })}
            />
            {(element.radius ?? 0) > 0 && (
              <AxisRow
                label="sm"
                value={element.smoothness ?? 2}
                min={1} max={8} step={1}
                onChange={(v) => onChange({ smoothness: v === 2 ? undefined : Math.round(v) })}
              />
            )}
          </div>
        </div>
      )}

      {/* Segments — cylinder and sphere */}
      {(element.type === "cylinder" || element.type === "sphere") && (
        <div>
          <Label>segments</Label>
          <p className="text-white/25 text-[9px] mb-1">radial subdivisions — more = rounder</p>
          <div className="mt-1">
            <AxisRow
              label="n"
              value={element.segments ?? (element.type === "cylinder" ? 14 : 16)}
              min={3} max={64} step={1}
              onChange={(v) => {
                const def = element.type === "cylinder" ? 14 : 16;
                onChange({ segments: Math.round(v) === def ? undefined : Math.round(v) });
              }}
            />
          </div>
        </div>
      )}

      {/* Outline border — works correctly on translucent elements */}
      <div>
        <Label>outline border</Label>
        <p className="text-white/25 text-[9px] mb-1">inverted hull — uniform width even on transparent lenses</p>
        <div className="mt-1 space-y-1">
          <AxisRow
            label="w"
            value={element.outlineWidth ?? 0}
            min={0} max={0.05} step={0.001}
            onChange={(v) => onChange({ outlineWidth: v === 0 ? undefined : v })}
          />
          {(element.outlineWidth ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white/40 w-3 text-[10px]">c</span>
              <input
                type="color"
                value={element.outlineColor ?? '#ffffff'}
                onChange={(e) => onChange({ outlineColor: e.target.value })}
                className="w-7 h-6 cursor-pointer bg-transparent border-none outline-none"
              />
              {element.outlineColor && (
                <button
                  onClick={() => onChange({ outlineColor: undefined })}
                  className="text-white/40 hover:text-white/80 text-[9px] underline"
                >
                  × reset to white
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Taper controls — only for tapered type */}
      {element.type === "tapered" && (
        <div>
          <Label>taper — top ÷ base</Label>
          <p className="text-white/25 text-[9px] mb-1">1=parallel · &lt;1=wider base · &gt;1=wider top</p>
          <div className="space-y-1">
            <AxisRow
              label="X"
              value={element.topScale?.[0] ?? 1}
              min={0} max={3} step={0.01}
              onChange={(v) => {
                const ts: [number, number] = [v, element.topScale?.[1] ?? 1];
                onChange({ topScale: ts });
              }}
            />
            <AxisRow
              label="Z"
              value={element.topScale?.[1] ?? 1}
              min={0} max={3} step={0.01}
              onChange={(v) => {
                const ts: [number, number] = [element.topScale?.[0] ?? 1, v];
                onChange({ topScale: ts });
              }}
            />
          </div>
        </div>
      )}

      {/* Per-element color override */}
      <div>
        <Label>color override</Label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={element.color ?? '#ffffff'}
            onChange={(e) => onChange({ color: e.target.value })}
            className="w-7 h-6 cursor-pointer bg-transparent border-none outline-none"
          />
          {element.color ? (
            <button
              onClick={() => onChange({ color: undefined })}
              className="text-white/40 hover:text-white/80 text-[9px] underline"
            >
              × clear (use part color)
            </button>
          ) : (
            <span className="text-white/25 text-[9px]">using part color</span>
          )}
        </div>
      </div>

      {/* Lightness shift */}
      <div>
        <Label>lightness</Label>
        <div className="mt-1 space-y-1">
          <AxisRow
            label="l"
            value={element.colorLightness ?? 0}
            min={-1} max={1} step={0.01}
            onChange={(v) => onChange({ colorLightness: Math.abs(v) < 0.005 ? undefined : v })}
          />
          <div
            className="h-2 w-full rounded-sm"
            style={{ background: `linear-gradient(to right, #000, ${element.color ?? '#888888'}, #fff)` }}
          />
        </div>
      </div>

      {/* Flat / unlit rendering */}
      <div>
        <Label>rendering</Label>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => onChange({ flat: element.flat ? undefined : true })}
            className={`px-2 py-1 text-[9px] transition-colors ${
              element.flat
                ? "bg-orange-600 text-white"
                : "bg-white/10 hover:bg-white/20 text-white/60"
            }`}
          >
            {element.flat ? "✓ flat (unlit)" : "flat (unlit)"}
          </button>
          <span className="text-white/25 text-[9px]">ignores scene lighting</span>
        </div>
      </div>

      {/* Emissive glow — only meaningful when not flat */}
      {!element.flat && (
        <div>
          <Label>emissive glow</Label>
          <p className="text-white/25 text-[9px] mb-1">self-illumination on top of lighting</p>
          <div className="mt-1 space-y-1">
            <AxisRow
              label="i"
              value={element.emissiveIntensity ?? 0}
              min={0} max={2} step={0.01}
              onChange={(v) => onChange({ emissiveIntensity: v === 0 ? undefined : v })}
            />
            {(element.emissiveIntensity ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-white/40 w-3 text-[10px]">c</span>
                <input
                  type="color"
                  value={element.emissiveColor ?? '#ffffff'}
                  onChange={(e) => onChange({ emissiveColor: e.target.value })}
                  className="w-7 h-6 cursor-pointer bg-transparent border-none outline-none"
                />
                {element.emissiveColor && (
                  <button
                    onClick={() => onChange({ emissiveColor: undefined })}
                    className="text-white/40 hover:text-white/80 text-[9px] underline"
                  >
                    × reset to white
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Opacity — all types */}
      <div>
        <Label>opacity</Label>
        <div className="mt-1">
          <AxisRow
            label="α"
            value={element.opacity ?? 1}
            min={0} max={1} step={0.01}
            onChange={(v) => onChange({ opacity: v === 1 ? undefined : v })}
          />
        </div>
      </div>

      {/* Sticker picker — plane type only */}
      {element.type === "plane" && (
        <div>
          <Label>sticker</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {STICKER_NAMES.map((name) => (
              <button
                key={name}
                onClick={() => onChange({ texture: element.texture === name ? undefined : name })}
                className={`px-2 py-0.5 text-[9px] lowercase transition-colors ${
                  element.texture === name
                    ? "bg-orange-600 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white/60"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="text-white/25 text-[9px] mt-1">tint with preview color above</p>
        </div>
      )}

    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-white/40 uppercase tracking-widest text-[10px]">{children}</p>
  );
}

function AxisRow({
  label,
  value,
  min,
  max,
  step,
  readOnly,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  readOnly?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 w-3 text-[10px]">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-orange-500"
      />
      <input
        type="number"
        min={min} max={max} step={step}
        value={value.toFixed(3)}
        disabled={readOnly}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        className="w-16 bg-white/10 text-white/80 px-1 py-0.5 text-[10px] font-mono text-right outline-none focus:bg-white/20"
      />
    </div>
  );
}
