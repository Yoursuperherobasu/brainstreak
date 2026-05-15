// Local question generators for Brain Rush.
// We don't depend on Open Trivia DB for these — math is generated, English
// and GK are pulled from a small bundled bank. Each generator returns a
// TriviaQuestion-shaped object so the existing game loop can use it.

import { TriviaQuestion } from '@/lib/trivia';

type Difficulty = 'easy' | 'medium' | 'hard';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function levelToDifficulty(level: number): Difficulty {
  if (level >= 4) return 'hard';
  if (level >= 2) return 'medium';
  return 'easy';
}

// ─── Math ────────────────────────────────────────────────────────────────────

export function generateMath(level: number): TriviaQuestion {
  const difficulty = levelToDifficulty(level);

  // Range scales with difficulty so easy stays mental-math, hard pushes higher.
  const range = difficulty === 'hard' ? 50 : difficulty === 'medium' ? 20 : 12;
  const ops: Array<'+' | '-' | '×' | '÷'> =
    difficulty === 'easy' ? ['+', '-'] :
    difficulty === 'medium' ? ['+', '-', '×'] :
    ['+', '-', '×', '÷'];

  const op = pick(ops);
  let a = Math.floor(Math.random() * range) + 1;
  let b = Math.floor(Math.random() * range) + 1;

  let correct: number;
  switch (op) {
    case '+': correct = a + b; break;
    case '-': correct = a - b; break;
    case '×': correct = a * b; break;
    case '÷': {
      // Force clean division: pick b then product, ask product / b.
      b = Math.floor(Math.random() * 11) + 2;
      const product = b * (Math.floor(Math.random() * 11) + 1);
      a = product;
      correct = product / b;
      break;
    }
  }

  // 3 plausible distractors near the correct answer.
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const offset = Math.floor(Math.random() * 6) + 1;
    const sign = Math.random() < 0.5 ? -1 : 1;
    const v = correct + sign * offset;
    if (v !== correct) distractors.add(v);
  }
  const all = shuffle([correct, ...Array.from(distractors)]).map(String);

  return {
    id: `math_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'Math',
    type: 'multiple',
    difficulty,
    question: `${a} ${op} ${b} = ?`,
    correct_answer: String(correct),
    answers: all,
  };
}

// ─── English ─────────────────────────────────────────────────────────────────

interface EnglishItem {
  prompt: string;
  correct: string;
  distractors: string[];
  difficulty: Difficulty;
}

const ENGLISH_BANK: EnglishItem[] = [
  // Easy — synonyms / opposites
  { prompt: 'A word that means "happy"', correct: 'Joyful', distractors: ['Lonely', 'Tired', 'Angry'], difficulty: 'easy' },
  { prompt: 'The opposite of "tall"', correct: 'Short', distractors: ['Wide', 'Heavy', 'Quick'], difficulty: 'easy' },
  { prompt: 'A word that means "fast"', correct: 'Quick', distractors: ['Slow', 'Late', 'Soft'], difficulty: 'easy' },
  { prompt: 'The opposite of "begin"', correct: 'End', distractors: ['Start', 'Open', 'Lift'], difficulty: 'easy' },
  { prompt: 'A word that means "small"', correct: 'Tiny', distractors: ['Huge', 'Bright', 'Loud'], difficulty: 'easy' },
  { prompt: 'The opposite of "hot"', correct: 'Cold', distractors: ['Wet', 'Sharp', 'Soft'], difficulty: 'easy' },
  { prompt: 'A word that means "easy"', correct: 'Simple', distractors: ['Tricky', 'Heavy', 'Steep'], difficulty: 'easy' },
  { prompt: 'A word that means "kind"', correct: 'Gentle', distractors: ['Cruel', 'Stale', 'Tense'], difficulty: 'easy' },

  // Medium — vocabulary
  { prompt: 'Means "to make something better"', correct: 'Improve', distractors: ['Reduce', 'Confuse', 'Defer'], difficulty: 'medium' },
  { prompt: 'Means "to ask for help"', correct: 'Request', distractors: ['Refuse', 'Resign', 'Recoil'], difficulty: 'medium' },
  { prompt: 'Means "very large"', correct: 'Enormous', distractors: ['Modest', 'Average', 'Petite'], difficulty: 'medium' },
  { prompt: 'A short note explaining something', correct: 'Memo', distractors: ['Mug', 'Mosaic', 'Magnet'], difficulty: 'medium' },
  { prompt: 'A person who travels into space', correct: 'Astronaut', distractors: ['Geologist', 'Conductor', 'Linguist'], difficulty: 'medium' },
  { prompt: 'Means "to dislike strongly"', correct: 'Loathe', distractors: ['Adore', 'Recall', 'Forge'], difficulty: 'medium' },
  { prompt: 'Means "happening every year"', correct: 'Annual', distractors: ['Casual', 'Random', 'Local'], difficulty: 'medium' },
  { prompt: 'A word that means "calm"', correct: 'Serene', distractors: ['Rowdy', 'Frantic', 'Brisk'], difficulty: 'medium' },

  // Hard — vocabulary
  { prompt: 'Means "to make something less severe"', correct: 'Mitigate', distractors: ['Magnify', 'Manifest', 'Mortgage'], difficulty: 'hard' },
  { prompt: 'Means "extremely talkative"', correct: 'Loquacious', distractors: ['Solemn', 'Diffident', 'Sedentary'], difficulty: 'hard' },
  { prompt: 'Means "lasting a very short time"', correct: 'Ephemeral', distractors: ['Eternal', 'Empirical', 'Eccentric'], difficulty: 'hard' },
  { prompt: 'Means "an obvious lie"', correct: 'Falsehood', distractors: ['Forecast', 'Folklore', 'Forerunner'], difficulty: 'hard' },
  { prompt: 'Means "to make something seem less important"', correct: 'Downplay', distractors: ['Promote', 'Intone', 'Refresh'], difficulty: 'hard' },
  { prompt: 'Means "deeply sorrowful"', correct: 'Forlorn', distractors: ['Festive', 'Forthright', 'Frugal'], difficulty: 'hard' },

  // Easy — additions
  { prompt: 'A word that means "big"', correct: 'Large', distractors: ['Tiny', 'Light', 'Late'], difficulty: 'easy' },
  { prompt: 'The opposite of "wet"', correct: 'Dry', distractors: ['Damp', 'Cool', 'Soft'], difficulty: 'easy' },
  { prompt: 'A word that means "smart"', correct: 'Clever', distractors: ['Loud', 'Slow', 'Dull'], difficulty: 'easy' },
  { prompt: 'The opposite of "noisy"', correct: 'Quiet', distractors: ['Busy', 'Bright', 'Heavy'], difficulty: 'easy' },
  { prompt: 'A word that means "brave"', correct: 'Bold', distractors: ['Shy', 'Sour', 'Soft'], difficulty: 'easy' },
  { prompt: 'The opposite of "rich"', correct: 'Poor', distractors: ['Plain', 'Pale', 'Pure'], difficulty: 'easy' },

  // Medium — additions
  { prompt: 'Means "to stay away from"', correct: 'Avoid', distractors: ['Accept', 'Adore', 'Adjust'], difficulty: 'medium' },
  { prompt: 'Means "very old or out-of-date"', correct: 'Obsolete', distractors: ['Optional', 'Operatic', 'Optimal'], difficulty: 'medium' },
  { prompt: 'Means "to bring together"', correct: 'Combine', distractors: ['Confide', 'Convict', 'Console'], difficulty: 'medium' },
  { prompt: 'Means "easy to understand"', correct: 'Clear', distractors: ['Cryptic', 'Cluttered', 'Crooked'], difficulty: 'medium' },
  { prompt: 'A person who studies the past', correct: 'Historian', distractors: ['Botanist', 'Plumber', 'Drummer'], difficulty: 'medium' },
  { prompt: 'Means "to make smaller"', correct: 'Reduce', distractors: ['Restore', 'Refute', 'Repress'], difficulty: 'medium' },

  // Hard — additions
  { prompt: 'Means "to praise highly"', correct: 'Laud', distractors: ['Loaf', 'Lash', 'Loll'], difficulty: 'hard' },
  { prompt: 'Means "stubbornly resistant"', correct: 'Obstinate', distractors: ['Obvious', 'Ornate', 'Ominous'], difficulty: 'hard' },
  { prompt: 'Means "of doubtful authenticity"', correct: 'Apocryphal', distractors: ['Anecdotal', 'Apoplectic', 'Apostate'], difficulty: 'hard' },
  { prompt: 'Means "to formally accuse"', correct: 'Indict', distractors: ['Induct', 'Imbue', 'Ingest'], difficulty: 'hard' },
  { prompt: 'Means "harmful or poisonous"', correct: 'Noxious', distractors: ['Notable', 'Nominal', 'Nautical'], difficulty: 'hard' },
  { prompt: 'Means "to put off until later"', correct: 'Postpone', distractors: ['Pursue', 'Predict', 'Preserve'], difficulty: 'hard' },
];

export function generateEnglish(level: number): TriviaQuestion {
  const difficulty = levelToDifficulty(level);
  const candidates = ENGLISH_BANK.filter((i) => i.difficulty === difficulty);
  const item = pick(candidates.length > 0 ? candidates : ENGLISH_BANK);
  const answers = shuffle([item.correct, ...item.distractors]);
  return {
    id: `eng_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'English',
    type: 'multiple',
    difficulty,
    question: item.prompt,
    correct_answer: item.correct,
    answers,
  };
}

