import { ACHIEVEMENTS, evaluate } from '@/lib/achievements';

describe('achievements', () => {
  it('exposes a non-empty catalog with unique ids', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(5);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it('unlocks "first-round" after the first game', () => {
    const out = evaluate({
      profile: { totalXP: 10, level: 1, gamesPlayed: 1, username: 'x' },
      streak: { current: 1, longest: 1, lastPlayDate: '2026-05-15' },
      recent: [],
    });
    expect(out).toContain('first-round');
  });
  it('unlocks "week-streak" at 7-day streak', () => {
    const out = evaluate({
      profile: { totalXP: 100, level: 2, gamesPlayed: 7, username: 'x' },
      streak: { current: 7, longest: 7, lastPlayDate: '2026-05-15' },
      recent: [],
    });
    expect(out).toContain('week-streak');
  });
});

describe('achievements catalog additions', () => {
  it('unlocks "streak-3" at a 3-day streak', () => {
    const out = evaluate({
      profile: { username: 'x', totalXP: 30, level: 1, gamesPlayed: 3 },
      streak: { current: 3, longest: 3, lastPlayDate: '2026-05-15' },
      recent: [],
    });
    expect(out).toContain('streak-3');
  });
  it('unlocks "xp-100" at 100 XP', () => {
    const out = evaluate({
      profile: { username: 'x', totalXP: 100, level: 2, gamesPlayed: 4 },
      streak: { current: 1, longest: 1, lastPlayDate: '2026-05-15' },
      recent: [],
    });
    expect(out).toContain('xp-100');
  });
  it('unlocks "xp-500" at 500 XP', () => {
    const out = evaluate({
      profile: { username: 'x', totalXP: 500, level: 3, gamesPlayed: 20 },
      streak: { current: 1, longest: 5, lastPlayDate: '2026-05-15' },
      recent: [],
    });
    expect(out).toContain('xp-500');
  });
});
