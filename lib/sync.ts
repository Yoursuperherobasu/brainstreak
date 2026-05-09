import { supabase } from '@/lib/supabase';
import { LocalProfile, StreakData, DEFAULT_USERNAME } from '@/lib/storage';
import { getLevelFromXP } from '@/lib/trivia';

export interface CloudProfile {
  id: string;
  username: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  games_played: number;
  last_play_date: string | null; // YYYY-MM-DD; nullable for legacy rows
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

// Pure merge function.
// - Numeric fields take max(local, cloud).
// - level is DERIVED from totalXP after the merge — never trusted from either side
//   to avoid drift between XP and level (A4 fix).
// - lastPlayDate: take the MORE RECENT of local and cloud so streak math
//   on the next game uses the right anchor (A1 fix). Cross-device streak preserved.
// - username: cloud wins unless local was customized away from the default.
export function mergeProfiles(input: MergeInput): MergedProfile {
  const { local, localStreak, cloud } = input;

  if (!cloud) {
    return { profile: local, streak: localStreak };
  }

  const totalXP = Math.max(local.totalXP, cloud.total_xp);
  const gamesPlayed = Math.max(local.gamesPlayed, cloud.games_played);
  const currentStreak = Math.max(localStreak.current, cloud.current_streak);
  const longestStreak = Math.max(localStreak.longest, cloud.longest_streak);

  // Most recent lastPlayDate wins. ISO date strings sort correctly lexically.
  const localDate = localStreak.lastPlayDate ?? '';
  const cloudDate = cloud.last_play_date ?? '';
  const lastPlayDate = localDate >= cloudDate
    ? (localStreak.lastPlayDate ?? cloud.last_play_date ?? null)
    : (cloud.last_play_date ?? null);

  const localCustomized = local.username !== DEFAULT_USERNAME;
  const username = localCustomized ? local.username : cloud.username;

  return {
    profile: {
      username,
      totalXP,
      level: getLevelFromXP(totalXP),
      gamesPlayed,
    },
    streak: {
      current: currentStreak,
      longest: longestStreak,
      lastPlayDate,
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
    last_play_date: streak.lastPlayDate,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) {
    console.warn('[sync] push failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
