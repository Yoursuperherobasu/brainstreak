import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface AuthResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

const NOT_CONFIGURED: AuthResult<never> = {
  ok: false,
  error: 'Cloud sync is not configured for this build.',
};

function asMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }
  return 'Something went wrong.';
}

export async function signUpWithEmail(email: string, password: string, username?: string): Promise<AuthResult<{ userId: string | null; needsConfirmation: boolean }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED as AuthResult<{ userId: string | null; needsConfirmation: boolean }>;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: username ? { username } : undefined,
      },
    });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: {
        userId: data.user?.id ?? null,
        needsConfirmation: !data.session,
      },
    };
  } catch (e) {
    return { ok: false, error: asMessage(e) };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult<{ userId: string }>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED as AuthResult<{ userId: string }>;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: 'Sign-in returned no user.' };
    return { ok: true, data: { userId: data.user.id } };
  } catch (e) {
    return { ok: false, error: asMessage(e) };
  }
}

export async function signOut(): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { ok: true };
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: asMessage(e) };
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: asMessage(e) };
  }
}

export async function getCurrentSession(): Promise<{ userId: string | null }> {
  if (!isSupabaseConfigured()) return { userId: null };
  try {
    const { data } = await supabase.auth.getSession();
    return { userId: data.session?.user?.id ?? null };
  } catch {
    return { userId: null };
  }
}
