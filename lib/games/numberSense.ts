export type Op = '+' | '-' | '×';
export interface Problem { a: number; b: number; op: Op; correct: number; choices: number[] }

const ops: Op[] = ['+', '-', '×'];

function rnd(n: number) { return Math.floor(Math.random() * n) + 1; }

export function generateProblem(level: number): Problem {
  const range = Math.min(20, 6 + level * 2);
  const op = ops[Math.floor(Math.random() * ops.length)];
  const a = rnd(range);
  const b = rnd(range);
  const correct = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const distractors = new Set<number>();
  while (distractors.size < 2) {
    const d = correct + (Math.random() < 0.5 ? -1 : 1) * (rnd(3) + 1);
    if (d !== correct) distractors.add(d);
  }
  const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
  return { a, b, op, correct, choices };
}

export function scoreAttempt(p: Problem, picked: number) {
  if (picked === p.correct) return { ok: true, points: 10 };
  return { ok: false, points: -2 };
}
