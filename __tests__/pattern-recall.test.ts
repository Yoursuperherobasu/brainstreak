import {
  generateSequence,
  isCorrectSoFar,
  scoreForRound,
  xpForRun,
  paletteSizeForRound,
  sequenceLengthForRound,
  SHAPE_POOL,
} from '@/lib/games/patternRecall';

describe('patternRecall', () => {
  test('palette grows with round, capped at 6', () => {
    expect(paletteSizeForRound(1)).toBe(4);
    expect(paletteSizeForRound(4)).toBe(4);
    expect(paletteSizeForRound(5)).toBe(6);
    expect(paletteSizeForRound(100)).toBe(6);
  });

  test('sequence length grows with round, capped at 8', () => {
    expect(sequenceLengthForRound(1)).toBe(2);
    expect(sequenceLengthForRound(4)).toBe(4);
    expect(sequenceLengthForRound(100)).toBe(8);
  });

  test('generateSequence: length matches sequenceLengthForRound', () => {
    for (let r = 1; r < 12; r++) {
      const s = generateSequence(r);
      expect(s.length).toBe(sequenceLengthForRound(r));
      for (const shape of s) {
        expect(SHAPE_POOL.slice(0, paletteSizeForRound(r))).toContain(shape);
      }
    }
  });

  test('isCorrectSoFar: partial match returns true', () => {
    const target = ['square', 'circle', 'triangle'] as const;
    expect(isCorrectSoFar([...target], ['square'])).toBe(true);
    expect(isCorrectSoFar([...target], ['square', 'circle'])).toBe(true);
    expect(isCorrectSoFar([...target], ['square', 'star'])).toBe(false);
  });

  test('isCorrectSoFar: too-long attempt fails', () => {
    const target = ['square'] as const;
    expect(isCorrectSoFar([...target], ['square', 'circle'])).toBe(false);
  });

  test('isCorrectSoFar: empty attempt is trivially correct', () => {
    expect(isCorrectSoFar(['circle'], [])).toBe(true);
  });

  test('scoreForRound is positive and grows with round', () => {
    expect(scoreForRound(1)).toBeGreaterThan(0);
    expect(scoreForRound(10)).toBeGreaterThan(scoreForRound(1));
  });

  test('xpForRun never negative', () => {
    expect(xpForRun(-50)).toBe(0);
    expect(xpForRun(50)).toBe(10);
  });
});
