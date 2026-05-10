import { create } from 'zustand';
import type { AvatarPart, AvatarVariantLibrary, MeshElement, MeshType, PartVariant } from './types';
import { AVATAR_PARTS, isSymmetric, mirrorElement } from './types';
import { SEED_VARIANTS, DEFAULT_PREVIEW_COLORS } from './seedVariants';

let _eid = Date.now();
const newId = () => `el_${++_eid}`;
const newVid = (part: string) => `${part}_${++_eid}`;

export type AlignOp = 'left' | 'right' | 'centerX' | 'top' | 'bottom' | 'middleY';

interface BuilderState {
  library: AvatarVariantLibrary;
  past: AvatarVariantLibrary[];
  activeVariantIndex: Record<AvatarPart, number>;
  selectedPart: AvatarPart;
  editingVariantIndex: number;
  selectedElementId: string | null;
  selectedElementIds: string[];
  snapEnabled: boolean;
  previewColors: Record<AvatarPart, string>;
  clipboard: MeshElement[];

  // Selection
  setSelectedPart: (part: AvatarPart) => void;
  setEditingVariantIndex: (i: number) => void;
  setSelectedElementId: (id: string | null) => void;
  toggleSelectedElementId: (id: string) => void;
  setActiveVariant: (part: AvatarPart, i: number) => void;
  setSnapEnabled: (v: boolean) => void;

  // Color
  setPreviewColor: (part: AvatarPart, color: string) => void;

  // History
  snapshotLibrary: () => void;
  undo: () => void;
  /** Load saved library without touching undo history — for initial hydration only */
  hydrateLibrary: (library: AvatarVariantLibrary) => void;
  /** Restore saved preview colors — for initial hydration only */
  hydrateColors: (colors: Record<AvatarPart, string>) => void;

  // Variant management
  addVariant: (part: AvatarPart) => void;
  duplicateVariant: (part: AvatarPart, fromIndex: number) => void;
  deleteVariant: (part: AvatarPart, index: number) => void;
  renameVariant: (part: AvatarPart, index: number, label: string) => void;

  // Element management
  addElement: (part: AvatarPart, variantIndex: number, type: MeshType, asPair?: boolean) => void;
  deleteElement: (part: AvatarPart, variantIndex: number, elementId: string) => void;
  updateElement: (part: AvatarPart, variantIndex: number, elementId: string, patch: Partial<MeshElement>) => void;
  duplicateSelectedElements: (part: AvatarPart, variantIndex: number, elementIds: string[]) => void;
  deleteSelectedElements: () => void;
  copySelectedElements: () => void;
  pasteElements: () => void;
  mirrorElementsX: (part: AvatarPart, variantIndex: number) => void;
  alignSelectedElements: (op: AlignOp) => void;

  // Import/Export
  loadFromJSON: (json: string) => void;
  exportJSON: () => string;
  resetToSeed: () => void;
}

const defaultActiveIndex = () =>
  Object.fromEntries(AVATAR_PARTS.map((p) => [p, 0])) as Record<AvatarPart, number>;

const clearSelection = { selectedElementId: null as string | null, selectedElementIds: [] as string[] };

const MAX_HISTORY = 50;

