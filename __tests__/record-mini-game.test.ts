import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '@/store/useUserStore';
import { useAchievementsStore } from '@/store/useAchievementsStore';
import { recordMiniGameResult } from '@/lib/games/recordMiniGame';
import { StorageKeys } from '@/lib/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  useUserStore.setState({
    profile: { username: 'Test', totalXP: 0, level: 1, gamesPlayed: 0 },
    streak: { current: 0, longest: 0, lastPlayDate: null },
    authState: 'anonymous',
    authedUserId: null,
  });
  useAchievementsStore.setState({ unlocked: [] });
});

describe('recordMiniGameResult', () => {
  test('adds xp to profile and bumps gamesPlayed', async () => {
    await recordMiniGameResult({ gameId: 'word-sprint', score: 100, xp: 25 });
    const p = useUserStore.getState().profile;
    expect(p.totalXP).toBe(25);
    expect(p.gamesPlayed).toBe(1);
  });

  test('advances streak when called on a fresh day', async () => {
    await recordMiniGameResult({ gameId: 'word-sprint', score: 50, xp: 10 });
    const s = useUserStore.getState().streak;
    expect(s.current).toBe(1);
    expect(s.lastPlayDate).not.toBeNull();
  });

  test('does NOT re-advance streak on a same-day second round', async () => {
    await recordMiniGameResult({ gameId: 'word-sprint', score: 50, xp: 10 });
    await recordMiniGameResult({ gameId: 'number-sense', score: 30, xp: 6 });
    const s = useUserStore.getState().streak;
    expect(s.current).toBe(1);
  });

  test('returns leveledUp: true when newLevel exceeds previousLevel', async () => {
    useUserStore.setState({
      profile: { username: 'Test', totalXP: 49, level: 1, gamesPlayed: 0 },
      streak: { current: 0, longest: 0, lastPlayDate: null },
      authState: 'anonymous',
      authedUserId: null,
    });
    const result = await recordMiniGameResult({ gameId: 'memory-match', score: 50, xp: 5 });
    expect(result.leveledUp).toBe(true);
    expect(useUserStore.getState().profile.level).toBe(2);
  });
});
