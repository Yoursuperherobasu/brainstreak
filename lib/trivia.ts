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

  // ── Science (additions) ────────────────────────────────────────────────
  { id: 'f-sc-9',  category: 'Science', type: 'multiple', difficulty: 'easy',
    question: 'What part of the eye controls how much light enters?',
    correct_answer: 'Iris',
    answers: ['Iris', 'Cornea', 'Retina', 'Lens'] },
  { id: 'f-sc-10', category: 'Science', type: 'multiple', difficulty: 'medium',
    question: 'Which planet has the most moons (as of 2025)?',
    correct_answer: 'Saturn',
    answers: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'] },
  { id: 'f-sc-11', category: 'Science', type: 'multiple', difficulty: 'hard',
    question: 'What is the powerhouse of the cell?',
    correct_answer: 'Mitochondria',
    answers: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi'] },
  { id: 'f-sc-12', category: 'Science', type: 'multiple', difficulty: 'easy',
    question: 'What gas do humans exhale?',
    correct_answer: 'Carbon dioxide',
    answers: ['Carbon dioxide', 'Oxygen', 'Hydrogen', 'Helium'] },
  { id: 'f-sc-13', category: 'Science', type: 'multiple', difficulty: 'medium',
    question: 'What is the boiling point of water at sea level (°C)?',
    correct_answer: '100',
    answers: ['100', '90', '120', '212'] },
  { id: 'f-sc-14', category: 'Science', type: 'multiple', difficulty: 'hard',
    question: 'Which scientist proposed the theory of general relativity?',
    correct_answer: 'Einstein',
    answers: ['Einstein', 'Newton', 'Bohr', 'Hawking'] },
  { id: 'f-sc-15', category: 'Science', type: 'multiple', difficulty: 'medium',
    question: 'What is the chemical symbol for sodium?',
    correct_answer: 'Na',
    answers: ['Na', 'So', 'Sd', 'S'] },
  { id: 'f-sc-16', category: 'Science', type: 'multiple', difficulty: 'easy',
    question: 'How many planets are in our solar system?',
    correct_answer: '8',
    answers: ['8', '7', '9', '10'] },

  // ── History (additions) ────────────────────────────────────────────────
  { id: 'f-hi-5',  category: 'History', type: 'multiple', difficulty: 'easy',
    question: 'Who was the first President of the United States?',
    correct_answer: 'George Washington',
    answers: ['George Washington', 'Abraham Lincoln', 'John Adams', 'Thomas Jefferson'] },
  { id: 'f-hi-6',  category: 'History', type: 'multiple', difficulty: 'medium',
    question: 'In which year did the Berlin Wall fall?',
    correct_answer: '1989',
    answers: ['1989', '1991', '1987', '1985'] },
  { id: 'f-hi-7',  category: 'History', type: 'multiple', difficulty: 'hard',
    question: 'Who painted "The Last Supper"?',
    correct_answer: 'Leonardo da Vinci',
    answers: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Donatello'] },
  { id: 'f-hi-8',  category: 'History', type: 'multiple', difficulty: 'easy',
    question: 'Which civilization built the pyramids of Giza?',
    correct_answer: 'Egyptian',
    answers: ['Egyptian', 'Roman', 'Greek', 'Mayan'] },
  { id: 'f-hi-9',  category: 'History', type: 'multiple', difficulty: 'medium',
    question: 'The French Revolution began in what year?',
    correct_answer: '1789',
    answers: ['1789', '1799', '1776', '1812'] },
  { id: 'f-hi-10', category: 'History', type: 'multiple', difficulty: 'hard',
    question: 'Which empire was ruled by Genghis Khan?',
    correct_answer: 'Mongol',
    answers: ['Mongol', 'Ottoman', 'Persian', 'Roman'] },

  // ── Tech (additions) ───────────────────────────────────────────────────
  { id: 'f-te-4', category: 'Tech', type: 'multiple', difficulty: 'easy',
    question: 'What does "HTTP" stand for?',
    correct_answer: 'HyperText Transfer Protocol',
    answers: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'Hyper Transfer Text Protocol', 'Home Tool Transfer Protocol'] },
  { id: 'f-te-5', category: 'Tech', type: 'multiple', difficulty: 'medium',
    question: 'Who co-founded Apple alongside Steve Jobs?',
    correct_answer: 'Steve Wozniak',
    answers: ['Steve Wozniak', 'Bill Gates', 'Tim Cook', 'Jonathan Ive'] },
  { id: 'f-te-6', category: 'Tech', type: 'multiple', difficulty: 'hard',
    question: 'Which language compiles to "bytecode" that runs on the JVM?',
    correct_answer: 'Java',
    answers: ['Java', 'C++', 'Python', 'Rust'] },
  { id: 'f-te-7', category: 'Tech', type: 'multiple', difficulty: 'easy',
    question: 'What does "RAM" stand for?',
    correct_answer: 'Random Access Memory',
    answers: ['Random Access Memory', 'Read All Memory', 'Run And Manage', 'Rapid Active Module'] },
  { id: 'f-te-8', category: 'Tech', type: 'multiple', difficulty: 'medium',
    question: 'Which company created the Android operating system originally?',
    correct_answer: 'Android Inc.',
    answers: ['Android Inc.', 'Google', 'Samsung', 'Microsoft'] },
  { id: 'f-te-9', category: 'Tech', type: 'multiple', difficulty: 'hard',
    question: 'What does "API" stand for?',
    correct_answer: 'Application Programming Interface',
    answers: ['Application Programming Interface', 'Applied Programming Interface', 'Advanced Program Interface', 'App Process Interface'] },

  // ── Pop culture (additions) ────────────────────────────────────────────
  { id: 'f-po-4', category: 'Pop Culture', type: 'multiple', difficulty: 'easy',
    question: 'Which artist released the album "1989"?',
    correct_answer: 'Taylor Swift',
    answers: ['Taylor Swift', 'Beyoncé', 'Adele', 'Rihanna'] },
  { id: 'f-po-5', category: 'Pop Culture', type: 'multiple', difficulty: 'medium',
    question: 'In Harry Potter, what is the name of Harry\'s owl?',
    correct_answer: 'Hedwig',
    answers: ['Hedwig', 'Errol', 'Pigwidgeon', 'Crookshanks'] },
  { id: 'f-po-6', category: 'Pop Culture', type: 'multiple', difficulty: 'easy',
    question: 'Which streaming service produced "Stranger Things"?',
    correct_answer: 'Netflix',
    answers: ['Netflix', 'Disney+', 'HBO Max', 'Prime Video'] },
  { id: 'f-po-7', category: 'Pop Culture', type: 'multiple', difficulty: 'hard',
    question: 'Who directed the 2019 film "Parasite"?',
    correct_answer: 'Bong Joon-ho',
    answers: ['Bong Joon-ho', 'Park Chan-wook', 'Hayao Miyazaki', 'Christopher Nolan'] },
  { id: 'f-po-8', category: 'Pop Culture', type: 'multiple', difficulty: 'medium',
    question: 'In "The Office" (US), what paper company does the show center on?',
    correct_answer: 'Dunder Mifflin',
    answers: ['Dunder Mifflin', 'Vance Refrigeration', 'Schrute Farms', 'Sabre'] },
  { id: 'f-po-9', category: 'Pop Culture', type: 'multiple', difficulty: 'easy',
    question: 'Which superhero is also known as "The Caped Crusader"?',
    correct_answer: 'Batman',
    answers: ['Batman', 'Superman', 'Spider-Man', 'Iron Man'] },

  // ── GK (additions) ─────────────────────────────────────────────────────
  { id: 'f-gk-5',  category: 'General Knowledge', type: 'multiple', difficulty: 'easy',
    question: 'How many sides does a hexagon have?',
    correct_answer: '6',
    answers: ['6', '5', '7', '8'] },
  { id: 'f-gk-6',  category: 'General Knowledge', type: 'multiple', difficulty: 'medium',
    question: 'What is the currency of Japan?',
    correct_answer: 'Yen',
    answers: ['Yen', 'Won', 'Yuan', 'Rupee'] },
  { id: 'f-gk-7',  category: 'General Knowledge', type: 'multiple', difficulty: 'hard',
    question: 'Which is the longest river in the world?',
    correct_answer: 'Nile',
    answers: ['Nile', 'Amazon', 'Yangtze', 'Mississippi'] },
  { id: 'f-gk-8',  category: 'General Knowledge', type: 'multiple', difficulty: 'easy',
    question: 'How many minutes are in a full day?',
    correct_answer: '1440',
    answers: ['1440', '720', '2400', '1200'] },
  { id: 'f-gk-9',  category: 'General Knowledge', type: 'multiple', difficulty: 'medium',
    question: 'What is the smallest country in the world by area?',
    correct_answer: 'Vatican City',
    answers: ['Vatican City', 'Monaco', 'San Marino', 'Liechtenstein'] },
  { id: 'f-gk-10', category: 'General Knowledge', type: 'multiple', difficulty: 'hard',
    question: 'Which planet has a day longer than its year?',
    correct_answer: 'Venus',
    answers: ['Venus', 'Mercury', 'Mars', 'Jupiter'] },
  { id: 'f-gk-11', category: 'General Knowledge', type: 'multiple', difficulty: 'easy',
    question: 'How many colors are in a rainbow?',
    correct_answer: '7',
    answers: ['7', '6', '8', '5'] },
  { id: 'f-gk-12', category: 'General Knowledge', type: 'multiple', difficulty: 'medium',
    question: 'Which famous landmark is in Paris, France?',
    correct_answer: 'Eiffel Tower',
    answers: ['Eiffel Tower', 'Big Ben', 'Colosseum', 'Statue of Liberty'] },

  // ── Math (additions) ───────────────────────────────────────────────────
  { id: 'f-ma-1', category: 'Math', type: 'multiple', difficulty: 'easy',
    question: 'What is 12 × 12?',
    correct_answer: '144',
    answers: ['144', '124', '142', '154'] },
  { id: 'f-ma-2', category: 'Math', type: 'multiple', difficulty: 'medium',
    question: 'What is the square root of 169?',
    correct_answer: '13',
    answers: ['13', '12', '14', '15'] },
  { id: 'f-ma-3', category: 'Math', type: 'multiple', difficulty: 'hard',
    question: 'What is 15% of 200?',
    correct_answer: '30',
    answers: ['30', '20', '25', '35'] },
  { id: 'f-ma-4', category: 'Math', type: 'multiple', difficulty: 'easy',
    question: 'What is the value of π (rounded to two decimals)?',
    correct_answer: '3.14',
    answers: ['3.14', '3.41', '2.14', '3.04'] },
  { id: 'f-ma-5', category: 'Math', type: 'multiple', difficulty: 'medium',
    question: 'How many degrees are in a right angle?',
    correct_answer: '90',
    answers: ['90', '60', '120', '180'] },

  // ── Sports (additions) ─────────────────────────────────────────────────
  { id: 'f-sp-1', category: 'Sports', type: 'multiple', difficulty: 'easy',
    question: 'How many players are on a basketball team on the court?',
    correct_answer: '5',
    answers: ['5', '6', '7', '4'] },
  { id: 'f-sp-2', category: 'Sports', type: 'multiple', difficulty: 'medium',
    question: 'In which sport would you perform a "slam dunk"?',
    correct_answer: 'Basketball',
    answers: ['Basketball', 'Volleyball', 'Tennis', 'Football'] },
  { id: 'f-sp-3', category: 'Sports', type: 'multiple', difficulty: 'hard',
    question: 'Where were the 2024 Summer Olympics held?',
    correct_answer: 'Paris',
    answers: ['Paris', 'Tokyo', 'Los Angeles', 'London'] },
  { id: 'f-sp-4', category: 'Sports', type: 'multiple', difficulty: 'easy',
    question: 'How many rings are on the Olympic flag?',
    correct_answer: '5',
    answers: ['5', '4', '6', '7'] },
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
