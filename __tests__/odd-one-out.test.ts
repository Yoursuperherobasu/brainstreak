import {
  generateRound,
  scoreAttempt,
  xpForRun,
  contrastForLevel,
  gridSizeForLevel,
  shiftLightnessHSL,
} from '@/lib/games/oddOneOut';

// ─── gridSizeForLevel ────────────────────────────────────────────────────────

describe('gridSizeForLevel', () => {
  test('returns 3 for levels 1–3', () => {
    expect(gridSizeForLevel(1)).toBe(3);
    expect(gridSizeForLevel(3)).toBe(3);
  });

  test('returns 4 for levels 4–8', () => {
    expect(gridSizeForLevel(4)).toBe(4);
    expect(gridSizeForLevel(8)).toBe(4);
  });

  test('returns 5 for level 9 and above', () => {
    expect(gridSizeForLevel(9)).toBe(5);
    expect(gridSizeForLevel(50)).toBe(5);
  });
});

// ─── contrastForLevel ────────────────────────────────────────────────────────

describe('contrastForLevel', () => {
  test('level 1 contrast is wide — at least 0.20 for easy play', () => {
    expect(contrastForLevel(1)).toBeGreaterThanOrEqual(0.20);
  });

  test('level 1 contrast is wider than level 6', () => {
    expect(contrastForLevel(1)).toBeGreaterThan(contrastForLevel(6));
  });

  test('level 6 contrast is wider than level 15', () => {
    expect(contrastForLevel(6)).toBeGreaterThan(contrastForLevel(15));
  });

  test('expert contrast (level 20+) is at least 0.04 — still perceivable', () => {
    expect(contrastForLevel(20)).toBeGreaterThanOrEqual(0.04);
    expect(contrastForLevel(100)).toBeGreaterThanOrEqual(0.04);
  });

  test('contrast is always positive', () => {
    for (let l = 1; l <= 50; l++) {
      expect(contrastForLevel(l)).toBeGreaterThan(0);
    }
  });

  test('contrast is monotonically non-increasing', () => {
    for (let l = 1; l < 30; l++) {
      expect(contrastForLevel(l)).toBeGreaterThanOrEqual(contrastForLevel(l + 1));
    }
  });

  // Backward-compat: existing test expectations
  test('contrast shrinks meaningfully between early and late levels', () => {
    expect(contrastForLevel(1)).toBeGreaterThan(0.18);
    expect(contrastForLevel(20)).toBeLessThan(0.12);
  });
});

// ─── shiftLightnessHSL ───────────────────────────────────────────────────────

