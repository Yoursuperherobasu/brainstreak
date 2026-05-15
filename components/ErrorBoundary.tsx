import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';

interface State {
  hasError: boolean;
  message: string;
}

interface Props {
  children: React.ReactNode;
  fallback?: (reset: () => void, message: string) => React.ReactNode;
}

// Top-level error boundary. Catches render-time errors anywhere below it and
// shows a friendly screen with a Retry button instead of a white screen.
// In __DEV__ the error message is shown verbatim; in production the message
// is generic so we don't leak internals to users.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): State {
    const raw = err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err);
    return { hasError: true, message: raw };
  }

  componentDidCatch(err: unknown, info: { componentStack?: string | null }) {
    if (__DEV__) {
      console.warn('[ErrorBoundary]', err, info?.componentStack ?? '');
    }
    // Production hook point: wire crash reporter here (Sentry, Bugsnag, etc.)
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.reset, this.state.message);

    const detail = __DEV__ ? this.state.message : 'The app hit an unexpected error.';

    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>{detail}</Text>
          {Platform.OS === 'web' ? (
            <button
              type="button"
              onClick={this.reset}
              style={{
                marginTop: 20,
                backgroundColor: Colors.primary,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: Radius.md,
                padding: '12px 20px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              } as any}
            >
              Try again
            </button>
          ) : (
            <Pressable onPress={this.reset} style={styles.btn}>
              <Text style={styles.btnText}>Try again</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    maxWidth: 420,
    width: '100%',
  },
  title: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginBottom: 8,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 22,
  },
  btn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
