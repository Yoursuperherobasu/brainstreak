import { computeNextReminder } from '@/lib/notification-time';

function makeNow(year: number, monthIndex: number, day: number, hours: number, minutes: number) {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0);
}

describe('computeNextReminder', () => {
  test('today slot is in the future and user has not played → fire today', () => {
    const now = makeNow(2026, 4, 9, 10, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: null,
    });
    expect(result.skippedToday).toBe(false);
    expect(result.fireAt.getFullYear()).toBe(2026);
    expect(result.fireAt.getMonth()).toBe(4);
    expect(result.fireAt.getDate()).toBe(9);
    expect(result.fireAt.getHours()).toBe(19);
    expect(result.fireAt.getMinutes()).toBe(0);
  });

  test('today slot has already passed → fire tomorrow at the same time', () => {
    const now = makeNow(2026, 4, 9, 21, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: null,
    });
    expect(result.skippedToday).toBe(false);
    expect(result.fireAt.getDate()).toBe(10);
    expect(result.fireAt.getHours()).toBe(19);
  });

  test('user already played today → skip and fire tomorrow', () => {
    const now = makeNow(2026, 4, 9, 10, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: '2026-05-09',
    });
    expect(result.skippedToday).toBe(true);
    expect(result.fireAt.getDate()).toBe(10);
    expect(result.fireAt.getHours()).toBe(19);
  });

  test('user played yesterday and today slot is upcoming → fire today', () => {
    const now = makeNow(2026, 4, 9, 10, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: '2026-05-08',
    });
    expect(result.skippedToday).toBe(false);
    expect(result.fireAt.getDate()).toBe(9);
  });

  test('respects custom reminder time', () => {
    const now = makeNow(2026, 4, 9, 6, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '08:30',
      lastPlayDate: null,
    });
    expect(result.fireAt.getHours()).toBe(8);
    expect(result.fireAt.getMinutes()).toBe(30);
  });

  test('clamps invalid HH:MM safely (clamps to 23:59)', () => {
    const now = makeNow(2026, 4, 9, 10, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '99:99',
      lastPlayDate: null,
    });
    expect(result.fireAt.getHours()).toBe(23);
    expect(result.fireAt.getMinutes()).toBe(59);
  });

  test('month rollover when slot crosses end-of-month', () => {
    const now = makeNow(2026, 4, 31, 21, 0);
    const result = computeNextReminder({
      now,
      reminderHHMM: '19:00',
      lastPlayDate: null,
    });
    expect(result.fireAt.getMonth()).toBe(5);
    expect(result.fireAt.getDate()).toBe(1);
  });
});
