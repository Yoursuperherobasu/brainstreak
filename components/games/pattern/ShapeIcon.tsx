// SVG shape glyphs for Pattern Recall. Pure react-native-svg, no raster
// assets. Each shape is a single <Path> or <Polygon> with stroke, so they
// render crisp at any size. Total node budget: < 20 nodes for the whole
// palette.

import React from 'react';
import Svg, { Path, Polygon, Circle, Rect } from 'react-native-svg';
import type { ShapeId } from '@/lib/games/patternRecall';

interface Props {
  shape: ShapeId;
  size: number;
  color: string;
}

export function ShapeIcon({ shape, size, color }: Props) {
  const s = size;
  switch (shape) {
    case 'square':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="3" y="3" width="18" height="18" rx="2" fill={color} />
        </Svg>
      );
    case 'circle':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9.5" fill={color} />
        </Svg>
      );
    case 'triangle':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon points="12,3 22,21 2,21" fill={color} />
        </Svg>
      );
    case 'star':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon
            points="12,2 14.6,9 22,9.3 16,14 18.2,21.4 12,17.3 5.8,21.4 8,14 2,9.3 9.4,9"
            fill={color}
          />
        </Svg>
      );
    case 'diamond':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon points="12,2 22,12 12,22 2,12" fill={color} />
        </Svg>
      );
    case 'heart':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            d="M12 21s-7-4.5-9.3-9.2C1.1 8.6 3 5.5 6 5.5c2 0 3.4 1 4 2.4.6-1.4 2-2.4 4-2.4 3 0 4.9 3.1 3.3 6.3C19 16.5 12 21 12 21z"
            fill={color}
          />
        </Svg>
      );
  }
}

// Distinct color per shape — helps players who are slightly memory-fuzzy
// rely on a second perceptual channel.
export const SHAPE_COLORS: Record<ShapeId, string> = {
  square:   '#2F6FED', // blue
  circle:   '#E5484D', // red
  triangle: '#2B9B62', // green
  star:     '#D99921', // gold
  diamond:  '#7B5BD9', // purple
  heart:    '#C75C9E', // pink
};
