import { computeStreakAfterGame, StreakData } from '@/lib/storage';

const TODAY = '2026-05-09';
const YESTERDAY = '2026-05-08';
const TWO_DAYS_AGO = '2026-05-07';

describe('computeStreakAfterGame', () => {
  test('first play ever → streak = 1, longest = 1', () => {
    const prev: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(1);
    expect(next.longest).toBe(1);
    expect(next.lastPlayDate).toBe(TODAY);
  });

  test('consecutive day → streak increments', () => {
    const prev: StreakData = { current: 1, longest: 1, lastPlayDate: YESTERDAY };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(2);
    expect(next.longest).toBe(2);
  });

  test('same-day re-play → no change to current streak', () => {
    const prev: StreakData = { current: 5, longest: 5, lastPlayDate: TODAY };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(5);
    expect(next.longest).toBe(5);
  });

  test('gap of 2+ days → streak resets to 1', () => {
    const prev: StreakData = { current: 10, longest: 10, lastPlayDate: TWO_DAYS_AGO };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(1);
    expect(next.longest).toBe(10);
  });

  test('historical longest is preserved through resets', () => {
    const prev: StreakData = { current: 3, longest: 30, lastPlayDate: '2026-04-01' };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(1);
    expect(next.longest).toBe(30);
  });

  test('new streak surpasses old longest → longest updates', () => {
    const prev: StreakData = { current: 9, longest: 9, lastPlayDate: YESTERDAY };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.current).toBe(10);
    expect(next.longest).toBe(10);
  });

  test('lastPlayDate always set to today', () => {
    const prev: StreakData = { current: 0, longest: 0, lastPlayDate: null };
    const next = computeStreakAfterGame(prev, TODAY, YESTERDAY);
    expect(next.lastPlayDate).toBe(TODAY);
  });
});
