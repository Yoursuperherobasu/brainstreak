// Road Rush — flappy-bird-style car-on-racetrack engine.
//
// The car sits in one of 3 lanes. Each tap moves it to the next lane in
// a cycle (or up/down depending on input). Obstacles spawn on lanes and
// scroll from the right edge toward the car. A collision ends the round.
//
// Score = distance survived (frames passed since start).
// Difficulty curve: speed and spawn frequency scale with score.

export const LANES = 3;
export const CAR_WIDTH_PCT = 0.18;   // car width as fraction of field width
export const OBSTACLE_WIDTH_PCT = 0.2;

export interface Obstacle {
  id: number;
  lane: number;   // 0..LANES-1
  x: number;      // 0..1 (right edge of field = 0, left = 1 by convention here we use 0..1 from left)
}

export interface RoadState {
  carLane: number;        // 0..LANES-1
  obstacles: Obstacle[];
  distance: number;       // frames survived
  speed: number;          // dx per frame (0..1 range, in field-widths/frame)
  nextSpawnFrame: number;
  nextId: number;
  alive: boolean;
}

export function createInitialState(): RoadState {
  return {
    carLane: 1, // middle lane
    obstacles: [],
    distance: 0,
    speed: 0.012,
    nextSpawnFrame: 30,
    nextId: 1,
    alive: true,
  };
}

// Tap input: switch to the next lane (0 -> 1 -> 2 -> 0). Could be swipe up/down
// later, but a single-tap cycle keeps the control simple like flappy bird.
export function cycleLane(state: RoadState): RoadState {
  if (!state.alive) return state;
  return { ...state, carLane: (state.carLane + 1) % LANES };
}

// Optional: directional input (up/down) for swipe gestures.
export function moveLane(state: RoadState, delta: -1 | 1): RoadState {
  if (!state.alive) return state;
  return { ...state, carLane: Math.max(0, Math.min(LANES - 1, state.carLane + delta)) };
}

// Spawn an obstacle on a random lane that's NOT the lane immediately
// behind another recent obstacle — avoids unfair pile-ups.
function spawnLane(state: RoadState): number {
  const farRight = state.obstacles.filter((o) => o.x < 0.25).map((o) => o.lane);
  let lane = Math.floor(Math.random() * LANES);
  let tries = 0;
  while (farRight.includes(lane) && tries < 4) {
    lane = Math.floor(Math.random() * LANES);
    tries++;
  }
  return lane;
}

function shouldSpawn(state: RoadState): boolean {
  return state.distance >= state.nextSpawnFrame;
}

function nextSpawnInterval(state: RoadState): number {
  // Faster spawns as score climbs, floored so it never goes crazy.
  return Math.max(14, 32 - Math.floor(state.distance / 60));
}

function nextSpeed(state: RoadState): number {
  // Slowly accelerate.
  return Math.min(0.05, state.speed + 0.00005);
}

// Step one frame of the game. Pure: no side effects, returns the next state.
export function step(state: RoadState): RoadState {
  if (!state.alive) return state;

  // 1. Scroll existing obstacles left → right? We treat x as "distance from
  //    spawn point" so x grows over time. At x ≥ 1 the obstacle reaches the
  //    car. We remove anything past x > 1.2 (off the back).
  const moved: Obstacle[] = [];
  let collided = false;
  for (const o of state.obstacles) {
    const nx = o.x + state.speed;
    if (nx > 1.2) continue; // gone
    // Collision check: obstacle in the car's lane and overlapping its
    // x-range (car sits at x≈0.9..1.0).
    const carLeft = 1 - CAR_WIDTH_PCT;
    const carRight = 1;
    const obLeft = nx;
    const obRight = nx + OBSTACLE_WIDTH_PCT;
    const overlapX = obLeft < carRight && obRight > carLeft;
    if (overlapX && o.lane === state.carLane) {
      collided = true;
    }
    moved.push({ ...o, x: nx });
  }

  // 2. Maybe spawn a new obstacle.
  let nextSpawnFrame = state.nextSpawnFrame;
  let nextId = state.nextId;
  if (shouldSpawn(state)) {
    moved.push({ id: nextId, lane: spawnLane(state), x: 0 });
    nextId += 1;
    nextSpawnFrame = state.distance + nextSpawnInterval(state);
  }

  return {
    ...state,
    obstacles: moved,
    distance: state.distance + 1,
    speed: nextSpeed(state),
    nextSpawnFrame,
    nextId,
    alive: state.alive && !collided,
  };
}

// Score helpers
export function distanceMeters(distance: number): number {
  // 1 frame ≈ 1.5m (fictional). Keeps the score easily readable.
  return Math.round(distance * 1.5);
}

export function xpForRun(distance: number): number {
  return Math.floor(distanceMeters(distance) / 10);
}