export const useBuilderStore = create<BuilderState>((set, get) => ({
  library: structuredClone(SEED_VARIANTS),
  past: [],
  activeVariantIndex: defaultActiveIndex(),
  selectedPart: 'hair',
  editingVariantIndex: 0,
  selectedElementId: null,
  selectedElementIds: [],
  snapEnabled: false,
  previewColors: structuredClone(DEFAULT_PREVIEW_COLORS) as Record<AvatarPart, string>,
  clipboard: [],

  setSelectedPart: (part) =>
    set((s) => ({
      selectedPart: part,
      editingVariantIndex: s.activeVariantIndex[part],
      ...clearSelection,
    })),

  setEditingVariantIndex: (i) =>
    set((s) => ({
      editingVariantIndex: i,
      activeVariantIndex: { ...s.activeVariantIndex, [s.selectedPart]: i },
      ...clearSelection,
    })),

  setSelectedElementId: (id) =>
    set({ selectedElementId: id, selectedElementIds: id ? [id] : [] }),

  toggleSelectedElementId: (id) =>
    set((s) => {
      const has = s.selectedElementIds.includes(id);
      const newIds = has
        ? s.selectedElementIds.filter((x) => x !== id)
        : [...s.selectedElementIds, id];
      return { selectedElementIds: newIds, selectedElementId: newIds[0] ?? null };
    }),

  setActiveVariant: (part, i) =>
    set((s) => ({ activeVariantIndex: { ...s.activeVariantIndex, [part]: i } })),

  setSnapEnabled: (v) => set({ snapEnabled: v }),

  setPreviewColor: (part, color) =>
    set((s) => ({ previewColors: { ...s.previewColors, [part]: color } })),

  snapshotLibrary: () =>
    set((s) => ({ past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)] })),

  hydrateLibrary: (library) =>
    set({ library, past: [], ...clearSelection }),

  hydrateColors: (colors) =>
    set({ previewColors: colors }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      return {
        library: s.past[s.past.length - 1],
        past: s.past.slice(0, -1),
        ...clearSelection,
      };
    }),

  addVariant: (part) =>
    set((s) => {
      const variants = [...s.library[part]];
      const newVariant: PartVariant = {
        variantId: newVid(part),
        label: `variant ${variants.length + 1}`,
        elements: [],
      };
      variants.push(newVariant);
      const newIndex = variants.length - 1;
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [part]: variants },
        editingVariantIndex: newIndex,
        activeVariantIndex: { ...s.activeVariantIndex, [part]: newIndex },
        ...clearSelection,
      };
    }),

  duplicateVariant: (part, fromIndex) =>
    set((s) => {
      const variants = [...s.library[part]];
      const src = variants[fromIndex];
      const idMap = new Map<string, string>();
      for (const el of src.elements) idMap.set(el.id, newId());
      const dupe: PartVariant = {
        variantId: newVid(part),
        label: `${src.label} copy`,
        elements: src.elements.map((el) => ({
          ...el,
          id: idMap.get(el.id)!,
          pairedWith: el.pairedWith ? idMap.get(el.pairedWith) : undefined,
        })),
      };
      variants.splice(fromIndex + 1, 0, dupe);
      const newIndex = fromIndex + 1;
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [part]: variants },
        editingVariantIndex: newIndex,
        activeVariantIndex: { ...s.activeVariantIndex, [part]: newIndex },
      };
    }),

  deleteVariant: (part, index) =>
    set((s) => {
      const variants = s.library[part].filter((_, i) => i !== index);
      if (variants.length === 0) return s;
      const newIndex = Math.min(index, variants.length - 1);
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [part]: variants },
        editingVariantIndex: newIndex,
        activeVariantIndex: { ...s.activeVariantIndex, [part]: newIndex },
        ...clearSelection,
      };
    }),

  renameVariant: (part, index, label) =>
    set((s) => {
      const variants = s.library[part].map((v, i) =>
        i === index ? { ...v, label } : v
      );
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [part]: variants },
      };
    }),

  addElement: (part, variantIndex, type, asPair?) =>
    set((s) => {
      const snapshot = [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)];
      if (isSymmetric(part) || asPair) {
        const primaryId = newId();
        const mirrorId = newId();
        const manualPair = !isSymmetric(part) && !!asPair;
        const primary: MeshElement = {
          id: primaryId,
          type,
          position: [-0.3, 1.0, 0],
          scale: [0.3, 0.5, 0.3],
          rotation: [0, 0, 0],
          ...(type === 'tapered' && { topScale: [0.6, 0.6] as [number, number] }),
          ...(manualPair && { pairedWith: mirrorId }),
        };
        const mirror = mirrorElement(primary, mirrorId);
        if (manualPair) mirror.pairedWith = primaryId;
        const variants = s.library[part].map((v, i) =>
          i === variantIndex ? { ...v, elements: [...v.elements, primary, mirror] } : v
        );
        return {
          past: snapshot,
          library: { ...s.library, [part]: variants },
          selectedElementId: primaryId,
          selectedElementIds: [primaryId],
        };
      }
      const newEl: MeshElement = {
        id: newId(),
        type,
        position: [0, 1.0, 0],
        scale: [0.3, 0.5, 0.3],
        rotation: [0, 0, 0],
        ...(type === 'tapered' && { topScale: [0.6, 0.6] as [number, number] }),
      };
      const variants = s.library[part].map((v, i) =>
        i === variantIndex ? { ...v, elements: [...v.elements, newEl] } : v
      );
      return {
        past: snapshot,
        library: { ...s.library, [part]: variants },
        selectedElementId: newEl.id,
        selectedElementIds: [newEl.id],
      };
    }),

  deleteElement: (part, variantIndex, elementId) =>
    set((s) => {
      const elements = s.library[part][variantIndex]?.elements ?? [];
      const toRemove = new Set([elementId]);
      if (isSymmetric(part)) {
        const idx = elements.findIndex((el) => el.id === elementId);
        if (idx !== -1) {
          const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
          if (pairIdx >= 0 && pairIdx < elements.length) toRemove.add(elements[pairIdx].id);
        }
      } else {
        const el = elements.find((e) => e.id === elementId);
        if (el?.pairedWith) toRemove.add(el.pairedWith);
      }
      const variants = s.library[part].map((v, i) =>
        i === variantIndex ? { ...v, elements: v.elements.filter((el) => !toRemove.has(el.id)) } : v
      );
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [part]: variants },
        ...clearSelection,
      };
    }),

  updateElement: (part, variantIndex, elementId, patch) =>
    set((s) => {
      const elements = s.library[part][variantIndex]?.elements ?? [];

      if (isSymmetric(part)) {
        const idx = elements.findIndex((el) => el.id === elementId);
        if (idx === -1 || idx % 2 === 1) return {};
        const updatedPrimary = { ...elements[idx], ...patch };
        const mirrorEl = elements[idx + 1];
        const updatedMirror = mirrorEl ? mirrorElement(updatedPrimary, mirrorEl.id) : null;
        const variants = s.library[part].map((v, i) =>
          i === variantIndex
            ? {
                ...v,
                elements: v.elements.map((el, j) => {
                  if (j === idx) return updatedPrimary;
                  if (j === idx + 1 && updatedMirror) return updatedMirror;
                  return el;
                }),
              }
            : v
        );
        return { library: { ...s.library, [part]: variants } };
      }

      const srcEl = elements.find((e) => e.id === elementId);
      const pairedId = srcEl?.pairedWith;
      const updatedSrc = srcEl ? { ...srcEl, ...patch } : null;

      const variants = s.library[part].map((v, i) => {
        if (i !== variantIndex) return v;
        return {
          ...v,
          elements: v.elements.map((el) => {
            if (el.id === elementId) return { ...el, ...patch };
            if (pairedId && el.id === pairedId && updatedSrc) {
              const mirrored = mirrorElement(updatedSrc, el.id);
              return { ...mirrored, pairedWith: elementId };
            }
            return el;
          }),
        };
      });
      return { library: { ...s.library, [part]: variants } };
    }),

  duplicateSelectedElements: (part, variantIndex, elementIds) =>
    set((s) => {
      const variant = s.library[part]?.[variantIndex];
      if (!variant) return s;
      const elements = variant.elements;
      const processed = new Set<string>();
      const newEls: MeshElement[] = [];
      const newPrimaryIds: string[] = [];

      for (const id of elementIds) {
        if (processed.has(id)) continue;
        const el = elements.find((e) => e.id === id);
        if (!el) continue;

        if (isSymmetric(part)) {
          const idx = elements.findIndex((e) => e.id === id);
          const primaryIdx = idx % 2 === 0 ? idx : idx - 1;
          const primary = elements[primaryIdx];
          const mirror = elements[primaryIdx + 1];
          if (!primary || processed.has(primary.id)) continue;
          const pid = newId(), mid = newId();
          newEls.push({ ...primary, id: pid });
          if (mirror) newEls.push({ ...mirror, id: mid });
          newPrimaryIds.push(pid);
          processed.add(primary.id);
          if (mirror) processed.add(mirror.id);
        } else {
          const partnerId = el.pairedWith;
          const partner = partnerId ? elements.find((e) => e.id === partnerId) : null;
          const eid = newId();
          const pairedEid = partner ? newId() : undefined;
          newEls.push({ ...el, id: eid, pairedWith: pairedEid });
          if (partner && pairedEid) {
            newEls.push({ ...partner, id: pairedEid, pairedWith: eid });
            processed.add(partner.id);
          }
          newPrimaryIds.push(eid);
          processed.add(el.id);
        }
      }

      if (newEls.length === 0) return s;

      const variants = s.library[part].map((v, i) =>
        i === variantIndex ? { ...v, elements: [...v.elements, ...newEls] } : v
      );
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [part]: variants },
        selectedElementId: newPrimaryIds[0] ?? null,
        selectedElementIds: newPrimaryIds,
      };
    }),

  deleteSelectedElements: () =>
    set((s) => {
      const { selectedPart, editingVariantIndex, selectedElementIds } = s;
      if (selectedElementIds.length === 0) return s;
      const elements = s.library[selectedPart][editingVariantIndex]?.elements ?? [];
      const toRemove = new Set<string>();
      for (const id of selectedElementIds) {
        toRemove.add(id);
        if (isSymmetric(selectedPart)) {
          const idx = elements.findIndex((el) => el.id === id);
          if (idx !== -1) {
            const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
            if (pairIdx >= 0 && pairIdx < elements.length) toRemove.add(elements[pairIdx].id);
          }
        } else {
          const el = elements.find((e) => e.id === id);
          if (el?.pairedWith) toRemove.add(el.pairedWith);
        }
      }
      const variants = s.library[selectedPart].map((v, i) =>
        i === editingVariantIndex ? { ...v, elements: v.elements.filter((el) => !toRemove.has(el.id)) } : v
      );
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [selectedPart]: variants },
        ...clearSelection,
      };
    }),

  copySelectedElements: () => {
    const { selectedPart, editingVariantIndex, selectedElementIds, library } = get();
    const variant = library[selectedPart]?.[editingVariantIndex];
    if (!variant || selectedElementIds.length === 0) return;
    const elements = variant.elements;
    const sym = isSymmetric(selectedPart);
    const collected = new Set<string>();
    const result: MeshElement[] = [];

    for (const id of selectedElementIds) {
      if (collected.has(id)) continue;
      const el = elements.find((e) => e.id === id);
      if (!el) continue;

      if (sym) {
        const idx = elements.findIndex((e) => e.id === id);
        const primaryIdx = idx % 2 === 0 ? idx : idx - 1;
        const primary = elements[primaryIdx];
        const mirror = elements[primaryIdx + 1];
        if (!primary || collected.has(primary.id)) continue;
        result.push(primary);
        if (mirror) result.push(mirror);
        collected.add(primary.id);
        if (mirror) collected.add(mirror.id);
      } else {
        const partnerId = el.pairedWith;
        const partner = partnerId ? elements.find((e) => e.id === partnerId) : null;
        result.push(el);
        if (partner && !collected.has(partner.id)) result.push(partner);
        collected.add(el.id);
        if (partner) collected.add(partner.id);
      }
    }

    set({ clipboard: result });
  },

  pasteElements: () =>
    set((s) => {
      const { clipboard, selectedPart, editingVariantIndex } = s;
      if (clipboard.length === 0) return s;

      const idMap = new Map<string, string>();
      for (const el of clipboard) idMap.set(el.id, newId());

      const newEls = clipboard.map((el) => ({
        ...el,
        id: idMap.get(el.id)!,
        pairedWith: el.pairedWith ? idMap.get(el.pairedWith) : undefined,
      }));

      // Select the primary of each pasted pair (those whose paired partner, if any, comes later)
      const newPrimaryIds: string[] = [];
      for (let i = 0; i < clipboard.length; i++) {
        const el = clipboard[i];
        const partnerIdx = el.pairedWith ? clipboard.findIndex((e) => e.id === el.pairedWith) : -1;
        if (partnerIdx === -1 || partnerIdx > i) {
          newPrimaryIds.push(idMap.get(el.id)!);
        }
      }

      const variants = s.library[selectedPart].map((v, i) =>
        i === editingVariantIndex ? { ...v, elements: [...v.elements, ...newEls] } : v
      );
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [selectedPart]: variants },
        selectedElementId: newPrimaryIds[0] ?? null,
        selectedElementIds: newPrimaryIds,
      };
    }),

  mirrorElementsX: (part, variantIndex) =>
    set((s) => {
      const variant = s.library[part][variantIndex];
      const mirrored = variant.elements.map((el) => ({
        ...el,
        id: newId(),
        position: [-el.position[0], el.position[1], el.position[2]] as [number, number, number],
        rotation: [el.rotation[0], -el.rotation[1], -el.rotation[2]] as [number, number, number],
      }));
      const merged = [...variant.elements, ...mirrored];
      const variants = s.library[part].map((v, i) =>
        i === variantIndex ? { ...v, elements: merged } : v
      );
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [part]: variants },
      };
    }),

  alignSelectedElements: (op) =>
    set((s) => {
      const { selectedPart, editingVariantIndex, selectedElementIds } = s;
      const variant = s.library[selectedPart]?.[editingVariantIndex];
      if (!variant || selectedElementIds.length < 2) return s;

      const elements = variant.elements;
      const selected = elements.filter((el) => selectedElementIds.includes(el.id));

      const axis = (op === 'left' || op === 'right' || op === 'centerX') ? 0 : 1;
      const lo = (el: MeshElement) => el.position[axis] - el.scale[axis] / 2;
      const hi = (el: MeshElement) => el.position[axis] + el.scale[axis] / 2;
      const mid = (el: MeshElement) => el.position[axis];

      let ref: number;
      if (op === 'left' || op === 'bottom')    ref = Math.min(...selected.map(lo));
      else if (op === 'right' || op === 'top') ref = Math.max(...selected.map(hi));
      else                                      ref = selected.reduce((acc, el) => acc + mid(el), 0) / selected.length;

      const updates = new Map<string, [number, number, number]>();
      for (const el of selected) {
        const newPos = [...el.position] as [number, number, number];
        if (op === 'left' || op === 'bottom')      newPos[axis] = ref + el.scale[axis] / 2;
        else if (op === 'right' || op === 'top')   newPos[axis] = ref - el.scale[axis] / 2;
        else                                        newPos[axis] = ref;
        updates.set(el.id, newPos);

        if (el.pairedWith) {
          const paired = elements.find((e) => e.id === el.pairedWith);
          if (paired) {
            const m = mirrorElement({ ...el, position: newPos }, paired.id);
            updates.set(paired.id, m.position);
          }
        }
        if (isSymmetric(selectedPart)) {
          const idx = elements.findIndex((e) => e.id === el.id);
          if (idx % 2 === 0 && elements[idx + 1]) {
            const m = mirrorElement({ ...el, position: newPos }, elements[idx + 1].id);
            updates.set(elements[idx + 1].id, m.position);
          }
        }
      }

      const newElements = elements.map((el) =>
        updates.has(el.id) ? { ...el, position: updates.get(el.id)! } : el
      );
      const newVariants = s.library[selectedPart].map((v, i) =>
        i === editingVariantIndex ? { ...v, elements: newElements } : v
      );
      return {
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
        library: { ...s.library, [selectedPart]: newVariants },
      };
    }),

  loadFromJSON: (json) => {
    try {
      const { library } = get();
      const parsed = JSON.parse(json) as AvatarVariantLibrary;
      set((s) => ({
        past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(library)],
        library: parsed,
        ...clearSelection,
      }));
    } catch {
      alert('Invalid JSON');
    }
  },

  exportJSON: () => {
    const { library } = get();
    return JSON.stringify(library, null, 2);
  },

  resetToSeed: () =>
    set((s) => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), structuredClone(s.library)],
      library: structuredClone(SEED_VARIANTS),
      activeVariantIndex: defaultActiveIndex(),
      editingVariantIndex: 0,
      ...clearSelection,
    })),
}));
