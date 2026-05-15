import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing, FontSize, Shadow } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  gradient?: [string, string];
  noPadding?: boolean;
}

export function Card({ children, style, onPress, gradient, noPadding }: CardProps) {
  const scale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.97, { damping: 12, stiffness: 300 });
    flashOpacity.value = withSequence(
      withTiming(0.18, { duration: 80 }),
      withTiming(0, { duration: 220 }),
    );
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  const inner = gradient ? (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.inner, noPadding && styles.noPad, style]}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={[styles.inner, styles.solidBg, noPadding && styles.noPad, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={animStyle}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {inner}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.primary, borderRadius: Radius.md }, flashStyle]}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return inner;
}

// Stat Card for profile/dashboard
interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  color?: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderColor: color ?? Colors.border }]}>
      <View style={[styles.statMarker, { backgroundColor: color ?? Colors.primary }]} />
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.statValue, { color: color ?? Colors.textPrimary }]}>{value}</Text>
      ) : (
        value
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  solidBg: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  noPad: {
    padding: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    ...Shadow.sm,
  },
  statMarker: {
    width: 18,
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
