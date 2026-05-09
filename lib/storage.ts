import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Streak Logic ────────────────────────────────────────────────────────────

const STREAK_KEY = 'brainstreak_streak';
const LAST_PLAY_KEY = 'brainstreak_last_play';
const HABITS_KEY = 'brainstreak_habits';
const PROFILE_KEY = 'brainstreak_profile';

export interface StreakData {
  current: number;
  longest: number;
  lastPlayDate: string | null; // ISO date string (YYYY-MM-DD)
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function getStreakData(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, longest: 0, lastPlayDate: null };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { current: 0, longest: 0, lastPlayDate: null };
  }
}

export async function updateStreakAfterGame(): Promise<StreakData> {
  const today = todayISO();
  const yesterday = yesterdayISO();
  const streak = await getStreakData();

  let newCurrent = streak.current;

  if (streak.lastPlayDate === today) {
    // Already played today — no change
  } else if (streak.lastPlayDate === yesterday) {
    // Consecutive day — increment
    newCurrent += 1;
  } else {
    // Broke streak — reset
    newCurrent = 1;
  }

  const newLongest = Math.max(newCurrent, streak.longest);
  const updated: StreakData = {
    current: newCurrent,
    longest: newLongest,
    lastPlayDate: today,
  };

  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  return updated;
}

export async function isStreakBroken(): Promise<boolean> {
  const streak = await getStreakData();
  if (!streak.lastPlayDate) return false;
  const yesterday = yesterdayISO();
  const today = todayISO();
  return streak.lastPlayDate !== today && streak.lastPlayDate !== yesterday;
}

export async function hasPlayedToday(): Promise<boolean> {
  const streak = await getStreakData();
  return streak.lastPlayDate === todayISO();
}

// ─── Habit Logic ─────────────────────────────────────────────────────────────

export interface LocalHabit {
  id: string;
  title: string;
  emoji: string;
  color: string;
  streak: number;
  longestStreak: number;
  lastCompleted: string | null;
  completedToday: boolean;
  createdAt: string;
}

export async function getHabits(): Promise<LocalHabit[]> {
  try {
    const raw = await AsyncStorage.getItem(HABITS_KEY);
    if (!raw) return [];
    const habits: LocalHabit[] = JSON.parse(raw);
    // Refresh completedToday based on date
    const today = todayISO();
    return habits.map((h) => ({
      ...h,
      completedToday: h.lastCompleted === today,
    }));
  } catch {
    return [];
  }
}

export async function addHabit(
  title: string,
  emoji: string,
  color: string
): Promise<LocalHabit> {
  const habits = await getHabits();
  const newHabit: LocalHabit = {
    id: `habit_${Date.now()}`,
    title,
    emoji,
    color,
    streak: 0,
    longestStreak: 0,
    lastCompleted: null,
    completedToday: false,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify([...habits, newHabit]));
  return newHabit;
}

export async function completeHabit(habitId: string): Promise<LocalHabit[]> {
  const today = todayISO();
  const yesterday = yesterdayISO();
  const habits = await getHabits();

  const updated = habits.map((h) => {
    if (h.id !== habitId) return h;
    if (h.lastCompleted === today) return h; // already done

    let newStreak = h.streak;
    if (h.lastCompleted === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    return {
      ...h,
      streak: newStreak,
      longestStreak: Math.max(newStreak, h.longestStreak),
      lastCompleted: today,
      completedToday: true,
    };
  });

  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteHabit(habitId: string): Promise<LocalHabit[]> {
  const habits = await getHabits();
  const updated = habits.filter((h) => h.id !== habitId);
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(updated));
  return updated;
}

// ─── Local Profile ────────────────────────────────────────────────────────────

export interface LocalProfile {
  userId: string;
  username: string;
  totalXP: number;
  level: number;
  gamesPlayed: number;
}

export async function getLocalProfile(): Promise<LocalProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return null;
  }
}

export async function saveLocalProfile(profile: LocalProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function updateXP(xpToAdd: number): Promise<LocalProfile> {
  const profile = (await getLocalProfile()) ?? {
    userId: `local_${Date.now()}`,
    username: 'BrainPlayer',
    totalXP: 0,
    level: 1,
    gamesPlayed: 0,
  };

  const newXP = profile.totalXP + xpToAdd;
  const newLevel = Math.floor(Math.sqrt(newXP / 50)) + 1;
  const updated: LocalProfile = {
    ...profile,
    totalXP: newXP,
    level: newLevel,
    gamesPlayed: profile.gamesPlayed + 1,
  };

  await saveLocalProfile(updated);
  return updated;
}
