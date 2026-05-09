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

// Fallback questions if API fails (C3 expanded to 30+)
const FALLBACK_QUESTIONS: TriviaQuestion[] = [
  // ── Science ───────────────────────────────────────────────────────────
  { id: 'f-sc-1', category: 'Science', type: 'multiple', difficulty: 'easy',
    question: 'What planet is known as the Red Planet?',
    correct_answer: 'Mars',
    answers: ['Mars', 'Venus', 'Jupiter', 'Mercury'] },
  { id: 'f-sc-2', category: 'Science', type: 'multiple', difficulty: 'medium',
    question: 'What is the chemical symbol for Gold?',
    correct_answer: 'Au',
    answers: ['Au', 'Ag', 'Gd', 'Go'] },
  { id: 'f-sc-3', category: 'Science', type: 'multiple', difficulty: 'hard',
    question: 'How many bones are in the adult human body?',
    correct_answer: '206',
    answers: ['206', '208', '198', '212'] },
  { id: 'f-sc-4', category: 'Science', type: 'multiple', difficulty: 'easy',
    question: 'Which gas do plants absorb from the atmosphere?',
    correct_answer: 'Carbon dioxide',
    answers: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'] },
  { id: 'f-sc-5', category: 'Science', type: 'multiple', difficulty: 'medium',
    question: 'What is the speed of light in a vacuum (approximately)?',
    correct_answer: '300,000 km/s',
    answers: ['300,000 km/s', '150,000 km/s', '1,000,000 km/s', '3,000 km/s'] },
  { id: 'f-sc-6', category: 'Science', type: 'multiple', difficulty: 'hard',
    question: 'Who proposed the theory of general relativity?',
    correct_answer: 'Albert Einstein',
    answers: ['Albert Einstein', 'Isaac Newton', 'Niels Bohr', 'Stephen Hawking'] },

  // ── Technology ────────────────────────────────────────────────────────
  { id: 'f-tc-1', category: 'Technology', type: 'multiple', difficulty: 'easy',
    question: 'What does "HTML" stand for?',
    correct_answer: 'HyperText Markup Language',
    answers: ['HyperText Markup Language', 'Home Tool Markup Language', 'Hyper Transfer Markup Language', 'HyperText Management Language'] },
  { id: 'f-tc-2', category: 'Technology', type: 'multiple', difficulty: 'medium',
    question: 'Who is the co-founder of Microsoft?',
    correct_answer: 'Bill Gates',
    answers: ['Bill Gates', 'Steve Jobs', 'Mark Zuckerberg', 'Elon Musk'] },
  { id: 'f-tc-3', category: 'Technology', type: 'multiple', difficulty: 'medium',
    question: 'What does "CPU" stand for?',
    correct_answer: 'Central Processing Unit',
    answers: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Utility'] },
  { id: 'f-tc-4', category: 'Technology', type: 'multiple', difficulty: 'hard',
    question: 'In what year was the first iPhone released?',
    correct_answer: '2007',
    answers: ['2007', '2005', '2009', '2010'] },
  { id: 'f-tc-5', category: 'Technology', type: 'multiple', difficulty: 'easy',
    question: 'Which company makes the Pixel phone?',
    correct_answer: 'Google',
    answers: ['Google', 'Apple', 'Samsung', 'Sony'] },
  { id: 'f-tc-6', category: 'Technology', type: 'multiple', difficulty: 'medium',
    question: 'What programming language was created by Brendan Eich?',
    correct_answer: 'JavaScript',
    answers: ['JavaScript', 'Python', 'Java', 'Ruby'] },

  // ── History ───────────────────────────────────────────────────────────
  { id: 'f-hi-1', category: 'History', type: 'multiple', difficulty: 'easy',
    question: 'In what year did World War II end?',
    correct_answer: '1945',
    answers: ['1945', '1943', '1947', '1941'] },
  { id: 'f-hi-2', category: 'History', type: 'multiple', difficulty: 'medium',
    question: 'Who was the first President of the United States?',
    correct_answer: 'George Washington',
    answers: ['George Washington', 'Thomas Jefferson', 'John Adams', 'Abraham Lincoln'] },
  { id: 'f-hi-3', category: 'History', type: 'multiple', difficulty: 'hard',
    question: 'In what year did the Berlin Wall fall?',
    correct_answer: '1989',
    answers: ['1989', '1991', '1987', '1990'] },
  { id: 'f-hi-4', category: 'History', type: 'multiple', difficulty: 'medium',
    question: 'Which empire built Machu Picchu?',
    correct_answer: 'Inca',
    answers: ['Inca', 'Aztec', 'Maya', 'Olmec'] },
  { id: 'f-hi-5', category: 'History', type: 'multiple', difficulty: 'easy',
    question: 'What ancient wonder stood in Alexandria?',
    correct_answer: 'The Lighthouse',
    answers: ['The Lighthouse', 'The Colosseum', 'The Pyramids', 'The Parthenon'] },
  { id: 'f-hi-6', category: 'History', type: 'multiple', difficulty: 'hard',
    question: 'Who was the longest-reigning British monarch?',
    correct_answer: 'Elizabeth II',
    answers: ['Elizabeth II', 'Victoria', 'George III', 'Edward VII'] },

  // ── Sports ────────────────────────────────────────────────────────────
  { id: 'f-sp-1', category: 'Sports', type: 'boolean', difficulty: 'easy',
    question: 'The FIFA World Cup is held every 4 years.',
    correct_answer: 'True',
    answers: ['True', 'False'] },
  { id: 'f-sp-2', category: 'Sports', type: 'multiple', difficulty: 'medium',
    question: 'How many players are on a standard soccer team on the field?',
    correct_answer: '11',
    answers: ['11', '10', '12', '9'] },
  { id: 'f-sp-3', category: 'Sports', type: 'multiple', difficulty: 'easy',
    question: 'In what sport is "love" a score of zero?',
    correct_answer: 'Tennis',
    answers: ['Tennis', 'Cricket', 'Golf', 'Volleyball'] },
  { id: 'f-sp-4', category: 'Sports', type: 'multiple', difficulty: 'hard',
    question: 'Which country has won the most FIFA World Cups?',
    correct_answer: 'Brazil',
    answers: ['Brazil', 'Germany', 'Italy', 'Argentina'] },
  { id: 'f-sp-5', category: 'Sports', type: 'multiple', difficulty: 'medium',
    question: 'How many points is a touchdown worth in American football?',
    correct_answer: '6',
    answers: ['6', '7', '3', '5'] },
  { id: 'f-sp-6', category: 'Sports', type: 'multiple', difficulty: 'easy',
    question: 'In which sport is the Tour de France held?',
    correct_answer: 'Cycling',
    answers: ['Cycling', 'Running', 'Triathlon', 'Skiing'] },

  // ── Pop Culture ───────────────────────────────────────────────────────
  { id: 'f-pp-1', category: 'Pop Culture', type: 'multiple', difficulty: 'easy',
    question: 'Who sang "Shape of You"?',
    correct_answer: 'Ed Sheeran',
    answers: ['Ed Sheeran', 'Justin Bieber', 'Charlie Puth', 'Sam Smith'] },
  { id: 'f-pp-2', category: 'Pop Culture', type: 'multiple', difficulty: 'medium',
    question: 'Which film won Best Picture at the 2020 Oscars?',
    correct_answer: 'Parasite',
    answers: ['Parasite', '1917', 'Joker', 'Once Upon a Time in Hollywood'] },
  { id: 'f-pp-3', category: 'Pop Culture', type: 'multiple', difficulty: 'easy',
    question: 'Who plays Tony Stark in the Marvel films?',
    correct_answer: 'Robert Downey Jr.',
    answers: ['Robert Downey Jr.', 'Chris Evans', 'Mark Ruffalo', 'Chris Hemsworth'] },
  { id: 'f-pp-4', category: 'Pop Culture', type: 'multiple', difficulty: 'hard',
    question: 'What is the name of the wizarding school in Harry Potter?',
    correct_answer: 'Hogwarts',
    answers: ['Hogwarts', 'Beauxbatons', 'Durmstrang', 'Ilvermorny'] },
  { id: 'f-pp-5', category: 'Pop Culture', type: 'multiple', difficulty: 'medium',
    question: 'Which TV show features Walter White?',
    correct_answer: 'Breaking Bad',
    answers: ['Breaking Bad', 'The Wire', 'Better Call Saul', 'Ozark'] },
  { id: 'f-pp-6', category: 'Pop Culture', type: 'multiple', difficulty: 'easy',
    question: 'Which streaming service produced "Stranger Things"?',
    correct_answer: 'Netflix',
    answers: ['Netflix', 'Disney+', 'HBO Max', 'Prime Video'] },

  // ── Mixed / General Knowledge ─────────────────────────────────────────
  { id: 'f-gk-1', category: 'General Knowledge', type: 'multiple', difficulty: 'easy',
    question: 'What is the capital of France?',
    correct_answer: 'Paris',
    answers: ['Paris', 'London', 'Berlin', 'Madrid'] },
  { id: 'f-gk-2', category: 'General Knowledge', type: 'multiple', difficulty: 'medium',
    question: 'How many continents are there?',
    correct_answer: '7',
    answers: ['7', '6', '5', '8'] },
  { id: 'f-gk-3', category: 'General Knowledge', type: 'multiple', difficulty: 'easy',
    question: 'Which is the largest ocean on Earth?',
    correct_answer: 'Pacific',
    answers: ['Pacific', 'Atlantic', 'Indian', 'Arctic'] },
  { id: 'f-gk-4', category: 'General Knowledge', type: 'multiple', difficulty: 'medium',
    question: 'Mount Everest is in which mountain range?',
    correct_answer: 'Himalayas',
    answers: ['Himalayas', 'Andes', 'Alps', 'Rockies'] },
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
    // Shuffle questions AND shuffle each question's answers — the static
    // bank lists the correct answer first, which would otherwise leak.
    return shuffleArray(FALLBACK_QUESTIONS)
      .slice(0, count)
      .map((q) => ({ ...q, answers: shuffleArray(q.answers) }));
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
