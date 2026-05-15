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
// tile is the same hue with a small lightness shift.
const BASE_HUES = [
  '#2F6FED', // blue
  '#169B8F', // teal
  '#D99921', // gold
  '#C75C9E', // pink
  '#6B5DD3', // purple
  '#2B9B62', // green
  '#EF6A3A', // orange
];

// Compute the odd-color shade for a given base + difficulty.
// difficulty: integer ≥ 1. Higher difficulty → smaller contrast.
function shiftLightness(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (amount >= 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const p = 1 + amount;
    r = Math.round(r * p);
    g = Math.round(g * p);
    b = Math.round(b * p);
  }
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Difficulty curve: starts at ±0.32 (very visible), shrinks toward ±0.07
// after ~15 rounds. Stays above 0.05 forever — beyond that humans guess.
export function contrastForLevel(level: number): number {
  const t = Math.min(1, Math.max(0, (level - 1) / 14));
  return 0.32 - t * 0.25; // 0.32 → 0.07
}

// Grid size: 3×3 for first 3 rounds, 4×4 for next, then 5×5 cap.
export function gridSizeForLevel(level: number): number {
  if (level <= 3) return 3;
  if (level <= 8) return 4;
  return 5;
}

export function generateRound(level: number, rand: () => number = Math.random): OddRound {
  const size = gridSizeForLevel(level);
  const base = BASE_HUES[Math.floor(rand() * BASE_HUES.length)];
  const contrast = contrastForLevel(level);
  // Randomly lighten or darken, so the player can't memorize "always lighter".
  const direction = rand() < 0.5 ? -1 : 1;
  const odd = shiftLightness(base, contrast * direction);
  const oddIndex = Math.floor(rand() * (size * size));
  return { size, oddIndex, baseColor: base, oddColor: odd };
}

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
