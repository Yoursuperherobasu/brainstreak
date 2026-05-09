import React from 'react';
import {
  Pressable,
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
import { haptics } from '@/lib/haptics';
import { Colors, Radius, FontSize, Shadow } from '@/constants/theme';

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
    haptics.light();
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
    primary: [Colors.primary, Colors.primaryLight],
    secondary: [Colors.bgElevated, Colors.bgOverlay],
    danger: [Colors.danger, '#E08482'],
    ghost: ['transparent', 'transparent'],
  };

  const colors = gradient ?? variantColors[variant];
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';
  const labelColor = isGhost || isSecondary ? Colors.textPrimary : '#FFFFFF';

  return (
    <Animated.View style={[animatedStyle, !isGhost && Shadow.md, style]}>
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
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
            <ActivityIndicator color={labelColor} size="small" />
          ) : (
            <Text style={[styles.label, { fontSize: textSizes[size], color: labelColor }, textStyle]}>
              {icon ? `${icon}  ` : ''}{label}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ghostBorder: {
    borderWidth: 1.5,
    borderColor: Colors.borderBright,
  },
  disabled: {
    opacity: 0.5,
  },
});
