// ─── Open Trivia Database API ────────────────────────────────────────────────
// Free, no auth required. 4000+ questions across categories.

export interface TriviaQuestion {
  id: string;
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  answers: string[]; // shuffled, includes correct
}

interface OTDBResponse {
  response_code: number;
  results: Array<{
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }>;
}

function decodeHTML(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&eacute;/g, 'é')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Map category IDs to OTDB API numbers
const CATEGORY_MAP: Record<string, number> = {
  mixed: 0,
  science: 17,
  history: 23,
  tech: 18,
  sports: 21,
  pop: 11,
};

// Fallback questions if API fails
const FALLBACK_QUESTIONS: TriviaQuestion[] = [
  {
    id: 'f1',
    category: 'Science',
    type: 'multiple',
    difficulty: 'medium',
    question: 'What is the chemical symbol for Gold?',
    correct_answer: 'Au',
    answers: ['Au', 'Ag', 'Gd', 'Go'],
  },
  {
    id: 'f2',
    category: 'Technology',
    type: 'multiple',
    difficulty: 'easy',
    question: 'What does "HTML" stand for?',
    correct_answer: 'HyperText Markup Language',
    answers: ['HyperText Markup Language', 'Home Tool Markup Language', 'Hyper Transfer Markup Language', 'HyperText Management Language'],
  },
  {
    id: 'f3',
    category: 'History',
    type: 'multiple',
    difficulty: 'medium',
    question: 'In what year did World War II end?',
    correct_answer: '1945',
    answers: ['1945', '1943', '1947', '1941'],
  },
  {
    id: 'f4',
    category: 'Sports',
    type: 'boolean',
    difficulty: 'easy',
    question: 'The FIFA World Cup is held every 4 years.',
    correct_answer: 'True',
    answers: ['True', 'False'],
  },
  {
    id: 'f5',
    category: 'Pop Culture',
    type: 'multiple',
    difficulty: 'easy',
    question: 'Who sang "Shape of You"?',
    correct_answer: 'Ed Sheeran',
    answers: ['Ed Sheeran', 'Justin Bieber', 'Charlie Puth', 'Sam Smith'],
  },
];

export async function fetchTriviaQuestions(
  count: number = 5,
  categoryId: string = 'mixed',
  difficulty: 'easy' | 'medium' | 'hard' | 'any' = 'any'
): Promise<TriviaQuestion[]> {
  try {
    const catNum = CATEGORY_MAP[categoryId] ?? 0;
    let url = `https://opentdb.com/api.php?amount=${count}&type=multiple`;
    if (catNum > 0) url += `&category=${catNum}`;
    if (difficulty !== 'any') url += `&difficulty=${difficulty}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: OTDBResponse = await res.json();

    if (data.response_code !== 0 || !data.results?.length) {
      throw new Error(`OTDB code ${data.response_code}`);
    }

    return data.results.map((q, i) => ({
      id: `q_${Date.now()}_${i}`,
      category: decodeHTML(q.category),
      type: q.type as 'multiple' | 'boolean',
      difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
      question: decodeHTML(q.question),
      correct_answer: decodeHTML(q.correct_answer),
      answers: shuffleArray([
        decodeHTML(q.correct_answer),
        ...q.incorrect_answers.map(decodeHTML),
      ]),
    }));
  } catch (err) {
    console.warn('[Trivia] API failed, using fallback:', err);
    return shuffleArray(FALLBACK_QUESTIONS).slice(0, count);
  }
}

// ─── Score Calculation ───────────────────────────────────────────────────────
export interface RoundResult {
  question: TriviaQuestion;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeTaken: number; // seconds
  pointsEarned: number;
}

export function calculatePoints(
  isCorrect: boolean,
  difficulty: string,
  timeTaken: number,
  roundTimeLimit: number = 15
): number {
  if (!isCorrect) return 0;

  const basePoints: Record<string, number> = { easy: 100, medium: 150, hard: 250 };
  const base = basePoints[difficulty] ?? 150;

  // Speed bonus: up to 50% extra for fast answers
  const timeRatio = Math.max(0, (roundTimeLimit - timeTaken) / roundTimeLimit);
  const speedBonus = Math.floor(base * 0.5 * timeRatio);

  return base + speedBonus;
}

export function calculateXP(score: number, streak: number): number {
  const streakMultiplier = Math.min(1 + streak * 0.1, 2.0); // Max 2x at streak 10
  return Math.floor(score * streakMultiplier * 0.1);
}

export function getLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function getXPForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 50;
}
