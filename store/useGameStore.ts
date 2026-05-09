import { create } from 'zustand';
import { TriviaQuestion, RoundResult, calculatePoints, calculateXP } from '@/lib/trivia';
import { updateStreakAfterGame, updateXP } from '@/lib/storage';
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
    const { totalScore, correctCount } = get();
    set({ phase: 'gameover' });

    try {
      const streak = await updateStreakAfterGame();
      const xp = calculateXP(totalScore, streak.current);
      await updateXP(xp);
      set({ xpEarned: xp });
    } catch (err) {
      console.warn('[GameStore] Failed to save results:', err);
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
