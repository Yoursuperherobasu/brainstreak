// components/charts/CategoryRadar.tsx
// 5-axis radar chart showing user's relative score across trivia categories.
// Read from getRecentGames() and aggregate by category.
// Uses react-native-svg (already installed). No new deps.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { getRecentGames } from '@/lib/storage';
import { Colors, FontSize } from '@/constants/theme';

const AXES = [
  { key: 'Math',    label: 'Math',    angle: -Math.PI / 2 },                          // top
  { key: 'Science', label: 'Science', angle: -Math.PI / 2 + (2 * Math.PI) / 5 },
  { key: 'GK',      label: 'GK',      angle: -Math.PI / 2 + (4 * Math.PI) / 5 },
  { key: 'History', label: 'History', angle: -Math.PI / 2 + (6 * Math.PI) / 5 },
  { key: 'Pop',     label: 'Pop',     angle: -Math.PI / 2 + (8 * Math.PI) / 5 },
];

// Axis colors for the filled polygon — mirrors theme category colors
const AXIS_COLORS: Record<string, string> = {
  Math:    Colors.catMath,
  Science: Colors.catScience,
  GK:      Colors.catGK,
  History: Colors.catHistory,
  Pop:     Colors.catPop,
};

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 36;

function aggregateByCategory(games: Array<{ category: string; score: number }>): Record<string, number> {
  const sum: Record<string, number> = {};
  for (const g of games) {
    sum[g.category] = (sum[g.category] ?? 0) + g.score;
  }
  return sum;
}

export function CategoryRadar() {
  const [byCat, setByCat] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getRecentGames().then((games) => {
      setByCat(aggregateByCategory(games));
      setLoaded(true);
    });
  }, []);

  // Friendly category name mapping — getRecentGames stores categories with
  // titlecase ("Math", "Science", "Pop Culture") so we normalize.
  function valueFor(axis: string): number {
    const candidates = Object.entries(byCat).filter(([k]) =>
      k.toLowerCase().includes(axis.toLowerCase()) ||
      (axis === 'GK' && (k.toLowerCase().includes('general') || k.toLowerCase().includes('gk'))) ||
      (axis === 'Pop' && k.toLowerCase().includes('pop'))
    );
    return candidates.reduce((sum, [, v]) => sum + v, 0);
  }

  const values = AXES.map((a) => valueFor(a.key));
  const maxVal = Math.max(1, ...values);
  const hasData = values.some((v) => v > 0);

  const points = AXES.map((a) => {
    const norm = hasData ? valueFor(a.key) / maxVal : 0;
    const x = CX + Math.cos(a.angle) * R * norm;
    const y = CY + Math.sin(a.angle) * R * norm;
    return `${x},${y}`;
  }).join(' ');

  // Background grid: 4 concentric rings
  const rings = [0.25, 0.5, 0.75, 1.0].map((scale) => {
    const pts = AXES.map((a) => {
      const x = CX + Math.cos(a.angle) * R * scale;
      const y = CY + Math.sin(a.angle) * R * scale;
      return `${x},${y}`;
    }).join(' ');
    return (
      <Polygon
        key={scale}
        points={pts}
        fill="none"
        stroke={Colors.borderBright}
        strokeWidth={1}
        opacity={0.5}
      />
    );
  });

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        {/* Grid rings */}
        {rings}

        {/* Axis lines */}
        {AXES.map((a) => (
          <Line
            key={a.key}
            x1={CX}
            y1={CY}
            x2={CX + Math.cos(a.angle) * R}
            y2={CY + Math.sin(a.angle) * R}
            stroke={Colors.borderBright}
            strokeWidth={1}
            opacity={0.6}
          />
        ))}

        {/* Data polygon */}
        {hasData && (
          <Polygon
            points={points}
            fill={Colors.primary}
            fillOpacity={0.28}
            stroke={Colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        )}

        {/* Axis dots at tips */}
        {AXES.map((a) => {
          const x = CX + Math.cos(a.angle) * R;
          const y = CY + Math.sin(a.angle) * R;
          return (
            <Circle
              key={`dot-${a.key}`}
              cx={x}
              cy={y}
              r={3}
              fill={AXIS_COLORS[a.key] ?? Colors.borderBright}
              opacity={0.8}
            />
          );
        })}

        {/* Axis labels */}
        {AXES.map((a) => {
          const lx = CX + Math.cos(a.angle) * (R + 20);
          const ly = CY + Math.sin(a.angle) * (R + 20);
          return (
            <SvgText
              key={a.key}
              x={lx}
              y={ly}
              fill={Colors.textPrimary}
              fontSize={11}
              fontWeight="700"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {a.label}
            </SvgText>
          );
        })}

        {/* Center dot */}
        <Circle cx={CX} cy={CY} r={3} fill={Colors.borderBright} />
      </Svg>

      {!loaded && (
        <Text style={styles.loading}>Loading…</Text>
      )}
      {loaded && !hasData && (
        <Text style={styles.empty}>Play some Brain Rush rounds to populate this chart.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  loading: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 8,
  },
  empty: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
