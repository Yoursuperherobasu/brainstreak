import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontSize, Radius, Shadow } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';

interface CategoryTileProps {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}

export function CategoryTile({ label, color, selected, onPress }: CategoryTileProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 12, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    haptics.selection();
    audio.select();
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
          <View style={[styles.marker, { backgroundColor: selected ? '#FFFFFF' : color }]} />
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
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  pressable: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  marker: {
    width: 22,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  label: {
    fontSize: FontSize.md,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
});
