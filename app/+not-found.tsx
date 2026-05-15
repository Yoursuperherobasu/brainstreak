import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';

// Friendly 404. Renders when expo-router can't match the URL (e.g. a stale
// link, a typo, or a refresh on a route that no longer exists). Keeps the
// app brand visible and offers a single, obvious recovery action.
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page not found', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          <View style={styles.mark}>
            <Text style={styles.markText}>404</Text>
          </View>
          <Text style={styles.title}>This screen doesn't exist.</Text>
          <Text style={styles.subtitle}>
            The page you're looking for might have moved or never existed.
            No worries — your streak is safe.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Go to Home"
              size="lg"
              onPress={() => router.replace('/(tabs)')}
            />
          </View>
        </View>
      </SafeAreaView>
    </>
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
  mark: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  markText: {
    fontSize: 32,
    color: Colors.primary,
    fontFamily: 'BagelFatOne_400Regular',
    letterSpacing: 0,
  },
  title: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  actions: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'stretch',
  },
});
