import { computeStreakAfterGame, isStreakAtRisk, todayISO, yesterdayISO, StreakData } from '@/lib/storage';

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

describe('isStreakAtRisk', () => {
  test('zero streak is never at risk', () => {
    expect(isStreakAtRisk({ current: 0, longest: 0, lastPlayDate: null }, TODAY, YESTERDAY)).toBe(false);
  });

  test('played today is not at risk', () => {
    expect(isStreakAtRisk({ current: 5, longest: 5, lastPlayDate: TODAY }, TODAY, YESTERDAY)).toBe(false);
  });

  test('played yesterday but not today → at risk (ember)', () => {
    expect(isStreakAtRisk({ current: 5, longest: 5, lastPlayDate: YESTERDAY }, TODAY, YESTERDAY)).toBe(true);
  });

  test('played 2+ days ago → already broken, not at risk', () => {
    expect(isStreakAtRisk({ current: 5, longest: 5, lastPlayDate: TWO_DAYS_AGO }, TODAY, YESTERDAY)).toBe(false);
  });
});

// A2 fix: todayISO / yesterdayISO use local time components, not UTC.
describe('local date helpers (A2 timezone fix)', () => {
  test('todayISO returns local Y-M-D for an explicit date', () => {
    const d = new Date(2026, 4, 9, 23, 30, 0); // 2026-05-09 23:30 local
    expect(todayISO(d)).toBe('2026-05-09');
  });

  test('yesterdayISO returns the local date one day before', () => {
    const d = new Date(2026, 4, 9, 0, 30, 0); // 2026-05-09 00:30 local
    expect(yesterdayISO(d)).toBe('2026-05-08');
  });

  test('month rollover at end-of-month works in local time', () => {
    const d = new Date(2026, 4, 1, 0, 30, 0); // 2026-05-01 00:30 local
    expect(yesterdayISO(d)).toBe('2026-04-30');
  });

  test('a 9:30 PM local play and a 8 AM local next-day play resolve to different ISO dates', () => {
    const tueEvening = new Date(2026, 4, 12, 21, 30, 0);
    const wedMorning = new Date(2026, 4, 13, 8, 0, 0);
    expect(todayISO(tueEvening)).toBe('2026-05-12');
    expect(todayISO(wedMorning)).toBe('2026-05-13');
    // Wed-from-Tue evening boundary verifies the bug from A2 is gone:
    // pre-fix toISOString().split('T')[0] would have produced '2026-05-13' for tueEvening
    // (UTC roll-over) when the user is in PST.
  });
});
