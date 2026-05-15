import { create } from 'zustand';
import { TriviaQuestion, RoundResult, calculatePoints, calculateXP, getLevelFromXP } from '@/lib/trivia';
import { computeStreakAfterGame, recordGame, todayISO, yesterdayISO, type LocalProfile } from '@/lib/storage';
import { Config } from '@/constants/config';
import { evaluate } from '@/lib/achievements';
import { useAchievementsStore } from '@/store/useAchievementsStore';

export type GamePhase = 'idle' | 'countdown' | 'playing' | 'result' | 'gameover';

interface GameState {
  phase: GamePhase;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'any';

  questions: TriviaQuestion[];
  currentIndex: number;
  currentQuestion: TriviaQuestion | null;

  selectedAnswer: string | null;
  timeLeft: number;
  roundResults: RoundResult[];

  totalScore: number;
  xpEarned: number;
  correctCount: number;
  leveledUp: boolean; // A9: drives confetti on recap

  prefetchedQuestions: TriviaQuestion[] | null;
  prefetchedCategory: string | null;

  pendingAchievementIds: string[];
  newBest: boolean;
  previousBest: number;

  startGame: (questions: TriviaQuestion[], category: string) => void;
  selectAnswer: (answer: string, timeTaken: number) => void;
  nextQuestion: () => void;
  finishGame: () => Promise<void>;
  resetGame: () => void;
  setTimeLeft: (t: number) => void;
  timeExpired: () => void;
  setPrefetched: (questions: TriviaQuestion[], category: string) => void;
  consumePrefetched: () => { questions: TriviaQuestion[]; category: string } | null;
  clearPendingAchievements: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  category: 'mixed',
  difficulty: 'any',
  questions: [],
  currentIndex: 0,
  currentQuestion: null,
  selectedAnswer: null,
  timeLeft: Config.ROUND_TIME_SECONDS,
  roundResults: [],
  totalScore: 0,
  xpEarned: 0,
  correctCount: 0,
  leveledUp: false,
  prefetchedQuestions: null,
  prefetchedCategory: null,
  pendingAchievementIds: [],
  newBest: false,
  previousBest: 0,

  startGame: (questions, category) => {
    set({
      phase: 'countdown',
      questions,
      category,
      currentIndex: 0,
      currentQuestion: questions[0] ?? null,
      selectedAnswer: null,
      timeLeft: Config.ROUND_TIME_SECONDS,
      roundResults: [],
      totalScore: 0,
      xpEarned: 0,
      correctCount: 0,
      leveledUp: false,
    });
    setTimeout(() => set({ phase: 'playing' }), Config.COUNTDOWN_SECONDS * 1000);
  },

  selectAnswer: (answer, timeTaken) => {
    const { currentQuestion, totalScore, roundResults, correctCount } = get();
    if (!currentQuestion || get().selectedAnswer !== null) return;

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = calculatePoints(isCorrect, currentQuestion.difficulty, timeTaken);
    const newScore = totalScore + points;

    const result: RoundResult = {
      question: currentQuestion,
      selectedAnswer: answer,
      isCorrect,
      timeTaken,
      pointsEarned: points,
    };

    set({
      selectedAnswer: answer,
      totalScore: newScore,
      correctCount: isCorrect ? correctCount + 1 : correctCount,
      roundResults: [...roundResults, result],
      phase: 'result',
    });
  },

  timeExpired: () => {
    const { currentQuestion, roundResults } = get();
    if (!currentQuestion || get().selectedAnswer !== null) return;

    const result: RoundResult = {
      question: currentQuestion,
      selectedAnswer: null,
      isCorrect: false,
      timeTaken: Config.ROUND_TIME_SECONDS,
      pointsEarned: 0,
    };

    set({
      selectedAnswer: null,
      roundResults: [...roundResults, result],
      phase: 'result',
    });
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    const next = currentIndex + 1;

    if (next >= questions.length) {
      get().finishGame();
    } else {
      set({
        currentIndex: next,
        currentQuestion: questions[next],
        selectedAnswer: null,
        timeLeft: Config.ROUND_TIME_SECONDS,
        phase: 'playing',
      });
    }
  },

