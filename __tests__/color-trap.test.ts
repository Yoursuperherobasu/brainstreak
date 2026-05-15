import {
  generateRound,
  scoreAttempt,
  xpForRun,
  ALL_COLORS,
  COLOR_PALETTE,
} from '@/lib/games/colorTrap';

describe('colorTrap', () => {
  test('ALL_COLORS has expected palette length', () => {
    expect(ALL_COLORS.length).toBe(6);
    for (const c of ALL_COLORS) {
      expect(COLOR_PALETTE[c]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('generateRound: when matches=true, word === ink', () => {
    // Force matchBias=1 → guaranteed match.
    for (let i = 0; i < 50; i++) {
      const r = generateRound(Math.random, 1);
      expect(r.word).toBe(r.ink);
      expect(r.matches).toBe(true);
    }
  });

  test('generateRound: when matchBias=0, word !== ink', () => {
    for (let i = 0; i < 50; i++) {
      const r = generateRound(Math.random, 0);
      expect(r.word).not.toBe(r.ink);
      expect(r.matches).toBe(false);
    }
  });

  test('scoreAttempt: correct pick gives positive points', () => {
    const r = { word: 'red' as const, ink: 'red' as const, matches: true };
    const a = scoreAttempt(r, true);
    expect(a.ok).toBe(true);
    expect(a.points).toBeGreaterThan(0);
  });

  test('scoreAttempt: wrong pick gives negative points', () => {
    const r = { word: 'red' as const, ink: 'blue' as const, matches: false };
    const a = scoreAttempt(r, true);
    expect(a.ok).toBe(false);
    expect(a.points).toBeLessThan(0);
  });

  test('xpForRun: never negative', () => {
    expect(xpForRun(-50)).toBe(0);
    expect(xpForRun(0)).toBe(0);
    expect(xpForRun(30)).toBe(10);
  });

  test('generateRound returns a known palette color', () => {
    const r = generateRound();
    expect(ALL_COLORS).toContain(r.word);
    expect(ALL_COLORS).toContain(r.ink);
  });
});
