// Graph-paper underlay for Number Sense — gives that "math notebook" feel.
// Cheap: ~20 grid lines as <Line> nodes, fixed viewBox, no animation.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

interface Props {
  bg?: string;
  line?: string;
  step?: number; // grid spacing in viewBox units (default 8)
}

export function GraphPaperBackground({
  bg = '#F2F6FC',
  line = '#C8D8F0',
  step = 8,
}: Props) {
  const lines: number[] = [];
  for (let i = step; i < 100; i += step) lines.push(i);
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Rect x="0" y="0" width="100" height="100" fill={bg} />
        {lines.map((p) => (
          <Line key={`v${p}`} x1={p} y1={0} x2={p} y2={100} stroke={line} strokeWidth="0.25" />
        ))}
        {lines.map((p) => (
          <Line key={`h${p}`} x1={0} y1={p} x2={100} y2={p} stroke={line} strokeWidth="0.25" />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
});
