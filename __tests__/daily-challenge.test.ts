import { pickDailyGame } from '@/lib/dailyChallenge';

describe('dailyChallenge', () => {
  it('returns the same game for the same date', () => {
    expect(pickDailyGame('2026-05-15')).toEqual(pickDailyGame('2026-05-15'));
  });
  it('rotates by date', () => {
    const days = ['2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19'];
    const games = new Set(days.map(pickDailyGame));
    expect(games.size).toBeGreaterThan(1);
  });
});
