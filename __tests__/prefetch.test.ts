import { shouldPrefetch } from '@/lib/prefetch';

describe('shouldPrefetch', () => {
  test('does not prefetch before reaching the trigger index', () => {
    expect(shouldPrefetch({ currentIndex: 0, totalQuestions: 5, alreadyPrefetched: false })).toBe(false);
    expect(shouldPrefetch({ currentIndex: 1, totalQuestions: 5, alreadyPrefetched: false })).toBe(false);
  });

  test('prefetches at and after the default trigger (floor(total/2))', () => {
    expect(shouldPrefetch({ currentIndex: 2, totalQuestions: 5, alreadyPrefetched: false })).toBe(true);
    expect(shouldPrefetch({ currentIndex: 4, totalQuestions: 5, alreadyPrefetched: false })).toBe(true);
  });

  test('does not prefetch when already prefetched', () => {
    expect(shouldPrefetch({ currentIndex: 4, totalQuestions: 5, alreadyPrefetched: true })).toBe(false);
  });

  test('honors custom trigger index', () => {
    expect(shouldPrefetch({ currentIndex: 2, totalQuestions: 5, alreadyPrefetched: false, triggerAtIndex: 4 })).toBe(false);
    expect(shouldPrefetch({ currentIndex: 4, totalQuestions: 5, alreadyPrefetched: false, triggerAtIndex: 4 })).toBe(true);
  });
});
