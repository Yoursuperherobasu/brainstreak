import { spawnTarget, windowMs } from '@/lib/games/reactionTap';
describe('reactionTap', () => {
  it('shrinks the tap window as score rises', () => {
    expect(windowMs(0)).toBeGreaterThan(windowMs(20));
    expect(windowMs(20)).toBeGreaterThanOrEqual(350);
  });
  it('spawns within a unit box', () => {
    const t = spawnTarget();
    expect(t.x).toBeGreaterThanOrEqual(0);
    expect(t.x).toBeLessThanOrEqual(1);
    expect(t.y).toBeGreaterThanOrEqual(0);
    expect(t.y).toBeLessThanOrEqual(1);
  });
});
