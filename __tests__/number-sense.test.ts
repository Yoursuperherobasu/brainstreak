import { generateProblem, scoreAttempt } from '@/lib/games/numberSense';

describe('numberSense', () => {
  it('generates a problem with 3 unique choices, one correct', () => {
    const p = generateProblem(1);
    expect(p.choices).toHaveLength(3);
    expect(new Set(p.choices).size).toBe(3);
    expect(p.choices).toContain(p.correct);
  });
  it('scores correct vs incorrect', () => {
    const p = { a: 3, b: 4, op: '+' as const, correct: 7, choices: [7, 6, 8] };
    expect(scoreAttempt(p, 7)).toEqual({ ok: true, points: 10 });
    expect(scoreAttempt(p, 6)).toEqual({ ok: false, points: -2 });
  });
});
