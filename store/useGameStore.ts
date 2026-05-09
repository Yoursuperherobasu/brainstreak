import { create } from 'zustand';
import { TriviaQuestion, RoundResult, calculatePoints, calculateXP } from '@/lib/trivia';
import { updateStreakAfterGame, updateXP, recordGame } from '@/lib/storage';
import { Config } from '@/constants/config';

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

  startGame: (questions: TriviaQuestion[], category: string) => void;
  selectAnswer: (answer: string, timeTaken: number) => void;
  nextQuestion: () => void;
  finishGame: () => Promise<void>;
  resetGame: () => void;
  setTimeLeft: (t: number) => void;
  timeExpired: () => void;
  setPrefetched: (questions: TriviaQuestion[], category: string) => void;
  consumePrefetched: () => { questions: TriviaQuestion[]; category: string } | null;
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

    // A9: capture pre-game level so we can detect a level-up.
    // require() avoids a circular import between the two stores.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useUserStore } = require('@/store/useUserStore');
    const previousLevel: number = useUserStore.getState().profile.level;

    try {
      const streak = await updateStreakAfterGame();
      const xp = calculateXP(totalScore, streak.current);
      const updatedProfile = await updateXP(xp);

      // A11: persist this game to the recent-games ring buffer.
      await recordGame({
        category,
        score: totalScore,
        xp,
        correct: correctCount,
        total: questions.length,
        at: new Date().toISOString(),
      });

      // A8: set phase + xpEarned + leveledUp atomically so the recap renders
      // the final values on first paint (no +0 XP flicker).
      set({
        phase: 'gameover',
        xpEarned: xp,
        leveledUp: updatedProfile.level > previousLevel,
      });

      // Sync useUserStore in-memory copy with persisted state.
      useUserStore.getState().setProfile(updatedProfile);
      useUserStore.getState().setStreak(streak);
      // Cloud push is best-effort and must not block the UI.
      useUserStore.getState().pushIfAuthed().catch(() => {});
    } catch (err) {
      console.warn('[GameStore] Failed to save results:', err);
      // Still advance to recap so the player isn't stuck on the last question.
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
}));
