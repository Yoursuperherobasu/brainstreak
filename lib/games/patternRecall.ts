// Pattern Recall — show a SHORT sequence of shapes (square, circle,
// triangle, star), the player reproduces it by tapping shapes from a
// palette. Like Memory Match but with shape *variety* instead of just
// flashing colored tiles. Sequences get longer each round.
//
// Pure engine: no React, no timers.

export type ShapeId = 'square' | 'circle' | 'triangle' | 'star' | 'diamond' | 'heart';

export const SHAPE_POOL: ShapeId[] = ['square', 'circle', 'triangle', 'star', 'diamond', 'heart'];

// How many shapes are in the palette at a given round? Starts at 4,
// grows to 6 from round 5+. Caps at 6 — beyond that it's pure memory grind.
export function paletteSizeForRound(round: number): number {
  if (round <= 4) return 4;
  return 6;
}

// Sequence length grows with round: 2, 3, 3, 4, 4, 5, 5, 6, …
export function sequenceLengthForRound(round: number): number {
  return Math.min(8, 2 + Math.floor((round - 1) / 1.5));
}

export function generateSequence(round: number, rand: () => number = Math.random): ShapeId[] {
  const palette = SHAPE_POOL.slice(0, paletteSizeForRound(round));
  const len = sequenceLengthForRound(round);
  const seq: ShapeId[] = [];
  for (let i = 0; i < len; i++) {
    seq.push(palette[Math.floor(rand() * palette.length)]);
  }
  return seq;
}

// Validate that an in-progress attempt matches the target so far.
// Used by the screen to short-circuit on the first wrong tap.
export function isCorrectSoFar(target: ShapeId[], attempt: ShapeId[]): boolean {
  if (attempt.length > target.length) return false;
  for (let i = 0; i < attempt.length; i++) {
    if (attempt[i] !== target[i]) return false;
  }
  return true;
}

// Score per completed round: 10 × sequence length × (palette/4 boost).
export function scoreForRound(round: number): number {
  const len = sequenceLengthForRound(round);
  const palette = paletteSizeForRound(round);
  return Math.round(10 * len * (palette / 4));
}

export function xpForRun(totalScore: number): number {
  return Math.max(0, Math.floor(totalScore / 5));
}
