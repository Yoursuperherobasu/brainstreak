import { fetchTriviaQuestions, TriviaQuestion } from '@/lib/trivia';
import { Config } from '@/constants/config';

export interface PrefetchInput {
  currentIndex: number;
  totalQuestions: number;
  alreadyPrefetched: boolean;
  triggerAtIndex?: number;
}

export function shouldPrefetch(input: PrefetchInput): boolean {
  const trigger = input.triggerAtIndex ?? Math.floor(input.totalQuestions / 2);
  if (input.alreadyPrefetched) return false;
  return input.currentIndex >= trigger;
}

export async function prefetchNextRound(
  category: string,
  difficulty: 'easy' | 'medium' | 'hard' | 'any' = 'any'
): Promise<TriviaQuestion[]> {
  return fetchTriviaQuestions(Config.QUESTIONS_PER_GAME, category, difficulty);
}
