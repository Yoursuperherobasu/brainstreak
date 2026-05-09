import React from 'react';
import { Platform } from 'react-native';
import Animated from 'react-native-reanimated';

// Drop-in replacements for <Animated.View> and <Animated.Text>. On web,
// Reanimated 4's LayoutAnimationConfig isn't reliably suppressing the
// initial opacity:0 of `entering` animations, leaving entire screens
// invisible. These wrappers strip the layout-animation props on web so
// children render at their final visible state immediately. Native still
// gets full animations.
//
// Animated styles, useSharedValue, useAnimatedStyle continue to work
// because we forward all other props to the underlying Animated.View /
// Animated.Text.

const isWeb = Platform.OS === 'web';

type ViewProps = React.ComponentProps<typeof Animated.View>;
type TextProps = React.ComponentProps<typeof Animated.Text>;

function stripLayoutProps<T extends Record<string, unknown>>(props: T): T {
  if (!isWeb) return props;
  const {
    entering: _entering,
    exiting: _exiting,
    layout: _layout,
    ...rest
  } = props as T & { entering?: unknown; exiting?: unknown; layout?: unknown };
  void _entering;
  void _exiting;
  void _layout;
  return rest as T;
}

export const MotionView = React.forwardRef<unknown, ViewProps>((props, ref) => {
  return <Animated.View ref={ref as never} {...stripLayoutProps(props as Record<string, unknown>)} />;
});
MotionView.displayName = 'MotionView';

export const MotionText = React.forwardRef<unknown, TextProps>((props, ref) => {
  return <Animated.Text ref={ref as never} {...stripLayoutProps(props as Record<string, unknown>)} />;
});
MotionText.displayName = 'MotionText';
