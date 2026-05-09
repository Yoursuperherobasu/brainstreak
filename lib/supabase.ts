import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Supabase Configuration ─────────────────────────────────────────────────
// Replace these with your actual Supabase project URL and anon key.
// Get them from: https://app.supabase.com → Project Settings → API
//
// FREE tier includes:
//  • 500 MB database
//  • 50,000 monthly active users
//  • 2 GB bandwidth
//  • Realtime updates
//
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

const storage =
  Platform.OS === 'web'
    ? undefined // web uses localStorage automatically
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

// ─── Database Types ──────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  games_played: number;
  created_at: string;
}

export interface Score {
  id: string;
  user_id: string;
  username: string;
  score: number;
  xp_earned: number;
  category: string;
  questions_correct: number;
  questions_total: number;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  color: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completed_today: boolean;
  last_completed: string | null;
  created_at: string;
}

// ─── Supabase SQL Setup (run once in Supabase SQL editor) ───────────────────
// See supabase_setup.sql in project root
