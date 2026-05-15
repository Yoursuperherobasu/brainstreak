export interface Target { x: number; y: number }
export function spawnTarget(): Target {
  return { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8 };
}
export function windowMs(score: number): number {
  // 1000ms at score 0, shrinks ~30ms per point, floor at 350.
  return Math.max(350, 1000 - score * 30);
}
