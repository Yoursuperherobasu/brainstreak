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
} from 'react-native-reanimated';
import { Colors, Radius, Spacing, FontSize } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  gradient?: [string, string];
  noPadding?: boolean;
}

export function Card({ children, style, onPress, gradient, noPadding }: CardProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.97, { damping: 12, stiffness: 300 });
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
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return inner;
}

// Stat Card for profile/dashboard
interface StatCardProps {
  label: string;
  value: string | number;
  emoji: string;
  color?: string;
}

export function StatCard({ label, value, emoji, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderColor: color ?? Colors.border }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color: color ?? Colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  solidBg: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
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
  },
  statEmoji: {
    fontSize: 22,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