// ─── General Knowledge ───────────────────────────────────────────────────────

interface GKItem {
  prompt: string;
  correct: string;
  distractors: string[];
  difficulty: Difficulty;
}

const GK_BANK: GKItem[] = [
  // Easy
  { prompt: 'Capital of France', correct: 'Paris', distractors: ['London', 'Berlin', 'Madrid'], difficulty: 'easy' },
  { prompt: 'Largest planet in the solar system', correct: 'Jupiter', distractors: ['Saturn', 'Mars', 'Earth'], difficulty: 'easy' },
  { prompt: 'How many continents are there?', correct: '7', distractors: ['5', '6', '8'], difficulty: 'easy' },
  { prompt: 'Color of grass', correct: 'Green', distractors: ['Blue', 'Red', 'Yellow'], difficulty: 'easy' },
  { prompt: 'How many days in a leap year?', correct: '366', distractors: ['365', '364', '367'], difficulty: 'easy' },
  { prompt: 'Largest ocean on Earth', correct: 'Pacific', distractors: ['Atlantic', 'Indian', 'Arctic'], difficulty: 'easy' },

  // Medium
  { prompt: 'Currency of Japan', correct: 'Yen', distractors: ['Won', 'Yuan', 'Rupee'], difficulty: 'medium' },
  { prompt: 'Tallest mountain in the world', correct: 'Mount Everest', distractors: ['K2', 'Kangchenjunga', 'Lhotse'], difficulty: 'medium' },
  { prompt: 'Country that gifted the Statue of Liberty', correct: 'France', distractors: ['Italy', 'Germany', 'Spain'], difficulty: 'medium' },
  { prompt: 'How many sides does a hexagon have?', correct: '6', distractors: ['5', '7', '8'], difficulty: 'medium' },
  { prompt: 'Author of Romeo and Juliet', correct: 'Shakespeare', distractors: ['Dickens', 'Austen', 'Tolstoy'], difficulty: 'medium' },
  { prompt: 'Largest desert by area', correct: 'Antarctic', distractors: ['Sahara', 'Arabian', 'Gobi'], difficulty: 'medium' },

  // Hard
  { prompt: 'Year humans first landed on the Moon', correct: '1969', distractors: ['1965', '1972', '1959'], difficulty: 'hard' },
  { prompt: 'Element with symbol "Au"', correct: 'Gold', distractors: ['Silver', 'Aluminium', 'Argon'], difficulty: 'hard' },
  { prompt: 'Painter of the Mona Lisa', correct: 'Leonardo da Vinci', distractors: ['Michelangelo', 'Raphael', 'Caravaggio'], difficulty: 'hard' },
  { prompt: 'Smallest country in the world', correct: 'Vatican City', distractors: ['Monaco', 'San Marino', 'Liechtenstein'], difficulty: 'hard' },
  { prompt: 'Speed of light (km/s, approx)', correct: '300,000', distractors: ['150,000', '500,000', '1,000,000'], difficulty: 'hard' },
  { prompt: 'Longest river in the world', correct: 'Nile', distractors: ['Amazon', 'Yangtze', 'Mississippi'], difficulty: 'hard' },

  // Easy — additions
  { prompt: 'Number of legs on a spider', correct: '8', distractors: ['6', '10', '4'], difficulty: 'easy' },
  { prompt: 'Primary color among these', correct: 'Red', distractors: ['Green', 'Orange', 'Purple'], difficulty: 'easy' },
  { prompt: 'Closest star to Earth', correct: 'The Sun', distractors: ['Sirius', 'Polaris', 'Vega'], difficulty: 'easy' },
  { prompt: 'How many minutes in an hour?', correct: '60', distractors: ['30', '90', '120'], difficulty: 'easy' },
  { prompt: 'Frozen water is called', correct: 'Ice', distractors: ['Steam', 'Mist', 'Snowflake'], difficulty: 'easy' },
  { prompt: 'How many strings on a standard guitar?', correct: '6', distractors: ['4', '5', '8'], difficulty: 'easy' },

  // Medium — additions
  { prompt: 'Capital of Australia', correct: 'Canberra', distractors: ['Sydney', 'Melbourne', 'Perth'], difficulty: 'medium' },
  { prompt: 'Gas plants take in for photosynthesis', correct: 'Carbon dioxide', distractors: ['Oxygen', 'Nitrogen', 'Hydrogen'], difficulty: 'medium' },
  { prompt: 'Currency of the United Kingdom', correct: 'Pound', distractors: ['Euro', 'Dollar', 'Franc'], difficulty: 'medium' },
  { prompt: 'How many players on a football (soccer) team on the field?', correct: '11', distractors: ['9', '10', '12'], difficulty: 'medium' },
  { prompt: 'Largest mammal on Earth', correct: 'Blue whale', distractors: ['Elephant', 'Giraffe', 'Orca'], difficulty: 'medium' },
  { prompt: 'Country with the largest population', correct: 'India', distractors: ['China', 'USA', 'Indonesia'], difficulty: 'medium' },

  // Hard — additions
  { prompt: 'Element with the chemical symbol "Fe"', correct: 'Iron', distractors: ['Fluorine', 'Francium', 'Fermium'], difficulty: 'hard' },
  { prompt: 'Who wrote "1984"?', correct: 'George Orwell', distractors: ['Aldous Huxley', 'Ray Bradbury', 'H.G. Wells'], difficulty: 'hard' },
  { prompt: 'Capital of Canada', correct: 'Ottawa', distractors: ['Toronto', 'Montreal', 'Vancouver'], difficulty: 'hard' },
  { prompt: 'Year World War II ended', correct: '1945', distractors: ['1944', '1946', '1939'], difficulty: 'hard' },
  { prompt: 'Smallest prime number', correct: '2', distractors: ['1', '3', '0'], difficulty: 'hard' },
  { prompt: 'Hardest natural substance', correct: 'Diamond', distractors: ['Quartz', 'Granite', 'Steel'], difficulty: 'hard' },
];

export function generateGK(level: number): TriviaQuestion {
  const difficulty = levelToDifficulty(level);
  const candidates = GK_BANK.filter((i) => i.difficulty === difficulty);
  const item = pick(candidates.length > 0 ? candidates : GK_BANK);
  const answers = shuffle([item.correct, ...item.distractors]);
  return {
    id: `gk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'GK',
    type: 'multiple',
    difficulty,
    question: item.prompt,
    correct_answer: item.correct,
    answers,
  };
}

// ─── Mixed-mode round (Brain Rush) ───────────────────────────────────────────
// Cycles math → english → GK so each round mixes the three. Always returns
// exactly `count` questions with no network dependency, which makes Play
// tap-to-start instant on any platform.

export function generateBrainRush(count: number, level: number): TriviaQuestion[] {
  const generators = [generateMath, generateEnglish, generateGK];
  const out: TriviaQuestion[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generators[i % generators.length](level));
  }
  return out;
}
