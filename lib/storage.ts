import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const StorageKeys = {
  STREAK: '@brainstreak/streak',
  PROFILE: '@brainstreak/profile',
  SETTINGS: '@brainstreak/settings',
  RECENT_GAMES: '@brainstreak/recent_games',
  ONBOARDED: '@brainstreak/onboarded',
} as const;

// ─── Streak Logic ────────────────────────────────────────────────────────────

export interface StreakData {
  current: number;
  longest: number;
  lastPlayDate: string | null; // ISO date YYYY-MM-DD in device local timezone
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
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
  await AsyncStorage.setItem(StorageKeys.STREAK, JSON.stringify(updated));
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
