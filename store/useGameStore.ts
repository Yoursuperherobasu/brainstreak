import { create } from 'zustand';
import { TriviaQuestion, RoundResult, calculatePoints, calculateXP } from '@/lib/trivia';
import { updateStreakAfterGame, updateXP } from '@/lib/storage';

export type GamePhase = 'idle' | 'countdown' | 'playing' | 'result' | 'gameover';

interface GameState {
  // Session info
  phase: GamePhase;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'any';

  // Questions
  questions: TriviaQuestion[];
  currentIndex: number;
  currentQuestion: TriviaQuestion | null;

  // Round state
  selectedAnswer: string | null;
  timeLeft: number;
  roundResults: RoundResult[];

  // Totals
  totalScore: number;
  xpEarned: number;
  correctCount: number;

  // Actions
  startGame: (questions: TriviaQuestion[], category: string) => void;
  selectAnswer: (answer: string, timeTaken: number) => void;
  nextQuestion: () => void;
  finishGame: () => Promise<void>;
  resetGame: () => void;
  setTimeLeft: (t: number) => void;
  timeExpired: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  category: 'mixed',
  difficulty: 'any',
  questions: [],
  currentIndex: 0,
  currentQuestion: null,
  selectedAnswer: null,
  timeLeft: 15,
  roundResults: [],
  totalScore: 0,
  xpEarned: 0,
  correctCount: 0,

  startGame: (questions, category) => {
    set({
      phase: 'countdown',
      questions,
      category,
      currentIndex: 0,
      currentQuestion: questions[0] ?? null,
      selectedAnswer: null,
      timeLeft: 15,
      roundResults: [],
      totalScore: 0,
      xpEarned: 0,
      correctCount: 0,
    });
    // Brief countdown then playing
    setTimeout(() => set({ phase: 'playing' }), 3000);
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
      timeTaken: 15,
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
        timeLeft: 15,
        phase: 'playing',
      });
    }
  },

  finishGame: async () => {
    const { totalScore, correctCount } = get();
    set({ phase: 'gameover' });

    try {
      // Update streak and XP
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
      timeLeft: 15,
      roundResults: [],
      totalScore: 0,
      xpEarned: 0,
      correctCount: 0,
    });
  },

  setTimeLeft: (t) => set({ timeLeft: t }),
}));
