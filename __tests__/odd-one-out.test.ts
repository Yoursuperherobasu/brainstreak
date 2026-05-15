import {
  generateRound,
  scoreAttempt,
  xpForRun,
  contrastForLevel,
  gridSizeForLevel,
} from '@/lib/games/oddOneOut';

describe('oddOneOut', () => {
  test('grid size scales with level', () => {
    expect(gridSizeForLevel(1)).toBe(3);
    expect(gridSizeForLevel(3)).toBe(3);
    expect(gridSizeForLevel(4)).toBe(4);
    expect(gridSizeForLevel(8)).toBe(4);
    expect(gridSizeForLevel(9)).toBe(5);
    expect(gridSizeForLevel(50)).toBe(5);
  });

  test('contrast shrinks with level but stays positive', () => {
    expect(contrastForLevel(1)).toBeGreaterThan(0.3);
    expect(contrastForLevel(20)).toBeLessThan(0.1);
    expect(contrastForLevel(100)).toBeGreaterThan(0);
  });

  test('generateRound: odd index is within grid', () => {
    for (let level = 1; level < 15; level++) {
      const r = generateRound(level);
      expect(r.oddIndex).toBeGreaterThanOrEqual(0);
      expect(r.oddIndex).toBeLessThan(r.size * r.size);
    }
  });

  test('generateRound: oddColor !== baseColor', () => {
    for (let i = 0; i < 30; i++) {
      const r = generateRound(1);
      expect(r.oddColor).not.toBe(r.baseColor);
      expect(r.baseColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.oddColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('scoreAttempt: correct pick rewards by grid area', () => {
    const r = { size: 4, oddIndex: 5, baseColor: '#000', oddColor: '#fff' };
    const a = scoreAttempt(r, 5);
    expect(a.ok).toBe(true);
    expect(a.points).toBe(16);
  });

  test('scoreAttempt: wrong pick gives negative points', () => {
    const r = { size: 3, oddIndex: 0, baseColor: '#000', oddColor: '#fff' };
    const a = scoreAttempt(r, 8);
    expect(a.ok).toBe(false);
    expect(a.points).toBeLessThan(0);
  });

  test('xpForRun: never negative', () => {
    expect(xpForRun(-100)).toBe(0);
    expect(xpForRun(40)).toBe(10);
  });
});
