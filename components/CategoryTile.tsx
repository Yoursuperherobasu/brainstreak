import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize, Radius, Shadow } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface CategoryTileProps {
  emoji: string;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}

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
    ? [color, `${color}DD`]
    : [Colors.bgCard, Colors.bg];

  return (
    <Animated.View
      style={[
        styles.outer,
        animStyle,
        { borderColor: selected ? color : Colors.border },
        Shadow.sm,
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={styles.pressable}
        android_ripple={{ color: `${color}22` }}
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
              { color: selected ? '#FFFFFF' : Colors.textPrimary },
            ]}
          >
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
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
  pressable: { flex: 1 },
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
