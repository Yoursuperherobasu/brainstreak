import { createInitialState, cycleLane, moveLane, step, distanceMeters, xpForRun, LANES } from '@/lib/games/roadRush';

describe('roadRush', () => {
  it('starts in the middle lane, alive, with no obstacles', () => {
    const s = createInitialState();
    expect(s.carLane).toBe(1);
    expect(s.alive).toBe(true);
    expect(s.obstacles).toHaveLength(0);
  });

  it('cycleLane wraps 0 → 1 → 2 → 0', () => {
    let s = createInitialState();
    expect(s.carLane).toBe(1);
    s = cycleLane(s); expect(s.carLane).toBe(2);
    s = cycleLane(s); expect(s.carLane).toBe(0);
    s = cycleLane(s); expect(s.carLane).toBe(1);
  });

  it('moveLane clamps to 0..LANES-1', () => {
    let s = createInitialState();
    s = moveLane(s, -1); expect(s.carLane).toBe(0);
    s = moveLane(s, -1); expect(s.carLane).toBe(0);
    s = moveLane(s, 1);  expect(s.carLane).toBe(1);
    s = moveLane(s, 1);  expect(s.carLane).toBe(2);
    s = moveLane(s, 1);  expect(s.carLane).toBe(2);
  });

  it('distance grows by 1 each step', () => {
    let s = createInitialState();
    for (let i = 0; i < 10; i++) s = step(s);
    expect(s.distance).toBe(10);
  });

  it('eventually spawns obstacles', () => {
    let s = createInitialState();
    for (let i = 0; i < 100; i++) s = step(s);
    expect(s.obstacles.length).toBeGreaterThan(0);
  });

  it('collision ends the round', () => {
    let s = createInitialState();
    // Place an obstacle in the car's lane already at x near 1.
    s = { ...s, obstacles: [{ id: 9, lane: s.carLane, x: 0.95 }] };
    s = step(s); // advances obstacle by speed; should overlap car at x≈0.962
    expect(s.alive).toBe(false);
  });

  it('xpForRun is non-negative and grows with distance', () => {
    expect(xpForRun(0)).toBe(0);
    expect(xpForRun(500)).toBeGreaterThan(xpForRun(100));
  });

  it('distanceMeters rounds to int', () => {
    expect(Number.isInteger(distanceMeters(33))).toBe(true);
  });

  it(`LANES === ${LANES} (sanity)`, () => {
    expect(LANES).toBeGreaterThanOrEqual(2);
  });
});
