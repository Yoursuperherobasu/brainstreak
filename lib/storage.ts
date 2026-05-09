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

export async function getStreakData(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.STREAK);
    if (!raw) return { current: 0, longest: 0, lastPlayDate: null };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { current: 0, longest: 0, lastPlayDate: null };
  }
}

export async function saveStreakData(streak: StreakData): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.STREAK, JSON.stringify(streak));
}

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

export async function updateStreakAfterGame(): Promise<StreakData> {
  const prev = await getStreakData();
  const updated = computeStreakAfterGame(prev, todayISO(), yesterdayISO());
  await saveStreakData(updated);
  return updated;
}

export async function isStreakBroken(): Promise<boolean> {
  const streak = await getStreakData();
  if (!streak.lastPlayDate) return false;
  return streak.lastPlayDate !== todayISO() && streak.lastPlayDate !== yesterdayISO();
}

export async function hasPlayedToday(): Promise<boolean> {
  const streak = await getStreakData();
  return streak.lastPlayDate === todayISO();
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

export async function getLocalProfile(): Promise<LocalProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return null;
  }
}

export async function saveLocalProfile(profile: LocalProfile): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.PROFILE, JSON.stringify(profile));
}

export async function updateXP(xpToAdd: number): Promise<LocalProfile> {
  const profile = (await getLocalProfile()) ?? {
    username: DEFAULT_USERNAME,
    totalXP: 0,
    level: 1,
    gamesPlayed: 0,
  };
  const newXP = profile.totalXP + xpToAdd;
  const newLevel = newXP <= 0 ? 1 : Math.floor(Math.sqrt(newXP / 50)) + 1;
  const updated: LocalProfile = {
    ...profile,
    totalXP: newXP,
    level: newLevel,
    gamesPlayed: profile.gamesPlayed + 1,
  };
  await saveLocalProfile(updated);
  return updated;
}

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
