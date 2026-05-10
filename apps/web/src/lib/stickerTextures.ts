import * as THREE from 'three';

export const STICKER_NAMES = [
  'button',
  'button4',
  'buckle',
  'laces',
  'zipper',
  'stripes',
  'dots',
  'pocket',
  'star',
  'heart',
] as const;

export type StickerName = typeof STICKER_NAMES[number];

const S = 256; // canvas size

function draw(fn: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';
  fn(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const creators: Record<StickerName, () => THREE.CanvasTexture> = {
  button: () => draw((ctx) => {
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    for (const [x, y] of [[0.42, 0.42], [0.58, 0.42], [0.42, 0.58], [0.58, 0.58]] as const) {
      ctx.beginPath(); ctx.arc(x * S, y * S, 9, 0, Math.PI * 2); ctx.fill();
    }
  }),

  button4: () => draw((ctx) => {
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    // cross stitch through 4 holes
    const holes: [number, number][] = [[0.38, 0.38], [0.62, 0.62], [0.62, 0.38], [0.38, 0.62]];
    ctx.lineWidth = 5;
    for (const [x, y] of holes) { ctx.beginPath(); ctx.arc(x * S, y * S, 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0.38 * S, 0.38 * S); ctx.lineTo(0.62 * S, 0.62 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.62 * S, 0.38 * S); ctx.lineTo(0.38 * S, 0.62 * S); ctx.stroke();
  }),

  buckle: () => draw((ctx) => {
    ctx.lineWidth = 14;
    const m = 24;
    ctx.strokeRect(m, m * 1.5, S - m * 2, S - m * 3);
    ctx.fillRect(S / 2 - 8, m * 1.5, 16, S - m * 3);
    // prong
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(S / 2, S / 2 + 18, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S / 2, S / 2 + 4); ctx.lineTo(S / 2, m * 1.5); ctx.stroke();
  }),

  laces: () => draw((ctx) => {
    ctx.lineWidth = 8;
    // center seam
    ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.stroke();
    // eyelets & crosses
    const rows = [0.12, 0.28, 0.44, 0.60, 0.76, 0.92];
    for (const y of rows) {
      const cy = y * S;
      ctx.beginPath(); ctx.arc(0.25 * S, cy, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0.75 * S, cy, 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 5;
    for (let i = 0; i < rows.length - 1; i++) {
      const y0 = rows[i] * S, y1 = rows[i + 1] * S;
      if (i % 2 === 0) {
        ctx.beginPath(); ctx.moveTo(0.25 * S, y0); ctx.lineTo(0.75 * S, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0.75 * S, y0); ctx.lineTo(0.25 * S, y1); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(0.25 * S, y0); ctx.lineTo(0.25 * S, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0.75 * S, y0); ctx.lineTo(0.75 * S, y1); ctx.stroke();
      }
    }
  }),

  zipper: () => draw((ctx) => {
    // pull tab at top
    ctx.lineWidth = 10;
    ctx.strokeRect(S / 2 - 22, 12, 44, 28);
    // slider body
    ctx.fillRect(S / 2 - 16, 40, 32, 26);
    // tape
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(S / 2, 66); ctx.lineTo(S / 2, S - 16); ctx.stroke();
    // teeth
    ctx.lineWidth = 6;
    for (let y = 80; y < S - 16; y += 22) {
      ctx.beginPath(); ctx.moveTo(S / 2, y); ctx.lineTo(S / 2 - 28, y + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(S / 2, y); ctx.lineTo(S / 2 + 28, y + 8); ctx.stroke();
    }
  }),

  stripes: () => draw((ctx) => {
    for (let i = 0; i < 4; i++) ctx.fillRect(0, S * (i * 0.25 + 0.04), S, S * 0.14);
  }),

  dots: () => draw((ctx) => {
    const pts: [number, number][] = [
      [0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75],
    ];
    for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x * S, y * S, S * 0.1, 0, Math.PI * 2); ctx.fill(); }
  }),

  pocket: () => draw((ctx) => {
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(S * 0.15, S * 0.2);
    ctx.lineTo(S * 0.15, S * 0.82);
    ctx.quadraticCurveTo(S * 0.15, S * 0.92, S * 0.25, S * 0.92);
    ctx.lineTo(S * 0.75, S * 0.92);
    ctx.quadraticCurveTo(S * 0.85, S * 0.92, S * 0.85, S * 0.82);
    ctx.lineTo(S * 0.85, S * 0.2);
    ctx.stroke();
    // top fold line
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(S * 0.15, S * 0.34); ctx.lineTo(S * 0.85, S * 0.34); ctx.stroke();
  }),

  star: () => draw((ctx) => {
    const cx = S / 2, cy = S / 2, r = S * 0.42, ir = S * 0.18, pts = 5;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const angle = (i * Math.PI) / pts - Math.PI / 2;
      const radius = i % 2 === 0 ? r : ir;
      if (i === 0) ctx.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      else ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
  }),

  heart: () => draw((ctx) => {
    const cx = S / 2, top = S * 0.22;
    ctx.beginPath();
    ctx.moveTo(cx, S * 0.82);
    ctx.bezierCurveTo(S * 0.05, S * 0.55, S * 0.05, top, cx * 0.7, top);
    ctx.bezierCurveTo(S * 0.38, top, cx, S * 0.38, cx, S * 0.38);
    ctx.bezierCurveTo(cx, S * 0.38, S * 0.62, top, cx * 1.3, top);
    ctx.bezierCurveTo(S * 0.95, top, S * 0.95, S * 0.55, cx, S * 0.82);
    ctx.closePath();
    ctx.fill();
  }),
};

// Module-level cache — one texture per sticker type per session
const cache = new Map<StickerName, THREE.CanvasTexture>();

export function getStickerTexture(name: string): THREE.CanvasTexture | null {
  if (!STICKER_NAMES.includes(name as StickerName)) return null;
  const key = name as StickerName;
  if (!cache.has(key)) cache.set(key, creators[key]());
  return cache.get(key)!;
}
