export interface AnagramRound {
  letters: string[];
  validWords: string[];
}

// Tiny bundled word list — keep this in the repo so the game works fully
// offline. Sized to ~200 short common words. Expand later if we want
// richer rounds, but more than 500 will bloat the JS bundle.
const WORDS: string[] = [
  'care','cars','race','races','scare','cab','arc','arcs','ace','aces','sea','seas',
  'star','stars','rat','rats','tar','tars','art','arts','tea','teas','ate','east',
  'eat','eats','seat','seats','tare','tares','rate','rates','tase','beat','beats',
  'bear','bears','base','bear','tab','tabs','bat','bats','dab','dabs',
  'dare','dares','dear','dears','read','reads','redo','rode','dose','does',
  'note','notes','tone','tones','onset','stone','stones','nest','nests','sent',
  'rust','rusts','tour','tours','rout','routs','sour','sours','ours',
  'word','words','draw','draws','ward','wards','rod','rods','sword',
  'pace','paces','cape','capes','race','rape','rapes','reap','reaps','spare','spares',
  'rope','ropes','pore','pores','prose','poser','poses','spore','spores',
  'pile','piles','lips','slip','slips','lisp','lisps',
  'mate','mates','meat','meats','team','teams','steam','tames','mast',
  'live','lives','evil','vile','viler','rile','riles','liver','livers',
  'plan','plans','snap','snaps','span','spans','pans','naps',
  'time','times','mite','mites','emit','emits','item','items',
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function canMake(word: string, letters: string[]): boolean {
  const pool = letters.slice();
  for (const c of word) {
    const i = pool.indexOf(c);
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

interface GenerateOpts { minLetters: number; maxLetters: number; level: number }

export function generateAnagramRound(opts: GenerateOpts): AnagramRound {
  // Sample a seed word at level-appropriate length, then derive letters from it.
  const seedCandidates = WORDS.filter(
    (w) => w.length >= opts.minLetters && w.length <= opts.maxLetters,
  );
  const seed = seedCandidates[Math.floor(Math.random() * seedCandidates.length)] ?? 'race';
  // Pad with random letters up to maxLetters to give the player a few extras.
  const padCount = Math.max(0, opts.maxLetters - seed.length);
  const padded = seed.split('').concat(
    Array.from({ length: padCount }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]),
  );
  const letters = shuffle(padded);
  const validWords = WORDS.filter((w) => w.length >= 3 && canMake(w, letters));
  return { letters, validWords };
}

export interface AttemptResult { ok: boolean; points: number }

export function scoreAnagramAttempt(
  round: AnagramRound,
  attempt: string,
  alreadyUsed: Set<string> = new Set(),
): AttemptResult {
  const cleaned = attempt.toLowerCase().trim();
  if (!cleaned || alreadyUsed.has(cleaned)) return { ok: false, points: 0 };
  if (!round.validWords.includes(cleaned)) return { ok: false, points: 0 };
  return { ok: true, points: cleaned.length * 10 };
}
