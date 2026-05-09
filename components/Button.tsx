import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
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

  // On WEB: native <button> element guarantees clicks work even if
  // react-native-web's Pressable is being intercepted by transforms /
  // shadows / Reanimated layout config. We render the gradient as a
  // background div and the label as a span — pure HTML.
  if (Platform.OS === 'web') {
    const css: any = {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingTop: sizeStyles[size].paddingVertical,
      paddingBottom: sizeStyles[size].paddingVertical,
      paddingLeft: sizeStyles[size].paddingHorizontal,
      paddingRight: sizeStyles[size].paddingHorizontal,
      borderRadius: sizeStyles[size].borderRadius,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      border: isGhost ? `1.5px solid ${Colors.borderBright}` : 'none',
      background: isGhost
        ? 'transparent'
        : `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      color: labelColor,
      boxShadow: isGhost ? 'none' : '0 2px 6px rgba(0,0,0,0.1)',
      fontFamily: 'BricolageGrotesque_700Bold',
      fontWeight: 700,
      fontSize: textSizes[size],
      letterSpacing: '0.3px',
      transition: 'transform 0.12s ease',
      display: 'flex',
    };
    return (
      // eslint-disable-next-line react/forbid-dom-props
      <button
        type="button"
        onClick={handlePress}
        disabled={disabled || loading}
        style={{ ...css, ...(style as any) }}
      >
        {loading ? '...' : `${icon ? icon + '  ' : ''}${label}`}
      </button>
    );
  }

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
