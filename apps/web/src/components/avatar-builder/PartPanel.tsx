"use client";

import { useBuilderStore } from "./builderStore";
import { AVATAR_PARTS, type AvatarPart } from "./types";
import { COLOR_PALETTE } from "@/store/avatarStore";

const PART_ICONS: Record<AvatarPart, string> = {
  hair: "💇",
  head: "🔲",
  face: "😐",
  neck: "🧣",
  arms: "💪",
  body: "👕",
  pants: "👗",
  legs: "🦵",
  shoes: "👟",
};

export function PartPanel() {
  const {
    library,
    selectedPart,
    editingVariantIndex,
    activeVariantIndex,
    previewColors,
    setSelectedPart,
    setEditingVariantIndex,
    addVariant,
    duplicateVariant,
    deleteVariant,
    renameVariant,
    setPreviewColor,
  } = useBuilderStore();

  const variants = library[selectedPart];
  const color = previewColors[selectedPart];

  return (
    <div className="w-52 flex flex-col bg-[#1a1a1a] text-white text-xs overflow-hidden h-full">
      {/* Part selector */}
      <div className="p-2 border-b border-white/10">
        <p className="text-white/40 uppercase tracking-widest text-[10px] mb-2">body part</p>
        <div className="grid grid-cols-2 gap-1">
          {AVATAR_PARTS.map((part) => (
            <button
              key={part}
              onClick={() => setSelectedPart(part)}
              className={`px-2 py-1.5 text-left lowercase flex items-center gap-1.5 transition-colors ${
                selectedPart === part
                  ? "bg-[#0033cc] text-white"
                  : "bg-white/5 hover:bg-white/10 text-white/70"
              }`}
            >
              <span>{PART_ICONS[part]}</span>
              {part}
            </button>
          ))}
        </div>
      </div>

      {/* Color for this part */}
      <div className="p-2 border-b border-white/10">
        <p className="text-white/40 uppercase tracking-widest text-[10px] mb-2">preview color</p>
        <div className="grid grid-cols-6 gap-0.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setPreviewColor(selectedPart, c)}
              className="w-6 h-6 border-2 transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: color === c ? "#ffffff" : "transparent",
              }}
            />
          ))}
        </div>
      </div>

      {/* Variant list */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-white/40 uppercase tracking-widest text-[10px] mb-2">
          variants ({variants.length})
        </p>
        <div className="space-y-1">
          {variants.map((variant, i) => (
            <div
              key={variant.variantId}
              className={`group flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors ${
                editingVariantIndex === i
                  ? "bg-[#0033cc]"
                  : "bg-white/5 hover:bg-white/10"
              }`}
              onClick={() => setEditingVariantIndex(i)}
            >
              <span className="text-white/30 w-4 text-[10px]">{i + 1}</span>
              <input
                className="flex-1 bg-transparent outline-none text-xs lowercase truncate"
                value={variant.label}
                onChange={(e) => {
                  e.stopPropagation();
                  renameVariant(selectedPart, i, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-white/30 text-[10px]">{variant.elements.length}el</span>
            </div>
          ))}
        </div>
      </div>

      {/* Variant actions */}
      <div className="p-2 border-t border-white/10 space-y-1">
        <button
          onClick={() => addVariant(selectedPart)}
          className="w-full bg-white/10 hover:bg-white/20 px-2 py-1.5 lowercase text-left"
        >
          + new variant
        </button>
        <button
          onClick={() => duplicateVariant(selectedPart, editingVariantIndex)}
          className="w-full bg-white/10 hover:bg-white/20 px-2 py-1.5 lowercase text-left"
        >
          ⎘ duplicate
        </button>
        <button
          onClick={() => deleteVariant(selectedPart, editingVariantIndex)}
          className="w-full bg-red-900/40 hover:bg-red-900/60 px-2 py-1.5 lowercase text-left text-red-300"
          disabled={variants.length <= 1}
        >
          ✕ delete variant
        </button>
      </div>
    </div>
  );
}
