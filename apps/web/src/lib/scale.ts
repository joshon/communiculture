// Desktop: scale by viewport width (1440px reference)
export const S = (px: number) => `${((px / 1440) * 100).toFixed(3)}vw`;
// Mobile: scale by viewport height (844px reference — iPhone 12 Pro)
export const H = (px: number) => `${((px / 844) * 100).toFixed(3)}svh`;

// Unified: scales by whichever axis is more constrained (set by ScaleProvider).
// Baseline: 1440×900. Falls back to 1 (= 1px per unit) when --scale is unset.
export const U = (px: number) => `calc(var(--scale, 1) * ${px}px)`;
