import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, FontSize } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: [string, string];
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  gradient,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled || loading) return;
    scale.value = withSequence(
      withSpring(0.94, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.md },
    md: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: Radius.lg },
    lg: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: Radius.xl },
  };

  const textSizes = {
    sm: FontSize.sm,
    md: FontSize.md,
    lg: FontSize.lg,
  };

  const variantColors: Record<string, [string, string]> = {
    primary: [Colors.primary, Colors.primaryDark],
    secondary: [Colors.bgElevated, Colors.bgCard],
    danger: [Colors.danger, '#B91C1C'],
    ghost: ['transparent', 'transparent'],
  };

  const colors = gradient ?? variantColors[variant];
  const isGhost = variant === 'ghost';

  return (
    <AnimatedTouchable
      onPress={handlePress}
      activeOpacity={0.9}
      disabled={disabled || loading}
      style={[animatedStyle, style]}
    >
      <LinearGradient
        colors={colors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.base,
          sizeStyles[size],
          isGhost && styles.ghostBorder,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.textPrimary} size="small" />
        ) : (
          <Text style={[styles.label, { fontSize: textSizes[size] }, textStyle]}>
            {icon ? `${icon}  ` : ''}{label}
          </Text>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ghostBorder: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
});
