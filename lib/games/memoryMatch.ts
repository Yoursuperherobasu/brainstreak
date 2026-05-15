export function extendSequence(prev: number[], tiles = 4): number[] {
  return [...prev, Math.floor(Math.random() * tiles)];
}

export function isCorrectSoFar(target: number[], attempt: number[]): boolean {
  for (let i = 0; i < attempt.length; i++) {
    if (attempt[i] !== target[i]) return false;
  }
  return true;
}
