import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function SignInScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.emoji}>☁️</Text>
        <Text style={styles.title}>Sign in coming soon</Text>
        <Text style={styles.bodyText}>
          Cross-device sync arrives in the next update. For now, your progress
          stays safe on this device.
        </Text>
        <Button label="Got it" onPress={() => router.back()} size="lg" style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
  },
  bodyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  btn: { minWidth: 160 },
});
