import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordGame, getRecentGames, RecentGame, StorageKeys } from '@/lib/storage';
import { Config } from '@/constants/config';

beforeEach(async () => {
  await AsyncStorage.clear();
});

const sample = (i: number): RecentGame => ({
  category: 'mixed',
  score: 100 + i,
  xp: 10 + i,
  correct: 4,
  total: 5,
  at: `2026-05-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
});

describe('recordGame / getRecentGames', () => {
  test('empty store returns []', async () => {
    expect(await getRecentGames()).toEqual([]);
  });

  test('records prepend (newest first)', async () => {
    await recordGame(sample(0));
    await recordGame(sample(1));
    const list = await getRecentGames();
    expect(list[0].score).toBe(101);
    expect(list[1].score).toBe(100);
  });

  test('keeps at most Config.MAX_RECENT_GAMES', async () => {
    for (let i = 0; i < Config.MAX_RECENT_GAMES + 5; i++) {
      await recordGame(sample(i));
    }
    const list = await getRecentGames();
    expect(list.length).toBe(Config.MAX_RECENT_GAMES);
    // Newest is the last one we wrote.
    expect(list[0].score).toBe(100 + (Config.MAX_RECENT_GAMES + 5) - 1);
  });

  test('persists across calls (uses AsyncStorage)', async () => {
    await recordGame(sample(7));
    const raw = await AsyncStorage.getItem(StorageKeys.RECENT_GAMES);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed[0].score).toBe(107);
  });

  test('survives a corrupted entry by returning []', async () => {
    await AsyncStorage.setItem(StorageKeys.RECENT_GAMES, '{"oops": "not an array"}');
    expect(await getRecentGames()).toEqual([]);
  });
});
