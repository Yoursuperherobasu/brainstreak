// Odd One Out — show a grid of tiles; one of them has a slightly different
// shade (or shape). Player taps the odd one. Difficulty ramps by shrinking
// the contrast between the odd tile and the rest.
//
// Pure engine: no React, no timers.

export interface OddRound {
  size: number;           // grid side length (e.g. 3 → 3×3)
  oddIndex: number;       // 0..(size*size - 1)
  baseColor: string;      // common color
  oddColor: string;       // odd tile color (slightly off baseColor)
}

// Pleasant palette of base hues. The grid swatch is one of these, the odd
// tile is the same hue with a small HSL-lightness shift.
const BASE_HUES = [
  '#2F6FED', // blue
  '#169B8F', // teal
  '#D99921', // gold
  '#C75C9E', // pink
  '#6B5DD3', // purple
  '#2B9B62', // green
  '#EF6A3A', // orange
];

// ─── HSL helpers ────────────────────────────────────────────────────────────

/** Parse a 6-digit hex string into [r, g, b] in [0, 1]. */
function hexToRgb01(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff].map((c) => c / 255) as [
    number,
    number,
    number,
  ];
}

/** Convert [r, g, b] in [0, 1] to [h (0–360), s (0–1), l (0–1)]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l]; // achromatic
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** Convert [h (0–360), s (0–1), l (0–1)] to a 6-digit hex string. */
function hslToHex(h: number, s: number, l: number): string {
  l = Math.max(0, Math.min(1, l));
  s = Math.max(0, Math.min(1, s));
  if (s === 0) {
    const v = Math.round(l * 255);
    const hex = v.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  const r = Math.round(hue2rgb(p, q, hn + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hn) * 255);
  const b = Math.round(hue2rgb(p, q, hn - 1 / 3) * 255);
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Shift a hex color's HSL lightness by `delta` (fraction of the 0–1 range).
 * Positive delta → lighter; negative → darker. Clamps to [0.05, 0.95].
 * This is perceptually uniform compared with the old RGB lerp approach.
 */
export function shiftLightnessHSL(hex: string, delta: number): string {
  const rgb = hexToRgb01(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(...rgb);
  // Clamp so we don't go pitch-black or blown-out white.
  const newL = Math.max(0.05, Math.min(0.95, l + delta));
  return hslToHex(h, s, newL);
}

// ─── Contrast curve ──────────────────────────────────────────────────────────

/**
 * Returns the HSL lightness delta (0–1 scale) for a given game level.
 *
 * Level 1–5  : 0.20–0.22  (very easy — imposter is obvious)
 * Level 6–10 : ~0.12–0.14 (moderate)
 * Level 11–15: ~0.07–0.08 (hard)
 * Level 16+  : ~0.04      (expert — just barely discernible)
 *
 * Two-segment linear interpolation keeps the early game approachable while
 * still offering a real challenge at high levels.
 */
export function contrastForLevel(level: number): number {
  if (level <= 1) return 0.22;
  if (level <= 5) {
    // 0.22 → 0.14 over levels 1–5
    const t = (level - 1) / 4;
    return 0.22 - t * 0.08;
  }
  if (level <= 15) {
    // 0.14 → 0.06 over levels 5–15
    const t = (level - 5) / 10;
    return 0.14 - t * 0.08;
  }
  // Level 16+: ramp down to 0.04 floor (expert — humans can still perceive this)
  const t = Math.min(1, (level - 15) / 10);
  return Math.max(0.04, 0.06 - t * 0.02);
}

// ─── Grid size ───────────────────────────────────────────────────────────────

// Grid size: 3×3 for first 3 rounds, 4×4 for next, then 5×5 cap.
export function gridSizeForLevel(level: number): number {
  if (level <= 3) return 3;
  if (level <= 8) return 4;
  return 5;
}

// ─── Round generation ────────────────────────────────────────────────────────

export function generateRound(level: number, rand: () => number = Math.random): OddRound {
  const size = gridSizeForLevel(level);
  const base = BASE_HUES[Math.floor(rand() * BASE_HUES.length)];
  const contrast = contrastForLevel(level);
  // Randomly lighten or darken, so the player can't memorize "always lighter".
  const direction = rand() < 0.5 ? -1 : 1;
  const odd = shiftLightnessHSL(base, contrast * direction);
  const oddIndex = Math.floor(rand() * (size * size));
  return { size, oddIndex, baseColor: base, oddColor: odd };
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface AttemptResult {
  ok: boolean;
  points: number;
}

// Score: +10 if correct (scales by grid size — bigger grid = more points).
// -3 for a wrong pick (keep it small; misclicks shouldn't tank the run).
export function scoreAttempt(round: OddRound, picked: number): AttemptResult {
  const ok = picked === round.oddIndex;
  if (ok) {
    return { ok: true, points: round.size * round.size };
  }
  return { ok: false, points: -3 };
}

export function xpForRun(score: number): number {
  return Math.max(0, Math.floor(score / 4));
}
