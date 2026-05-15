import { extendSequence, isCorrectSoFar } from '@/lib/games/memoryMatch';

describe('memoryMatch', () => {
  it('extends a sequence by one each round', () => {
    expect(extendSequence([]).length).toBe(1);
    expect(extendSequence([0, 1, 2]).length).toBe(4);
  });
  it('verifies prefix matches', () => {
    expect(isCorrectSoFar([0, 1, 2, 3], [0, 1])).toBe(true);
    expect(isCorrectSoFar([0, 1, 2, 3], [0, 2])).toBe(false);
  });
});
