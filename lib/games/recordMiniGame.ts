import { useUserStore } from '@/store/useUserStore';
import { useGameStore } from '@/store/useGameStore';
import { useAchievementsStore } from '@/store/useAchievementsStore';
import {
  computeStreakAfterGame,
  recordGame,
  todayISO,
  yesterdayISO,
  type LocalProfile,
} from '@/lib/storage';
import { getLevelFromXP } from '@/lib/trivia';
import { evaluate } from '@/lib/achievements';

export type MiniGameId =
  | 'word-sprint'
  | 'number-sense'
  | 'memory-match'
  | 'reaction-tap'
  | 'road-rush';

export interface MiniGameResult {
  gameId: MiniGameId;
  score: number;
  xp: number;
  total?: number;
  correct?: number;
}

export interface RecordedResult {
  leveledUp: boolean;
  freshUnlocks: string[];
}

const PRETTY: Record<MiniGameId, string> = {
  'word-sprint':  'Word Sprint',
  'number-sense': 'Number Sense',
  'memory-match': 'Memory Match',
  'reaction-tap': 'Reaction Tap',
  'road-rush':    'Road Rush',
};

export async function recordMiniGameResult(r: MiniGameResult): Promise<RecordedResult> {
  const user = useUserStore.getState();
  const previousLevel = user.profile.level;
  const previousStreak = user.streak;

  const newStreak = computeStreakAfterGame(previousStreak, todayISO(), yesterdayISO());

  const newTotalXP = user.profile.totalXP + r.xp;
  const updatedProfile: LocalProfile = {
    ...user.profile,
    totalXP: newTotalXP,
    level: getLevelFromXP(newTotalXP),
    gamesPlayed: user.profile.gamesPlayed + 1,
  };

  const recent = await recordGame({
    category: PRETTY[r.gameId],
    score: r.score,
    xp: r.xp,
    correct: r.correct ?? 0,
    total: r.total ?? 0,
    at: new Date().toISOString(),
  });

  const unlockedIds = evaluate({ profile: updatedProfile, streak: newStreak, recent });
  const fresh = useAchievementsStore.getState().recordUnlocked(unlockedIds);

  useUserStore.setState({ profile: updatedProfile, streak: newStreak });
  if (fresh.length > 0) {
    useGameStore.setState({ pendingAchievementIds: fresh });
  }

  // Best-effort cloud sync — matches useGameStore.finishGame (Brain Rush).
  // No-op when the user is anonymous, when Supabase isn't configured, or
  // when offline. Must not block the UI.
  useUserStore.getState().pushIfAuthed().catch(() => {});

  return {
    leveledUp: updatedProfile.level > previousLevel,
    freshUnlocks: fresh,
  };
}
