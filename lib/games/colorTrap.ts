// Color Trap (Stroop) — show a COLOR WORD printed in a possibly-different
// ink color. The player taps "MATCH" if the word and the ink match, or
// "DIFFERENT" if they don't. Trains attention and inhibition.
//
// Pure engine: no React, no timers. Screen owns the round timer.

export type ColorName = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export const COLOR_PALETTE: Record<ColorName, string> = {
  red:    '#E5484D',
  blue:   '#2F6FED',
  green:  '#2B9B62',
  yellow: '#E5B62A',
  purple: '#7B5BD9',
  orange: '#EF6A3A',
};

export const ALL_COLORS: ColorName[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export interface ColorTrapRound {
  word: ColorName;     // the WORD printed on screen
  ink: ColorName;      // the COLOR the word is rendered in
  matches: boolean;    // true if word === ink
}

// Generate a round. `matchBias` is 0..1 — chance the next round is a
// match. We bias toward ~45% matches so the game stays interesting
// (a pure 50/50 still feels random; a tiny bias toward mismatches
// makes the player work harder).
export function generateRound(rand: () => number = Math.random, matchBias = 0.45): ColorTrapRound {
  const wordIdx = Math.floor(rand() * ALL_COLORS.length);
  const word = ALL_COLORS[wordIdx];
  const matches = rand() < matchBias;
  let ink: ColorName;
  if (matches) {
    ink = word;
  } else {
    // Pick any OTHER color.
    let inkIdx = Math.floor(rand() * (ALL_COLORS.length - 1));
    if (inkIdx >= wordIdx) inkIdx++;
    ink = ALL_COLORS[inkIdx];
  }
  return { word, ink, matches };
}

export interface AttemptResult {
  ok: boolean;
  points: number; // can be negative for wrong answers
}

// Player tapped "MATCH" or "DIFFERENT". Returns +10 for correct,
// -5 for wrong (so playing recklessly hurts).
export function scoreAttempt(round: ColorTrapRound, pickedMatch: boolean): AttemptResult {
  const ok = pickedMatch === round.matches;
  return { ok, points: ok ? 10 : -5 };
}

// XP scales linearly with score, never negative.
export function xpForRun(score: number): number {
  return Math.max(0, Math.floor(score / 3));
}
