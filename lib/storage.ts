import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const StorageKeys = {
  STREAK: '@brainstreak/streak',
  PROFILE: '@brainstreak/profile',
  SETTINGS: '@brainstreak/settings',
  RECENT_GAMES: '@brainstreak/recent_games',
  ONBOARDED: '@brainstreak/onboarded',
} as const;

// ─── Local Date Helpers (A2 fix) ─────────────────────────────────────────────
// Use local components so streak math respects the user's timezone. Earlier
// the helpers used toISOString().split('T')[0] which is UTC and rolled over
// the date at the wrong moment for users outside UTC.

export function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yesterdayISO(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return todayISO(d);
}

// ─── Streak Logic ────────────────────────────────────────────────────────────

export interface StreakData {
  current: number;
  longest: number;
  lastPlayDate: string | null; // ISO date YYYY-MM-DD in device local timezone
}

// Pure streak math — the single source of truth for the algorithm. Storage
// happens in `useUserStore` (Zustand + AsyncStorage persistence under
// @brainstreak/profile). We deliberately removed the legacy raw-key writers
// (saveStreakData / updateStreakAfterGame) because they collided with
// Zustand's persisted shape and corrupted state into NaN. If a caller needs
// the streak it should read from `useUserStore.getState().streak`.
export function computeStreakAfterGame(prev: StreakData, today: string, yesterday: string): StreakData {
  let newCurrent = prev.current;
  if (prev.lastPlayDate === today) {
    // already played today
  } else if (prev.lastPlayDate === yesterday) {
    newCurrent += 1;
  } else {
    newCurrent = 1;
  }
  return {
    current: newCurrent,
    longest: Math.max(newCurrent, prev.longest),
    lastPlayDate: today,
  };
}

// Pure predicate: "did the user play today already?" Pass the in-memory
// streak — typically from useUserStore.
export function hasPlayedToday(streak: StreakData, today: string = todayISO()): boolean {
  return streak.lastPlayDate === today;
}

// Pure predicate: "is the streak broken (last play was older than yesterday)?"
export function isStreakBroken(streak: StreakData, today: string = todayISO(), yesterday: string = yesterdayISO()): boolean {
  if (!streak.lastPlayDate) return false;
  return streak.lastPlayDate !== today && streak.lastPlayDate !== yesterday;
}

// "Ember" state for the streak flame: user has a streak, didn't play today,
// and yesterday is the last day they did play. (One more missed day breaks it.)
export function isStreakAtRisk(streak: StreakData, today: string, yesterday: string): boolean {
  if (streak.current === 0) return false;
  return streak.lastPlayDate === yesterday;
}

// ─── Local Profile ───────────────────────────────────────────────────────────

export interface LocalProfile {
  username: string;
  totalXP: number;
  level: number;
  gamesPlayed: number;
}

export const DEFAULT_USERNAME = 'BrainPlayer';

// Note: `getLocalProfile` / `saveLocalProfile` / `updateXP` were removed.
// They wrote to `@brainstreak/profile` which is owned by Zustand's persist
// middleware (`useUserStore`), so reads returned a `{state, version}`
// wrapper instead of the bare profile and `.totalXP` was undefined →
// `undefined + xp = NaN` permanently corrupted the user's XP and level.
// All profile mutations now go through `useUserStore.setProfile()`.

// ─── Recent Games (A11) ──────────────────────────────────────────────────────

export interface RecentGame {
  category: string;
  score: number;
  xp: number;
  correct: number;
  total: number;
  at: string; // ISO timestamp
}

export async function getRecentGames(): Promise<RecentGame[]> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.RECENT_GAMES);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as RecentGame[]) : [];
  } catch {
    return [];
  }
}

export async function recordGame(game: RecentGame): Promise<RecentGame[]> {
  const existing = await getRecentGames();
  const next = [game, ...existing].slice(0, Config.MAX_RECENT_GAMES);
  await AsyncStorage.setItem(StorageKeys.RECENT_GAMES, JSON.stringify(next));
  return next;
}
