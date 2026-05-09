import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Supabase Configuration ─────────────────────────────────────────────────
// Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
// Get them from: https://app.supabase.com → Project Settings → API
//
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

const storage =
  Platform.OS === 'web'
    ? undefined
    : {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
    !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder')
  );
}

// ─── Database Types (v1) ─────────────────────────────────────────────────────
// v1 ships only `profiles`. `scores` and `habits` are deferred to v2.

export interface Profile {
  id: string;
  username: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  games_played: number;
  updated_at: string;
}
