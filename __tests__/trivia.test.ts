import {
  calculatePoints,
  calculateXP,
  getLevelFromXP,
  getXPForNextLevel,
} from '@/lib/trivia';

describe('calculatePoints', () => {
  test('wrong answer returns 0', () => {
    expect(calculatePoints(false, 'easy', 5)).toBe(0);
    expect(calculatePoints(false, 'hard', 0)).toBe(0);
  });

  test('easy + instant answer = base 100 + max bonus 50 = 150', () => {
    expect(calculatePoints(true, 'easy', 0)).toBe(150);
  });

  test('easy + no time left = base only (100)', () => {
    expect(calculatePoints(true, 'easy', 15)).toBe(100);
  });

  test('medium + instant = 150 + 75 = 225', () => {
    expect(calculatePoints(true, 'medium', 0)).toBe(225);
  });

  test('hard + instant = 250 + 125 = 375', () => {
    expect(calculatePoints(true, 'hard', 0)).toBe(375);
  });

  test('half-time bonus is between base and max', () => {
    const half = calculatePoints(true, 'easy', 7, 15);
    expect(half).toBeGreaterThan(100);
    expect(half).toBeLessThan(150);
  });

  test('unknown difficulty falls back to medium base (150)', () => {
    expect(calculatePoints(true, 'impossible' as any, 15)).toBe(150);
  });

  test('overshoot timeTaken (>limit) does not produce negative bonus', () => {
    expect(calculatePoints(true, 'easy', 30, 15)).toBe(100);
  });
});

describe('calculateXP', () => {
  test('zero score = 0 XP regardless of streak', () => {
    expect(calculateXP(0, 0)).toBe(0);
    expect(calculateXP(0, 50)).toBe(0);
  });

  test('streak 0 multiplier = 1x', () => {
    expect(calculateXP(500, 0)).toBe(50);
    expect(calculateXP(1000, 0)).toBe(100);
  });

  test('streak 5 multiplier = 1.5x', () => {
    expect(calculateXP(500, 5)).toBe(75);
  });

  test('streak 10 multiplier hits the 2x cap', () => {
    expect(calculateXP(500, 10)).toBe(100);
  });

  test('streak 20 still capped at 2x', () => {
    expect(calculateXP(500, 20)).toBe(100);
  });
});

describe('getLevelFromXP', () => {
  test('level is always at least 1', () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(-100)).toBe(1);
  });

  test('XP 50 hits level 2', () => {
    expect(getLevelFromXP(50)).toBe(2);
  });

  test('XP 200 hits level 3', () => {
    expect(getLevelFromXP(200)).toBe(3);
  });

  test('XP 800 hits level 5', () => {
    expect(getLevelFromXP(800)).toBe(5);
  });
});

describe('getXPForNextLevel', () => {
  test('level 1 → 50 XP', () => {
    expect(getXPForNextLevel(1)).toBe(50);
  });

  test('level 2 → 200 XP', () => {
    expect(getXPForNextLevel(2)).toBe(200);
  });

  test('level 3 → 450 XP', () => {
    expect(getXPForNextLevel(3)).toBe(450);
  });
});
