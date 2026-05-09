import { generateMath, generateEnglish, generateGK, generateBrainRush } from '@/lib/quiz-bank';

describe('generateMath', () => {
  test('produces a question with 4 distinct numeric answers', () => {
    const q = generateMath(1);
    expect(q.category).toBe('Math');
    expect(q.answers.length).toBe(4);
    expect(new Set(q.answers).size).toBe(4);
    expect(q.answers).toContain(q.correct_answer);
  });

  test('answer is the correct arithmetic result', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateMath(1);
      const m = q.question.match(/^(-?\d+) ([+\-×÷]) (-?\d+) = \?$/);
      expect(m).toBeTruthy();
      const [, a, op, b] = m!;
      const A = parseInt(a, 10), B = parseInt(b, 10);
      const expected =
        op === '+' ? A + B :
        op === '-' ? A - B :
        op === '×' ? A * B :
                     A / B;
      expect(parseFloat(q.correct_answer)).toBe(expected);
    }
  });

  test('higher levels produce harder difficulty', () => {
    expect(generateMath(1).difficulty).toBe('easy');
    expect(generateMath(4).difficulty).toBe('hard');
  });
});

describe('generateEnglish', () => {
  test('produces a multiple-choice question with 4 distinct answers', () => {
    const q = generateEnglish(1);
    expect(q.category).toBe('English');
    expect(q.answers.length).toBe(4);
    expect(new Set(q.answers).size).toBe(4);
    expect(q.answers).toContain(q.correct_answer);
  });

  test('level 1 picks easy items', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateEnglish(1).difficulty).toBe('easy');
    }
  });

  test('level 5 picks hard items', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateEnglish(5).difficulty).toBe('hard');
    }
  });
});

describe('generateGK', () => {
  test('produces a multiple-choice question with 4 distinct answers', () => {
    const q = generateGK(1);
    expect(q.category).toBe('GK');
    expect(q.answers.length).toBe(4);
    expect(new Set(q.answers).size).toBe(4);
    expect(q.answers).toContain(q.correct_answer);
  });
});

describe('generateBrainRush', () => {
  test('returns the requested count', () => {
    expect(generateBrainRush(5, 1)).toHaveLength(5);
    expect(generateBrainRush(9, 2)).toHaveLength(9);
  });

  test('cycles through math → english → gk', () => {
    const qs = generateBrainRush(6, 1);
    expect(qs[0].category).toBe('Math');
    expect(qs[1].category).toBe('English');
    expect(qs[2].category).toBe('GK');
    expect(qs[3].category).toBe('Math');
    expect(qs[4].category).toBe('English');
    expect(qs[5].category).toBe('GK');
  });

  test('every question has 4 unique answers including the correct one', () => {
    const qs = generateBrainRush(15, 3);
    for (const q of qs) {
      expect(q.answers.length).toBe(4);
      expect(new Set(q.answers).size).toBe(4);
      expect(q.answers).toContain(q.correct_answer);
    }
  });
});
