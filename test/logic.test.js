#!/usr/bin/env node
// ─── BrainStreak Logic Tests ─────────────────────────────────────────────────
// Run: node test/logic.test.js
// Tests all core game/streak/habit logic without needing React Native

const assert = (condition, message) => {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
};

const group = (name, fn) => {
  console.log(`\n📋 ${name}`);
  fn();
};

// ─── Score Calculation Tests ──────────────────────────────────────────────────

function calculatePoints(isCorrect, difficulty, timeTaken, roundTimeLimit = 15) {
  if (!isCorrect) return 0;
  const basePoints = { easy: 100, medium: 150, hard: 250 };
  const base = basePoints[difficulty] ?? 150;
  const timeRatio = Math.max(0, (roundTimeLimit - timeTaken) / roundTimeLimit);
  const speedBonus = Math.floor(base * 0.5 * timeRatio);
  return base + speedBonus;
}

function calculateXP(score, streak) {
  const streakMultiplier = Math.min(1 + streak * 0.1, 2.0);
  return Math.floor(score * streakMultiplier * 0.1);
}

function getLevelFromXP(xp) {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

group('Score Calculation', () => {
  assert(calculatePoints(false, 'easy', 5) === 0, 'Wrong answer = 0 points');
  assert(calculatePoints(true, 'easy', 0) === 150, 'Easy + instant = 150 (100 base + 50 bonus)');
  assert(calculatePoints(true, 'easy', 15) === 100, 'Easy + no time left = 100 (base only)');
  assert(calculatePoints(true, 'medium', 0) === 225, 'Medium + instant = 225');
  assert(calculatePoints(true, 'hard', 0) === 375, 'Hard + instant = 375');
  assert(calculatePoints(true, 'medium', 7) >= 150, 'Medium + mid-time >= base');
  assert(calculatePoints(true, 'medium', 7) <= 225, 'Medium + mid-time <= max');

  // Speed bonus at exactly half time
  const halfTimePoints = calculatePoints(true, 'easy', 7, 15);
  assert(halfTimePoints > 100 && halfTimePoints < 150, 'Half-time bonus between base and max');
});

group('XP Calculation', () => {
  assert(calculateXP(0, 0) === 0, 'Zero score = 0 XP');
  assert(calculateXP(500, 0) === 50, 'Score 500 streak 0 = 50 XP');
  assert(calculateXP(500, 5) === 75, 'Score 500 streak 5 = 75 XP (1.5x)');
  assert(calculateXP(500, 10) === 100, 'Score 500 streak 10 = 100 XP (2.0x cap)');
  assert(calculateXP(500, 20) === 100, 'Multiplier capped at 2.0x');
  assert(calculateXP(1000, 0) === 100, 'Score 1000 = 100 XP base');
});

group('Level System', () => {
  assert(getLevelFromXP(0) === 1, 'XP 0 = Level 1');
  assert(getLevelFromXP(50) === 2, 'XP 50 = Level 2');
  assert(getLevelFromXP(100) === 2, 'XP 100 = Level 2 (not yet 3)');
  assert(getLevelFromXP(200) === 3, 'XP 200 = Level 3');
  assert(getLevelFromXP(450) === 4, 'XP 450 = Level 4');
  assert(getLevelFromXP(800) === 5, 'XP 800 = Level 5');
  // Level always >= 1
  assert(getLevelFromXP(0) >= 1, 'Level always at least 1');
});

// ─── Streak Logic Tests ───────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().split('T')[0]; }
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function simulateStreakUpdate(streak, lastPlayDate) {
  const today = todayISO();
  const yesterday = yesterdayISO();
  let newCurrent = streak.current;

  if (lastPlayDate === today) {
    // Already played today — no change
  } else if (lastPlayDate === yesterday) {
    newCurrent += 1;
  } else {
    newCurrent = 1;
  }

  const newLongest = Math.max(newCurrent, streak.longest);
  return { current: newCurrent, longest: newLongest, lastPlayDate: today };
}

group('Streak Logic', () => {
  // First play ever
  const fresh = simulateStreakUpdate({ current: 0, longest: 0 }, null);
  assert(fresh.current === 1, 'First play = streak 1');
  assert(fresh.longest === 1, 'First play = longest 1');

  // Consecutive play
  const day2 = simulateStreakUpdate({ current: 1, longest: 1 }, yesterdayISO());
  assert(day2.current === 2, 'Consecutive day = streak 2');
  assert(day2.longest === 2, 'Consecutive day = longest 2');

  // Play again on same day (already played today)
  const sameDay = simulateStreakUpdate({ current: 2, longest: 2 }, todayISO());
  assert(sameDay.current === 2, 'Same day re-play = no change');

  // Broken streak (missed 2+ days)
  const broken = simulateStreakUpdate({ current: 10, longest: 10 }, daysAgoISO(3));
  assert(broken.current === 1, 'Broken streak resets to 1');
  assert(broken.longest === 10, 'Longest streak preserved after break');

  // Build to new longest
  const newBest = simulateStreakUpdate({ current: 5, longest: 5 }, yesterdayISO());
  assert(newBest.current === 6, 'Streak increments');
  assert(newBest.longest === 6, 'New longest updated');

  // Edge: streak was higher before
  const afterBreak = simulateStreakUpdate({ current: 3, longest: 15 }, daysAgoISO(5));
  assert(afterBreak.current === 1, 'After long break, current resets');
  assert(afterBreak.longest === 15, 'Historical longest kept');
});

// ─── Habit Logic Tests ────────────────────────────────────────────────────────

function simulateHabitComplete(habit) {
  const today = todayISO();
  const yesterday = yesterdayISO();

  if (habit.lastCompleted === today) return habit; // already done

  let newStreak = habit.streak;
  if (habit.lastCompleted === yesterday) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }

  return {
    ...habit,
    streak: newStreak,
    longestStreak: Math.max(newStreak, habit.longestStreak),
    lastCompleted: today,
    completedToday: true,
  };
}