  finishGame: async () => {
    const { totalScore, correctCount, category, questions } = get();

    // Zustand owns profile + streak. We READ the current values from
    // useUserStore, compute the new values in memory, and write them back
    // ONCE via setProfile/setStreak. The legacy lib/storage helpers
    // (updateXP, updateStreakAfterGame) collide with Zustand's persist key
    // and corrupt state to NaN — we no longer call them.
    // require() avoids a circular import between the two stores.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useUserStore } = require('@/store/useUserStore');
    const user = useUserStore.getState();
    const previousLevel: number = user.profile.level;
    const previousStreak = user.streak;

    try {
      // 1. Pure streak math from the in-memory streak.
      const newStreak = computeStreakAfterGame(previousStreak, todayISO(), yesterdayISO());

      // 2. XP for this round (streak-multiplied).
      const xp = calculateXP(totalScore, newStreak.current);

      // 3. Updated profile (derive level from totalXP — no drift).
      const newTotalXP = user.profile.totalXP + xp;
      const updatedProfile: LocalProfile = {
        ...user.profile,
        totalXP: newTotalXP,
        level: getLevelFromXP(newTotalXP),
        gamesPlayed: user.profile.gamesPlayed + 1,
      };

      // 4. Append to the recent-games ring buffer (separate key — safe).
      const recent = await recordGame({
        category,
        score: totalScore,
        xp,
        correct: correctCount,
        total: questions.length,
        at: new Date().toISOString(),
      });

      // 5. Evaluate achievements on the post-game snapshot.
      const unlockedIds = evaluate({ profile: updatedProfile, streak: newStreak, recent });
      const fresh = useAchievementsStore.getState().recordUnlocked(unlockedIds);

      // 6. Brain Rush personal best.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { usePersonalBestStore } = require('@/store/usePersonalBestStore');
      const pb = usePersonalBestStore.getState().recordScore('brain-rush', totalScore);

      // 7. Atomic recap update (phase + xp + level-up + pending unlocks + pb).
      set({
        phase: 'gameover',
        xpEarned: xp,
        leveledUp: updatedProfile.level > previousLevel,
        newBest: pb.wasNewBest,
        previousBest: pb.previousBest,
        ...(fresh.length > 0 ? { pendingAchievementIds: fresh } : {}),
      });

      // 8. Commit to Zustand-persisted state.
      user.setProfile(updatedProfile);
      user.setStreak(newStreak);

      // 9. Cloud push is best-effort and must not block the UI.
      user.pushIfAuthed().catch(() => {});
    } catch (err) {
      if (__DEV__) console.warn('[GameStore] Failed to save results:', err);
      set({ phase: 'gameover' });
    }
  },

  resetGame: () => {
    set({
      phase: 'idle',
      questions: [],
      currentIndex: 0,
      currentQuestion: null,
      selectedAnswer: null,
      timeLeft: Config.ROUND_TIME_SECONDS,
      roundResults: [],
      totalScore: 0,
      xpEarned: 0,
      correctCount: 0,
      leveledUp: false,
      newBest: false,
      previousBest: 0,
    });
  },

  setTimeLeft: (t) => set({ timeLeft: t }),

  setPrefetched: (questions, category) =>
    set({ prefetchedQuestions: questions, prefetchedCategory: category }),

  consumePrefetched: () => {
    const { prefetchedQuestions, prefetchedCategory } = get();
    if (!prefetchedQuestions || !prefetchedCategory) return null;
    set({ prefetchedQuestions: null, prefetchedCategory: null });
    return { questions: prefetchedQuestions, category: prefetchedCategory };
  },

  clearPendingAchievements: () => set({ pendingAchievementIds: [] }),
}));
