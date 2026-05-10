export type MeshType = 'box' | 'sphere' | 'cylinder' | 'tapered' | 'plane';

export type AvatarPart =
  | 'hair'
  | 'head'
  | 'face'
  | 'neck'
  | 'arms'
  | 'body'
  | 'pants'
  | 'legs'
  | 'shoes';

export const AVATAR_PARTS: AvatarPart[] = [
  'hair', 'head', 'face', 'neck', 'arms', 'body', 'pants', 'legs', 'shoes',
];

/** Elements stored as [left, right] pairs (even = primary/left, odd = mirror/right) */
export const SYMMETRIC_PARTS: AvatarPart[] = ['arms', 'legs', 'shoes'];

/** X position is locked to 0 — no lateral offset allowed */
export const CENTERED_PARTS: AvatarPart[] = ['head', 'neck', 'body', 'pants'];

export function isSymmetric(part: AvatarPart) {
  return SYMMETRIC_PARTS.includes(part);
}

export function isCentered(part: AvatarPart) {
  return CENTERED_PARTS.includes(part);
}

/** Mirror a primary element to produce its right-side counterpart */
export function mirrorElement(el: MeshElement, newId: string): MeshElement {
  return {
    ...el,
    id: newId,
    position: [-el.position[0], el.position[1], el.position[2]],
    rotation: [el.rotation[0], -el.rotation[1], -el.rotation[2]],
  };
}

export interface MeshElement {
  id: string;
  type: MeshType;
  /** World-space position relative to character root (feet = 0,0,0) */
  position: [number, number, number];
  /** Physical dimensions: [width, height, depth] applied as mesh.scale */
  scale: [number, number, number];
  /** Euler rotation in radians */
  rotation: [number, number, number];
  /** For 'tapered' type: top X and Z as a fraction of the bottom (1=parallel, <1=tapers to top, >1=flares to top) */
  topScale?: [number, number];
  /** 0–1 material opacity; <1 enables transparency. Useful for glass lenses, overlays. */
  opacity?: number;
  /** Predefined sticker texture name. Primarily for 'plane' type but works on any mesh. */
  texture?: string;
  /** Per-element color override. If omitted, uses the part's preview color. */
  color?: string;
  /** ID of the mirrored counterpart for manually-paired elements (non-symmetric parts). */
  pairedWith?: string;
  /** Corner radius for 'box' type (0 = sharp corners). Values 0.01–0.3 work well. */
  radius?: number;
  /** Bevel smoothness for rounded box (integer, default 2). Higher = smoother corners. */
  smoothness?: number;
  /** Radial segment count for cylinder/sphere (default: cylinder 14, sphere 16). */
  segments?: number;
  /** Inverted-hull outline width in world units. Creates a solid border that works with transparent lenses. */
  outlineWidth?: number;
  /** Color of the outline border. Defaults to white. */
  outlineColor?: string;
  /** HSL lightness offset applied on top of the chosen color. -1 = fully dark, 0 = unchanged, +1 = fully light. */
  colorLightness?: number;
  /** Render with meshBasicMaterial — fully unlit, ignores scene lighting. Slightly faster. */
  flat?: boolean;
  /** Emissive (self-illumination) color. Ignored when flat=true. */
  emissiveColor?: string;
  /** Emissive intensity multiplier (0 = off, 1 = full color, >1 = bloom). Ignored when flat=true. */
  emissiveIntensity?: number;
}

export interface PartVariant {
  variantId: string;
  label: string;
  elements: MeshElement[];
}

export type AvatarVariantLibrary = Record<AvatarPart, PartVariant[]>;
