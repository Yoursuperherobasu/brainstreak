import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import {
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
} from '@/lib/auth';
import { useUserStore } from '@/store/useUserStore';
import { isSupabaseConfigured } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const signInAndSync = useUserStore((s) => s.signInAndSync);
  const username = useUserStore((s) => s.profile.username);
  const supabaseReady = isSupabaseConfigured();

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured()) {
      setError('Supabase isn’t configured yet. See docs/SUPABASE_SETUP.md.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'sign-in') {
        const result = await signInWithEmail(email.trim(), password);
        if (!result.ok) {
          setError(result.error ?? 'Sign-in failed.');
          return;
        }
        await signInAndSync(result.data!.userId);
        router.back();
      } else {
        const result = await signUpWithEmail(email.trim(), password, username);
        if (!result.ok) {
          setError(result.error ?? 'Sign-up failed.');
          return;
        }
        if (result.data?.needsConfirmation) {
          setInfo('Check your email to confirm your address. You can sign in once confirmed.');
        } else if (result.data?.userId) {
          await signInAndSync(result.data.userId);
          router.back();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot password.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    const result = await sendPasswordReset(email.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not send reset email.');
    } else {
      setInfo('Password reset email sent. Check your inbox.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerMark} />
            <Text style={styles.title}>
              {mode === 'sign-in' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.subtitle}>
              Sync your XP, streak, and level across devices.
            </Text>
          </View>

          {!supabaseReady && (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Cloud sync isn't set up yet</Text>
              <Text style={styles.noticeBody}>
                This build has no Supabase credentials, so accounts can't be
                created or signed in here. Your XP, streak, and level are
                still saved safely on this device — keep playing and sync
                will turn on automatically once cloud is configured.
              </Text>
              <Text style={styles.noticeFootnote}>
                Developers: see docs/SUPABASE_SETUP.md.
              </Text>
            </View>
          )}

          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => { setMode('sign-in'); setError(null); setInfo(null); }}
              style={[styles.tab, mode === 'sign-in' && styles.tabActive]}
              disabled={!supabaseReady}
            >
              <Text style={[styles.tabText, mode === 'sign-in' && styles.tabTextActive]}>
                Sign in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setMode('sign-up'); setError(null); setInfo(null); }}
              style={[styles.tab, mode === 'sign-up' && styles.tabActive]}
              disabled={!supabaseReady}
            >
              <Text style={[styles.tabText, mode === 'sign-up' && styles.tabTextActive]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[styles.input, !supabaseReady && styles.inputDisabled]}
              editable={!loading && supabaseReady}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={[styles.input, !supabaseReady && styles.inputDisabled]}
              editable={!loading && supabaseReady}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {info && <Text style={styles.infoText}>{info}</Text>}

          <Button
            label={loading ? '...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!supabaseReady}
            size="lg"
            style={{ marginTop: Spacing.md }}
          />

          {mode === 'sign-in' && supabaseReady && (
            <TouchableOpacity onPress={handleForgotPassword} disabled={loading} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.back()} style={styles.skipWrap} disabled={loading}>
            <Text style={styles.skipText}>
              {supabaseReady ? 'Skip for now — keep playing on this device' : 'Back to the app'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  headerMark: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
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
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  tabTextActive: { color: '#FFFFFF' },
  field: { marginBottom: Spacing.md, gap: 6 },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: FontSize.md,
  },
  inputDisabled: {
    backgroundColor: Colors.bgElevated,
    color: Colors.textMuted,
    opacity: 0.7,
  },
  noticeCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 6,
  },
  noticeTitle: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  noticeBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 20,
  },
  noticeFootnote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 4,
  },
  infoText: {
    color: Colors.success,
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 4,
  },
  forgotWrap: { marginTop: Spacing.md, alignItems: 'center' },
  forgotText: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  skipWrap: { marginTop: Spacing.lg, alignItems: 'center' },
  skipText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