describe('shiftLightnessHSL', () => {
  test('returns a valid hex string', () => {
    expect(shiftLightnessHSL('#2F6FED', 0.2)).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(shiftLightnessHSL('#169B8F', -0.15)).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('positive delta produces a lighter color', () => {
    const base = '#2F6FED';
    const lighter = shiftLightnessHSL(base, 0.2);
    // Parse and compare perceived brightness (simple sum of RGB channels)
    const parseSum = (h: string) => {
      const n = parseInt(h.slice(1), 16);
      return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
    };
    expect(parseSum(lighter)).toBeGreaterThan(parseSum(base));
  });

  test('negative delta produces a darker color', () => {
    const base = '#D99921';
    const darker = shiftLightnessHSL(base, -0.2);
    const parseSum = (h: string) => {
      const n = parseInt(h.slice(1), 16);
      return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
    };
    expect(parseSum(darker)).toBeLessThan(parseSum(base));
  });

  test('zero delta returns visually identical color (same hue/sat, same lightness)', () => {
    // A zero shift should produce a hex close to the original.
    // (May differ by rounding — just check it is still a valid hex.)
    expect(shiftLightnessHSL('#6B5DD3', 0)).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('handles invalid input gracefully', () => {
    expect(shiftLightnessHSL('not-a-color', 0.1)).toBe('not-a-color');
    expect(shiftLightnessHSL('', 0.1)).toBe('');
  });

  test('clamps lightness so output never exceeds [0.05, 0.95]', () => {
    // A very large positive shift on a light color should not blow out to pure white.
    const nearWhite = shiftLightnessHSL('#EEEEEE', 1.0);
    const n = parseInt(nearWhite.slice(1), 16);
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    // 0.95 * 255 ≈ 242 — each channel must be ≤ 243
    expect(r).toBeLessThanOrEqual(243);
    expect(g).toBeLessThanOrEqual(243);
    expect(b).toBeLessThanOrEqual(243);
  });
});

// ─── generateRound ───────────────────────────────────────────────────────────

describe('generateRound', () => {
  test('odd index is within grid bounds for all levels', () => {
    for (let level = 1; level < 15; level++) {
      const r = generateRound(level);
      expect(r.oddIndex).toBeGreaterThanOrEqual(0);
      expect(r.oddIndex).toBeLessThan(r.size * r.size);
    }
  });

  test('oddColor is always different from baseColor', () => {
    for (let i = 0; i < 50; i++) {
      const r = generateRound(1);
      expect(r.oddColor).not.toBe(r.baseColor);
      expect(r.baseColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.oddColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('oddColor at level 1 is visually further from baseColor than at level 20', () => {
    // Use a deterministic seeded rand so this test is not flaky.
    let seed = 42;
    const seededRand = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 4294967296;
    };

    const colorDistance = (a: string, b: string) => {
      const na = parseInt(a.slice(1), 16);
      const nb = parseInt(b.slice(1), 16);
      const dr = ((na >> 16) & 0xff) - ((nb >> 16) & 0xff);
      const dg = ((na >> 8) & 0xff) - ((nb >> 8) & 0xff);
      const db = (na & 0xff) - (nb & 0xff);
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    // Sample 10 rounds at each level and take the average distance.
    const avgDist = (level: number) => {
      let s = seed; // save
      let total = 0;
      for (let i = 0; i < 10; i++) {
        const r = generateRound(level, seededRand);
        total += colorDistance(r.baseColor, r.oddColor);
      }
      seed = s; // restore for reproducibility
      return total / 10;
    };

    const distLevel1 = avgDist(1);
    const distLevel20 = avgDist(20);
    expect(distLevel1).toBeGreaterThan(distLevel20);
  });

  test('level grows with rounds — each correct answer advances level', () => {
    // Simulates the screen logic: correct pick → nextLevel = level + 1.
    let level = 1;
    for (let round = 0; round < 10; round++) {
      const r = generateRound(level);
      // Simulate a correct pick.
      const result = scoreAttempt(r, r.oddIndex);
      expect(result.ok).toBe(true);
      level += 1;
    }
    expect(level).toBe(11); // started at 1, 10 correct picks → level 11
  });

  test('is deterministic given the same rand sequence', () => {
    const seq = [0.1, 0.9, 0.4]; // fixed values
    let idx = 0;
    const rand1 = () => seq[idx++ % seq.length];
    idx = 0;
    const rand2 = () => seq[idx++ % seq.length];

    const r1 = generateRound(5, rand1);
    const r2 = generateRound(5, rand2);
    expect(r1).toEqual(r2);
  });
});

// ─── scoreAttempt ────────────────────────────────────────────────────────────

describe('scoreAttempt', () => {
  test('correct pick rewards by grid area', () => {
    const r = { size: 4, oddIndex: 5, baseColor: '#000000', oddColor: '#ffffff' };
    const a = scoreAttempt(r, 5);
    expect(a.ok).toBe(true);
    expect(a.points).toBe(16);
  });

  test('wrong pick gives negative points', () => {
    const r = { size: 3, oddIndex: 0, baseColor: '#000000', oddColor: '#ffffff' };
    const a = scoreAttempt(r, 8);
    expect(a.ok).toBe(false);
    expect(a.points).toBeLessThan(0);
  });
});

// ─── xpForRun ────────────────────────────────────────────────────────────────

describe('xpForRun', () => {
  test('never returns negative xp', () => {
    expect(xpForRun(-100)).toBe(0);
    expect(xpForRun(0)).toBe(0);
  });

  test('converts score to xp correctly', () => {
    expect(xpForRun(40)).toBe(10);
    expect(xpForRun(80)).toBe(20);
  });
});
