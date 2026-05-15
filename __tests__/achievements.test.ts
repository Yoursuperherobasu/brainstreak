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
