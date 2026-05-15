import { generateAnagramRound, scoreAnagramAttempt, type AnagramRound } from '@/lib/games/wordSprint';

describe('wordSprint', () => {
  it('generates a 5-letter scrambled set and a list of valid words', () => {
    const round = generateAnagramRound({ minLetters: 5, maxLetters: 5, level: 1 });
    expect(round.letters).toHaveLength(5);
    expect(round.validWords.length).toBeGreaterThan(0);
    round.validWords.forEach((w) => expect(w.length).toBeLessThanOrEqual(5));
  });

  it('accepts a valid word and rejects an invalid one', () => {
    const round: AnagramRound = { letters: ['c','a','r','e','s'], validWords: ['care','cars','race','races','scare'] };
    expect(scoreAnagramAttempt(round, 'care')).toEqual({ ok: true, points: 4 * 10 });
    expect(scoreAnagramAttempt(round, 'races')).toEqual({ ok: true, points: 5 * 10 });
    expect(scoreAnagramAttempt(round, 'xyz')).toEqual({ ok: false, points: 0 });
  });

  it('does not award points twice for the same word', () => {
    const round: AnagramRound = { letters: ['a','b','c'], validWords: ['cab'] };
    expect(scoreAnagramAttempt(round, 'cab', new Set()).ok).toBe(true);
    expect(scoreAnagramAttempt(round, 'cab', new Set(['cab'])).ok).toBe(false);
  });
});