group('Habit Completion Logic', () => {
  const baseHabit = { streak: 0, longestStreak: 0, lastCompleted: null, completedToday: false };

  // First completion
  const first = simulateHabitComplete(baseHabit);
  assert(first.streak === 1, 'First completion = streak 1');
  assert(first.completedToday === true, 'First completion = completedToday true');

  // Consecutive day
  const consecutive = simulateHabitComplete({ ...baseHabit, streak: 1, longestStreak: 1, lastCompleted: yesterdayISO() });
  assert(consecutive.streak === 2, 'Consecutive = streak 2');

  // Idempotent (already done today)
  const alreadyDone = simulateHabitComplete({ ...baseHabit, streak: 3, longestStreak: 5, lastCompleted: todayISO(), completedToday: true });
  assert(alreadyDone.streak === 3, 'Already completed today = no streak change');

  // Broken habit streak
  const broken = simulateHabitComplete({ ...baseHabit, streak: 8, longestStreak: 10, lastCompleted: daysAgoISO(3) });
  assert(broken.streak === 1, 'Broken habit streak resets');
  assert(broken.longestStreak === 10, 'Habit longest preserved after break');

  // New longest streak
  const newRecord = simulateHabitComplete({ ...baseHabit, streak: 10, longestStreak: 10, lastCompleted: yesterdayISO() });
  assert(newRecord.streak === 11, 'New streak 11');
  assert(newRecord.longestStreak === 11, 'New longest 11');
});

// ─── Question Parsing Tests ───────────────────────────────────────────────────

function decodeHTML(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

group('HTML Decoding', () => {
  assert(decodeHTML('5 &amp; 3') === '5 & 3', 'Decode &amp;');
  assert(decodeHTML('&lt;div&gt;') === '<div>', 'Decode &lt; &gt;');
  assert(decodeHTML('it&#039;s') === "it's", "Decode &#039;");
  assert(decodeHTML('&quot;hello&quot;') === '"hello"', 'Decode &quot;');
  assert(decodeHTML('No entities here') === 'No entities here', 'No entities unchanged');
  assert(decodeHTML('A &amp; B &lt; C') === 'A & B < C', 'Multiple entities');
});

group('Answer Shuffling', () => {
  const answers = ['A', 'B', 'C', 'D'];
  const shuffled = shuffleArray(answers);
  assert(shuffled.length === 4, 'Shuffle preserves length');
  assert(shuffled.includes('A'), 'Shuffle preserves all elements A');
  assert(shuffled.includes('B'), 'Shuffle preserves all elements B');
  assert(shuffled.includes('C'), 'Shuffle preserves all elements C');
  assert(shuffled.includes('D'), 'Shuffle preserves all elements D');
  // Should not mutate original
  assert(answers[0] === 'A', 'Original array not mutated');
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
if (process.exitCode === 1) {
  console.log('⚠️  Some tests failed. See above for details.\n');
} else {
  console.log('🎉 All tests passed!\n');
}
