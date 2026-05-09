import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface CategoryTileProps {
  emoji: string;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function CategoryTile({ emoji, label, color, selected, onPress }: CategoryTileProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 12, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    haptics.selection();
    onPress();
  };

  const gradient: [string, string] = selected
    ? [color, `${color}99`]
    : [Colors.bgCard, Colors.bgElevated];

  return (
    <AnimatedTouchable
      activeOpacity={0.9}
      onPress={handlePress}
      style={[
        styles.outer,
        animStyle,
        { borderColor: selected ? color : Colors.border },
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inner}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <Text
          style={[
            styles.label,
            { color: selected ? Colors.textPrimary : Colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    minWidth: '30%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emoji: { fontSize: 38 },
  label: {
    fontSize: FontSize.md,
    fontFamily: 'Outfit_700Bold',
  },
});
