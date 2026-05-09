import { supabase } from '@/lib/supabase';
import { LocalProfile, StreakData, DEFAULT_USERNAME } from '@/lib/storage';

export interface CloudProfile {
  id: string;
  username: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  games_played: number;
  updated_at: string;
}

export interface MergedProfile {
  profile: LocalProfile;
  streak: StreakData;
}

export interface MergeInput {
  local: LocalProfile;
  localStreak: StreakData;
  cloud: CloudProfile | null;
}

// Pure merge function. Numeric fields take max(local, cloud).
// Username: cloud wins unless local has been customized away from the default.
// streak.lastPlayDate: keep local (source of truth for "today played").
export function mergeProfiles(input: MergeInput): MergedProfile {
  const { local, localStreak, cloud } = input;

  if (!cloud) {
    return { profile: local, streak: localStreak };
  }

  const totalXP = Math.max(local.totalXP, cloud.total_xp);
  const level = Math.max(local.level, cloud.level);
  const gamesPlayed = Math.max(local.gamesPlayed, cloud.games_played);
  const currentStreak = Math.max(localStreak.current, cloud.current_streak);
  const longestStreak = Math.max(localStreak.longest, cloud.longest_streak);

  const localCustomized = local.username !== DEFAULT_USERNAME;
  const username = localCustomized ? local.username : cloud.username;

  return {
    profile: {
      username,
      totalXP,
      level,
      gamesPlayed,
    },
    streak: {
      current: currentStreak,
      longest: longestStreak,
      lastPlayDate: localStreak.lastPlayDate,
    },
  };
}

export async function pullAndMerge(
  userId: string,
  local: LocalProfile,
  localStreak: StreakData
): Promise<MergedProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[sync] pull failed:', error.message);
    return { profile: local, streak: localStreak };
  }

  return mergeProfiles({ local, localStreak, cloud: (data ?? null) as CloudProfile | null });
}

export async function pushProfile(
  userId: string,
  profile: LocalProfile,
  streak: StreakData
): Promise<{ ok: boolean; error?: string }> {
  const row = {
    id: userId,
    username: profile.username,
    total_xp: profile.totalXP,
    level: profile.level,
    games_played: profile.gamesPlayed,
    current_streak: streak.current,
    longest_streak: streak.longest,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) {
    console.warn('[sync] push failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
