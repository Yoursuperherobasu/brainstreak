// Top-down vehicle + obstacle SVGs for Road Rush.
//
// All shapes are pure react-native-svg — no raster assets, scales crisply at
// every density, weighs grams. Each component takes width/height and renders
// to fill that box; the screen still controls absolute positioning.
//
// Node budget for the whole file: < 50 SVG nodes (see comment per component).

import React from 'react';
import Svg, { Rect, Circle, Path, G, Polygon, Line } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface BoxProps {
  width: number;
  height: number;
}

// ── Player car: blue cabin, white windshield, 4 wheels, twin headlights.
//   Top-down view. Faces LEFT (the game scrolls obstacles right→left toward
//   the car which sits on the right edge). 14 nodes.
export function PlayerCar({ width, height }: BoxProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 60 100" preserveAspectRatio="none">
      {/* shadow under car */}
      <Rect x="6" y="10" width="48" height="84" rx="14" fill="#0008" />
      {/* body */}
      <Rect x="4" y="6" width="52" height="86" rx="14" fill={Colors.primary} stroke="#0A1A3A" strokeWidth="1.5" />
      {/* hood vents */}
      <Rect x="14" y="12" width="32" height="3" rx="1.5" fill="#1E4FA8" />
      {/* windshield (front, top in this orientation) */}
      <Path d="M10 24 L50 24 L46 40 L14 40 Z" fill="#7EC8FF" stroke="#0A1A3A" strokeWidth="1" />
      {/* roof */}
      <Rect x="14" y="40" width="32" height="22" rx="3" fill="#2452B8" />
      {/* rear window */}
      <Path d="M14 62 L46 62 L50 78 L10 78 Z" fill="#7EC8FF" stroke="#0A1A3A" strokeWidth="1" />
      {/* wheels */}
      <Rect x="0" y="20" width="6" height="14" rx="2" fill="#1B1F2A" />
      <Rect x="54" y="20" width="6" height="14" rx="2" fill="#1B1F2A" />
      <Rect x="0" y="70" width="6" height="14" rx="2" fill="#1B1F2A" />
      <Rect x="54" y="70" width="6" height="14" rx="2" fill="#1B1F2A" />
      {/* headlights */}
      <Circle cx="14" cy="9" r="2.2" fill="#FFE89E" />
      <Circle cx="46" cy="9" r="2.2" fill="#FFE89E" />
    </Svg>
  );
}

// ── Enemy car: red cabin, slightly bulkier silhouette, faces RIGHT (it's
//   approaching the player). 11 nodes.
export function EnemyCar({ width, height }: BoxProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 60 100" preserveAspectRatio="none">
      <Rect x="6" y="10" width="48" height="84" rx="12" fill="#0008" />
      <Rect x="4" y="6" width="52" height="86" rx="12" fill={Colors.danger} stroke="#3A0A0A" strokeWidth="1.5" />
      {/* rear window (rear is at top — car is approaching the player) */}
      <Path d="M10 22 L50 22 L46 38 L14 38 Z" fill="#FFB3B3" stroke="#3A0A0A" strokeWidth="1" />
      <Rect x="14" y="38" width="32" height="24" rx="3" fill="#A83A3A" />
      <Path d="M14 62 L46 62 L50 78 L10 78 Z" fill="#FFB3B3" stroke="#3A0A0A" strokeWidth="1" />
      <Rect x="0" y="22" width="6" height="14" rx="2" fill="#1B1F2A" />
      <Rect x="54" y="22" width="6" height="14" rx="2" fill="#1B1F2A" />
      <Rect x="0" y="68" width="6" height="14" rx="2" fill="#1B1F2A" />
      <Rect x="54" y="68" width="6" height="14" rx="2" fill="#1B1F2A" />
      {/* tail lights (at bottom, since car faces away from player) */}
      <Circle cx="18" cy="90" r="2" fill="#FFE89E" />
      <Circle cx="42" cy="90" r="2" fill="#FFE89E" />
    </Svg>
  );
}

// ── Traffic cone: orange triangle on a square base with reflective stripes.
//   8 nodes.
export function TrafficCone({ width, height }: BoxProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 60 100" preserveAspectRatio="none">
      {/* base */}
      <Rect x="6" y="78" width="48" height="14" rx="3" fill="#222" />
      <Rect x="10" y="76" width="40" height="6" rx="2" fill="#3A3A3A" />
      {/* cone body — triangle pointing up */}
      <Polygon points="30,12 14,78 46,78" fill="#FF7A1A" stroke="#3A1A00" strokeWidth="1.5" />
      {/* reflective stripes */}
      <Polygon points="22,46 38,46 41,56 19,56" fill="#FFFFFF" />
      <Polygon points="25,32 35,32 37,40 23,40" fill="#FFFFFF" />
      {/* tip highlight */}
      <Circle cx="30" cy="14" r="2" fill="#FFB370" />
    </Svg>
  );
}

// ── Traffic barrier: striped yellow/black caution rail with two stubby legs.
//   7 nodes.
export function TrafficBarrier({ width, height }: BoxProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 60 100" preserveAspectRatio="none">
      {/* legs */}
      <Rect x="10" y="70" width="6" height="22" rx="1" fill="#222" />
      <Rect x="44" y="70" width="6" height="22" rx="1" fill="#222" />
      {/* rail backing */}
      <Rect x="2" y="34" width="56" height="38" rx="4" fill="#FFD000" stroke="#3A2A00" strokeWidth="1.5" />
      {/* diagonal caution stripes */}
      <Polygon points="2,52 16,34 28,34 6,68" fill="#1A1A1A" />
      <Polygon points="22,68 44,34 56,34 32,72" fill="#1A1A1A" />
    </Svg>
  );
}

// ── Obstacle dispatcher: picks one of the 3 variants by id.
//   Stable per obstacle (same id always picks the same kind) so the
//   visual doesn't flicker between frames.
export type ObstacleKind = 'cone' | 'enemy' | 'barrier';

export function obstacleKindFor(id: number): ObstacleKind {
  // 50% enemy car, 30% cone, 20% barrier — feels like a real road.
  const m = ((id * 9301 + 49297) % 233280) / 233280;
  if (m < 0.5) return 'enemy';
  if (m < 0.8) return 'cone';
  return 'barrier';
}

export function Obstacle({ id, width, height }: BoxProps & { id: number }) {
  const k = obstacleKindFor(id);
  if (k === 'enemy') return <EnemyCar width={width} height={height} />;
  if (k === 'cone') return <TrafficCone width={width} height={height} />;
  return <TrafficBarrier width={width} height={height} />;
}
