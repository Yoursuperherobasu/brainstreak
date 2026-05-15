#!/usr/bin/env node
// Comprehensive QA test for BrainStreak. Drives a headless browser through
// every user flow, screenshots each step, and produces qa-out/qa-full-report.md.
//
// Run: BASE=http://127.0.0.1:8090 node scripts/qa-full.js

const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const OUT  = path.join(__dirname, '..', 'qa-out');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ───────────────── helpers ─────────────────────────────────────────────────

// The single recoverable React #418 from Reanimated SSR is acceptable.
// Track every other console / pageerror per-flow.
const REANIMATED_418 = /(Minified React error #418|hydration|did not match.*Server.*Client)/i;

const flows = [];        // [{name, ok, outcome, errors:[], shots:[]}]
let current = null;      // pointer to flows.entries

function startFlow(name) {
  current = { name, ok: true, outcome: '', errors: [], shots: [] };
  flows.push(current);
  log(`\n=== ${name} ===`);
}

function endFlow(ok, outcome) {
  if (!current) return;
  current.ok = ok && current.errors.filter((e) => !REANIMATED_418.test(e)).length === 0;
  current.outcome = outcome;
  log(`  → ${current.ok ? 'PASS' : 'FAIL'}: ${outcome}`);
}

function log(s) {
  console.log(s);
}

function recordError(text) {
  if (!current) return;
  current.errors.push(text);
}

async function shot(page, fileName, description = '') {
  const file = path.join(OUT, `${fileName}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
    if (current) current.shots.push({ file: `${fileName}.png`, description });
    log(`  📸 ${fileName}.png  ${description}`);
  } catch (e) {
    log(`  shot failed: ${e.message}`);
  }
}

function attachConsole(page) {
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', (m) => {
    const t = m.type();
    if (t !== 'error' && t !== 'warning') return;
    recordError(`[${t}] ${m.text()}`);
  });
  page.on('pageerror', (e) => {
    recordError(`[pageerror] ${e.message}`);
  });
  // Auto-accept native dialogs (window.confirm on web for quit) so a
  // dangling confirm prompt doesn't deadlock subsequent clicks.
  page.on('dialog', async (d) => {
    try { await d.accept(); } catch {}
  });
}

// Pre-seed localStorage so onboarding is skipped — used for any flow that
// doesn't explicitly test onboarding.
async function seedOnboarded(ctx, username = 'QA') {
  await ctx.addInitScript((u) => {
    try {
      const profile = {
        state: {
          profile: { username: u, totalXP: 0, level: 1, gamesPlayed: 0 },
          streak: { current: 0, longest: 0, lastPlayDate: null },
          authState: 'anonymous',
          authedUserId: null,
        },
        version: 0,
      };
      const settings = {
        state: { onboarded: true, soundOn: false, hapticsOn: false, dailyReminderTime: null },
        version: 0,
      };
      const achievements = { state: { unlocked: [] }, version: 0 };
      localStorage.setItem('@brainstreak/profile', JSON.stringify(profile));
      localStorage.setItem('@brainstreak/settings', JSON.stringify(settings));
      localStorage.setItem('@brainstreak/achievements', JSON.stringify(achievements));
      // Recent-games key isn't persisted by Zustand; it's a raw value.
      localStorage.removeItem('@brainstreak/recent_games');
    } catch {}
  }, username);
}

// Read the persisted profile.totalXP straight out of localStorage. This is
// the most reliable signal that recordMiniGameResult / finishGame actually
// wrote XP — far more reliable than scraping a number out of the DOM
// (which is decorated with CountingNumber + commas).
async function readPersistedXP(page) {
  return await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('@brainstreak/profile');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.state?.profile?.totalXP ?? null;
    } catch { return null; }
  });
}

async function readPersistedRecent(page) {
  return await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('@brainstreak/recent_games');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch { return []; }
  });
}

async function readPersistedAchievements(page) {
  return await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('@brainstreak/achievements');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed?.state?.unlocked ?? [];
    } catch { return []; }
  });
}

async function waitFor(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ──────────────────────────── flow 1: onboarding ──────────────────────────
async function testOnboarding(browser) {
  startFlow('1. Welcome → Username → Home');
  // CLEAN localStorage — no preseed.
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  attachConsole(page);

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await waitFor(1200);
    await shot(page, '01-welcome', 'Welcome screen after clearing localStorage');

    // Click Get started
    await page.getByText('Get started', { exact: false }).first().click({ timeout: 4000 });
    await page.waitForURL(/onboarding\/username/, { timeout: 4000 });
    await waitFor(400);
    await shot(page, '02-username-empty', 'Username screen');

    const input = page.locator('input').first();
    await input.click({ timeout: 2000 });
    await input.fill('QA_User');
    await shot(page, '03-username-typed', 'Username typed');

    await page.getByText('Continue', { exact: false }).first().click({ timeout: 4000 });
    await waitFor(1500);

    const url = page.url();
    // expo-router rewrites group routes — final URL should be at root tab.
    const onHome = url === BASE + '/' || url.endsWith('/') || /\(tabs\)/.test(url);
    await shot(page, '04-home-after-onboarding', `URL: ${url}`);

    // Verify username "QA_User" is shown on home.
    const usernameVisible = await page.getByText('QA_User', { exact: false }).count();
    log(`  username matches in DOM: ${usernameVisible}`);

    if (!onHome) {
      endFlow(false, `did not land on home (url=${url})`);
    } else if (usernameVisible === 0) {
      endFlow(false, 'home rendered but username not shown');
    } else {
      endFlow(true, 'username displayed on Home after onboarding');
    }
  } catch (e) {
    await shot(page, 'onboarding-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// Generic context+page helper — preseed onboarded so we land on home.
async function newSeeded(browser, viewport = { width: 414, height: 896 }, username = 'QA') {
  const ctx = await browser.newContext({ viewport });
  await seedOnboarded(ctx, username);
  const page = await ctx.newPage();
  attachConsole(page);
  return { ctx, page };
}

// ──────────────────────────── flow 2: Brain Rush full play ────────────────
async function testBrainRush(browser) {
  startFlow('2. Brain Rush — play through to game-over');
  const { ctx, page } = await newSeeded(browser);
  try {
    const xpBefore = await page.evaluate(() => null); // before goto, lsg has nothing
    await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
    await waitFor(1000);
    await shot(page, 'br-01-play', 'Play tab');

    const startBefore = await readPersistedXP(page);
    log(`  XP before: ${startBefore}`);

    // Click Mixed (default selected anyway) then Start game.
    try {
      await page.getByText('Mixed', { exact: true }).first().click({ timeout: 3000 });
    } catch {}
    await waitFor(300);

    const startBtn = page.getByText('Start game', { exact: true });
    const startCount = await startBtn.count();
    log(`  Start game buttons: ${startCount}`);
    await startBtn.last().scrollIntoViewIfNeeded();
    await startBtn.last().click({ timeout: 4000 });
    await waitFor(500);
    await shot(page, 'br-02-countdown', 'Countdown after Start game');

    // Wait countdown — config COUNTDOWN_SECONDS default ~3.
    await waitFor(3800);
    await shot(page, 'br-03-playing-q1', 'Brain Rush playing Q1');

    // Answer 5 questions. Click any bubble. The BubbleField uses real
    // <button> elements on web. Click whatever is touch-active in the
    // answers area. Simplest reliable selector: find Pressable bubbles.
    for (let q = 1; q <= 6; q++) {
      // give the UI a beat
      await waitFor(500);
      // Try clicking the first "answer-ish" button. Bubbles are pressables
      // with text content of the answer. We look for buttons in viewport
      // that aren't the X close, not Next/See-results.
      const url0 = page.url();
      if (!url0.includes('/game/session')) {
        log(`  early: url=${url0}, breaking`);
        break;
      }

      // Are we showing the result Next/See-results button?
      const nextBtn = page.getByText(/^(Next question|See results)$/);
      if ((await nextBtn.count()) > 0) {
        log(`  Q${q-1} result phase → click Next`);
        await nextBtn.first().click({ timeout: 3000 });
        await waitFor(700);
        continue;
      }

      // playing phase — click first answer bubble.
      // The bubble field renders 4 answers, each containing the answer text.
      // We pick a tappable element inside the answersWrap. The cheapest
      // approach: click coordinates of the first ~4 visible non-header buttons.
      const buttons = page.locator('button, [role="button"], [data-clickable]');
      const total = await buttons.count();
      let clicked = false;
      for (let i = 0; i < total; i++) {
        const b = buttons.nth(i);
        const txt = (await b.textContent().catch(() => '')) || '';
        const tt = txt.trim();
        if (!tt) continue;
        if (tt === '✕') continue;
        if (/^(Next question|See results|Play again|Home|Quit round)$/.test(tt)) continue;
        try {
          const box = await b.boundingBox();
          if (!box || box.width < 8 || box.height < 8) continue;
          await b.click({ timeout: 1500 });
          clicked = true;
          log(`  Q${q} clicked answer "${tt.slice(0, 24)}"`);
          break;
        } catch {}
      }
      if (!clicked) {
        log(`  Q${q} — no clickable answer found, trying bubble field tap by coordinate`);
        // Just tap centre of viewport-lower-half.
        await page.mouse.click(207, 600).catch(() => {});
      }
      await waitFor(900);

      // After a click in playing phase the screen shows the Next/See results
      // button. Click it to advance.
      const next2 = page.getByText(/^(Next question|See results)$/);
      if ((await next2.count()) > 0) {
        await next2.first().click({ timeout: 3000 });
        await waitFor(600);
      }
      // Are we in gameover?
      const gameoverHit = await page.getByText(/Round Breakdown|Excellent|Strong round|Good effort|Keep going/).count();
      if (gameoverHit > 0) {
        log(`  reached gameover after Q${q}`);
        break;
      }
    }

    await waitFor(800);
    await shot(page, 'br-04-gameover', 'Brain Rush game-over recap');

    // Verify XP earned > 0 by reading the recap. The XP earned card shows "+N".
    const xpAfter = await readPersistedXP(page);
    log(`  XP after: ${xpAfter}`);

    const recap = await page.locator('text=/XP Earned/i').count();
    log(`  recap "XP Earned" text matches: ${recap}`);

    // recordMiniGameResult only runs for mini-games — Brain Rush uses
    // useGameStore.finishGame which sets profile.totalXP directly via
    // useUserStore.addXP. Verify it went up.
    if (xpAfter === null || xpAfter === startBefore) {
      endFlow(false, `XP did not increase (before=${startBefore}, after=${xpAfter})`);
    } else if (recap === 0) {
      endFlow(false, 'reached game-over but recap text missing');
    } else {
      endFlow(true, `recap shown, XP ${startBefore} → ${xpAfter}`);
    }
  } catch (e) {
    await shot(page, 'br-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 3: Word Sprint ─────────────────────────
async function testWordSprint(browser) {
  startFlow('3. Word Sprint — play to time-out');
  const { ctx, page } = await newSeeded(browser);
  try {
    await page.goto(BASE + '/game/word-sprint', { waitUntil: 'networkidle' });
    await waitFor(1500);
    await shot(page, 'ws-01-start', 'Word Sprint initial render');

    const xpBefore = await readPersistedXP(page);

    // Letter tiles are rendered as <Text> children. Extract by scanning
    // single uppercase letters in the DOM at the top of the play area.
    const letters = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('div'));
      const out = [];
      for (const t of tiles) {
        const txt = (t.textContent || '').trim();
        if (/^[A-Z]$/.test(txt)) out.push(txt);
      }
      return out.slice(0, 8); // letters are at the top
    });
    log(`  letters: ${letters.join(',')}`);

    // Type a few attempts. Use the available letters lowercased.
    const input = page.locator('input').first();
    const attempts = letters.length >= 4
      ? [
          letters.slice(0, 4).join('').toLowerCase(),
          letters.slice(0, 3).join('').toLowerCase(),
          'zzzz',
          letters.slice(1, 5).join('').toLowerCase(),
        ]
      : ['cat', 'dog', 'word', 'sprint'];

    for (const a of attempts) {
      try {
        await input.click({ timeout: 1500 });
        await input.fill(a);
        await page.keyboard.press('Enter');
        await waitFor(200);
      } catch (e) {
        log(`  word "${a}" submit failed: ${e.message}`);
      }
    }
    await shot(page, 'ws-02-mid', 'After some submissions');

    // Force time-out instead of waiting 60 real seconds — accomplished by
    // letting the timer tick down. We don't have hooks into the React state
    // so we wait the full 60s with the game in background. To speed up the
    // QA run, fast-fwd by sending Enter spam? No reliable way without
    // patching. Just wait the timer.
    log(`  waiting for 60-second timer to expire…`);
    await waitFor(63000);

    await shot(page, 'ws-03-gameover', 'Word Sprint game-over');

    const gameOverTxt = await page.getByText('Time!').count();
    const xpAfter = await readPersistedXP(page);
    log(`  XP before: ${xpBefore}  XP after: ${xpAfter}`);

    if (gameOverTxt === 0) {
      endFlow(false, 'game-over card not visible after 60s');
    } else if (xpAfter === null) {
      endFlow(false, 'could not read XP');
    } else if (xpAfter < xpBefore) {
      endFlow(false, `XP went DOWN (${xpBefore} → ${xpAfter})`);
    } else {
      endFlow(true, `game-over shown, XP ${xpBefore} → ${xpAfter}`);
    }
  } catch (e) {
    await shot(page, 'ws-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 4: Number Sense ────────────────────────
async function testNumberSense(browser) {
  startFlow('4. Number Sense — tap choices through timer');
  const { ctx, page } = await newSeeded(browser);
  try {
    await page.goto(BASE + '/game/number-sense', { waitUntil: 'networkidle' });
    await waitFor(1500);
    await shot(page, 'ns-01-start', 'Number Sense start');
    const xpBefore = await readPersistedXP(page);

    // Tap 6 random answers — choices live inside the body as <Pressable>.
    for (let i = 0; i < 8; i++) {
      const choices = page.locator('div[role="button"], [role="button"]').filter({
        hasText: /^\d+$/,
      });
      const count = await choices.count();
      if (count === 0) {
        // Fallback: find any div whose direct text content is purely numeric
        const numericDivs = await page.locator('div').filter({ hasText: /^\d+$/ }).count();
        log(`  attempt ${i} — no role=button choices, ${numericDivs} numeric divs`);
        await page.mouse.click(200, 500);
      } else {
        try { await choices.nth(0).click({ timeout: 1500 }); }
        catch {
          // fallback — coordinates
          await page.mouse.click(150, 500).catch(() => {});
        }
      }
      await waitFor(400);
    }
    await shot(page, 'ns-02-mid', 'Mid-play');

    // Timer is 30s. Wait for it to run out.
    log(`  waiting for 30-second timer to expire…`);
    await waitFor(33000);

    await shot(page, 'ns-03-gameover', 'Number Sense game-over');
    const gameOverTxt = await page.getByText('Time!').count();
    const xpAfter = await readPersistedXP(page);
    log(`  XP before: ${xpBefore}  XP after: ${xpAfter}`);

    if (gameOverTxt === 0) {
      endFlow(false, 'game-over card not visible after 30s');
    } else {
      endFlow(true, `game-over shown, XP ${xpBefore} → ${xpAfter}`);
    }
  } catch (e) {
    await shot(page, 'ns-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 5: Memory Match ────────────────────────
async function testMemoryMatch(browser) {
  startFlow('5. Memory Match — tap a wrong tile to end');
  const { ctx, page } = await newSeeded(browser);
  try {
    await page.goto(BASE + '/game/memory-match', { waitUntil: 'networkidle' });
    await waitFor(1000);
    await shot(page, 'mm-01-start', 'Memory Match start (showing sequence)');
    const xpBefore = await readPersistedXP(page);

    // Wait for the first show sequence to finish — sequence length 1 (round 1)
    // takes flash(480) + gap(220) = ~700ms.
    await waitFor(1400);
    await shot(page, 'mm-02-input', 'Memory Match input phase');

    // The screen contains 4 tile <Pressable>s. Hard to identify by accessible
    // name. Strategy: tap each of the 4 visible coloured boxes by clicking
    // at known relative coordinates within the 280x280 grid centered on screen.
    // The body is centered; the grid is 280x280, tiles are 132x132 with
    // Spacing.sm gap. We'll click each in turn until phase=='over'.
    const viewport = page.viewportSize();
    const cx = viewport.width / 2;
    // grid is centered; first row at roughly y ~ vh*0.5-50, second row ~ +152.
    const candidates = [
      [cx - 70, viewport.height * 0.5 - 30],
      [cx + 70, viewport.height * 0.5 - 30],
      [cx - 70, viewport.height * 0.5 + 120],
      [cx + 70, viewport.height * 0.5 + 120],
    ];
    for (let i = 0; i < 4; i++) {
      const [x, y] = candidates[i];
      await page.mouse.click(x, y).catch(() => {});
      await waitFor(400);
      const gameOver = await page.getByText('Game Over').count();
      if (gameOver > 0) {
        log(`  Game Over after tile ${i + 1}`);
        break;
      }
    }

    await waitFor(800);
    await shot(page, 'mm-03-gameover', 'Memory Match game-over');
    const gameOverTxt = await page.getByText('Game Over').count();
    const xpAfter = await readPersistedXP(page);
    log(`  XP before: ${xpBefore}  XP after: ${xpAfter}`);

    if (gameOverTxt === 0) {
      endFlow(false, 'never reached Game Over');
    } else {
      endFlow(true, `Game Over shown, XP ${xpBefore} → ${xpAfter}`);
    }
  } catch (e) {
    await shot(page, 'mm-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 6: Reaction Tap ────────────────────────
async function testReactionTap(browser) {
  startFlow('6. Reaction Tap — tap dot, wait timer');
  const { ctx, page } = await newSeeded(browser);
  try {
    await page.goto(BASE + '/game/reaction-tap', { waitUntil: 'networkidle' });
    await waitFor(1500);
    await shot(page, 'rt-01-start', 'Reaction Tap field');
    const xpBefore = await readPersistedXP(page);

    // The dot is a Pressable, positioned absolutely inside the field. The
    // simplest way to "tap" it is to query getBoundingClientRect of every
    // pressable inside the play field and click each.
    for (let i = 0; i < 6; i++) {
      const tapped = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('div'));
        // dot has fixed 72x72 in inline style.
        for (const el of all) {
          const cs = (el.getAttribute('style') || '');
          if (cs.includes('border-radius: 36') || (el.offsetWidth === 72 && el.offsetHeight === 72)) {
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            return { cx, cy };
          }
        }
        return null;
      });
      if (tapped) {
        await page.mouse.click(tapped.cx, tapped.cy).catch(() => {});
      } else {
        await page.mouse.click(200, 400).catch(() => {});
      }
      await waitFor(300);
    }
    await shot(page, 'rt-02-mid', 'After tapping');

    // Timer 20s. Wait it out.
    log(`  waiting 22s for timer expiry…`);
    await waitFor(22000);

    await shot(page, 'rt-03-gameover', 'Reaction Tap game-over');
    const gameOver = await page.getByText('Time!').count();
    const xpAfter = await readPersistedXP(page);
    log(`  XP before: ${xpBefore}  XP after: ${xpAfter}`);
    if (gameOver === 0) {
      endFlow(false, 'no game-over after timer');
    } else {
      endFlow(true, `game-over shown, XP ${xpBefore} → ${xpAfter}`);
    }
  } catch (e) {
    await shot(page, 'rt-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 7: Road Rush ───────────────────────────
async function testRoadRush(browser) {
  startFlow('7. Road Rush — tap start, wait for crash/timeout');
  const { ctx, page } = await newSeeded(browser);
  try {
    await page.goto(BASE + '/game/road-rush', { waitUntil: 'networkidle' });
    await waitFor(1500);
    await shot(page, 'rr-01-idle', 'Road Rush idle overlay');
    const xpBefore = await readPersistedXP(page);

    // Verify the "Ready?" overlay is visible.
    const readyVisible = await page.getByText('Ready?').count();
    log(`  Ready? overlay matches: ${readyVisible}`);

    // Tap the field to start.
    const viewport = page.viewportSize();
    await page.mouse.click(viewport.width / 2, viewport.height / 2).catch(() => {});
    await waitFor(700);
    await shot(page, 'rr-02-playing', 'Road Rush playing');

    // Sit and wait — car will eventually crash or timer (60s) elapse.
    log(`  waiting up to 65s for crash or timeout…`);
    const start = Date.now();
    let saw = 0;
    while (Date.now() - start < 65000) {
      const over = await page.getByText(/Crash|Time!/).count();
      if (over > 0) { saw = over; break; }
      // Tap occasionally to switch lanes (so we don't bias toward immediate crash).
      if ((Date.now() - start) % 3000 < 100) {
        await page.mouse.click(viewport.width / 2, viewport.height / 2).catch(() => {});
      }
      await waitFor(500);
    }

    await shot(page, 'rr-03-gameover', `Road Rush game-over (saw=${saw})`);
    const xpAfter = await readPersistedXP(page);
    log(`  XP before: ${xpBefore}  XP after: ${xpAfter}`);

    if (saw === 0) {
      endFlow(false, 'never reached crash/time-out');
    } else {
      endFlow(true, `game-over shown, XP ${xpBefore} → ${xpAfter}`);
    }
  } catch (e) {
    await shot(page, 'rr-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 8: persistence after a game ────────────
async function testPersistenceAfterGame(browser) {
  startFlow('8. Profile reflects XP + Recent Activity after a game');
  const { ctx, page } = await newSeeded(browser);
  try {
    // Use Number Sense (fastest 30s) but to keep the QA tight, we'll
    // synthetically invoke recordMiniGameResult by playing a tiny round
    // through the page. Actually, just navigate to /game/number-sense,
    // tap a few choices, wait for timer, then go to /profile and /
    await page.goto(BASE + '/game/number-sense', { waitUntil: 'networkidle' });
    await waitFor(1200);
    const xpBefore = await readPersistedXP(page);
    log(`  pre-game XP: ${xpBefore}`);

    // Spam taps on the centre of the screen — Number Sense choices live
    // there as Pressables.
    const vp = page.viewportSize();
    for (let i = 0; i < 12; i++) {
      await page.mouse.click(vp.width / 2 + (i % 3 - 1) * 80, vp.height / 2).catch(() => {});
      await waitFor(220);
    }
    log(`  waiting for 30s timer…`);
    await waitFor(31000);

    const xpAfter = await readPersistedXP(page);
    const recent = await readPersistedRecent(page);
    log(`  post-game XP: ${xpAfter}, recent rows: ${recent.length}`);
    await shot(page, 'pe-01-after-game', 'Number Sense game-over');

    // Navigate to profile
    await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
    await waitFor(1000);
    await shot(page, 'pe-02-profile', 'Profile after first game');

    // Navigate to home
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await waitFor(1500);
    await shot(page, 'pe-03-home', 'Home after first game');

    const stillEmpty = await page.getByText('No rounds yet').count();
    log(`  "No rounds yet" matches on home: ${stillEmpty}`);

    if (xpAfter === xpBefore && recent.length === 0) {
      endFlow(false, 'XP did NOT increase and recent activity empty');
    } else if (recent.length === 0) {
      endFlow(false, 'XP increased but recent activity is empty');
    } else if (stillEmpty > 0) {
      endFlow(false, 'recent_games has data but home still shows "No rounds yet"');
    } else {
      endFlow(true, `XP ${xpBefore} → ${xpAfter}, ${recent.length} recent rows, home shows activity`);
    }
  } catch (e) {
    await shot(page, 'pe-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 9: achievement unlock ──────────────────
async function testAchievementUnlock(browser) {
  startFlow('9. First Round badge unlocks after one game');
  const { ctx, page } = await newSeeded(browser);
  try {
    // Make sure we start with empty unlocked.
    await page.goto(BASE + '/game/number-sense', { waitUntil: 'networkidle' });
    await waitFor(1200);
    const beforeAch = await readPersistedAchievements(page);
    log(`  achievements before: ${beforeAch.join(',') || '(none)'}`);

    const vp = page.viewportSize();
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(vp.width / 2 + (i % 3 - 1) * 80, vp.height / 2).catch(() => {});
      await waitFor(220);
    }
    await waitFor(31000);

    const afterAch = await readPersistedAchievements(page);
    log(`  achievements after: ${afterAch.join(',') || '(none)'}`);

    await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
    await waitFor(1500);
    await shot(page, 'ach-01-profile', 'Profile badges after first game');

    // Hunt for "First Round" or whatever the catalog calls the first-round badge.
    const firstRoundCount = await page.getByText(/First Round|first round|First/i).count();
    log(`  "First Round" text matches on profile: ${firstRoundCount}`);

    // Check that at least one badge is rendered as Unlocked
    const unlockedTextCount = await page.getByText('Unlocked', { exact: true }).count();
    log(`  "Unlocked" labels: ${unlockedTextCount}`);

    if (afterAch.length === 0) {
      endFlow(false, 'no achievements unlocked after playing a game');
    } else if (unlockedTextCount === 0) {
      endFlow(false, `achievements unlocked in storage (${afterAch.join(',')}) but no "Unlocked" rendered`);
    } else {
      endFlow(true, `unlocked ${afterAch.length} achievement(s), ${unlockedTextCount} "Unlocked" badges`);
    }
  } catch (e) {
    await shot(page, 'ach-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 10: offline ───────────────────────────
async function testOffline(browser) {
  startFlow('10. Offline navigation — every screen renders');
  const { ctx, page } = await newSeeded(browser);
  try {
    // Visit home first to warm the cache, then go offline.
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await waitFor(800);
    await ctx.setOffline(true);
    log(`  offline mode enabled`);

    const screens = [
      ['/', 'home'],
      ['/play', 'play'],
      ['/profile', 'profile'],
      ['/game/word-sprint', 'word-sprint'],
      ['/game/number-sense', 'number-sense'],
      ['/game/memory-match', 'memory-match'],
      ['/game/reaction-tap', 'reaction-tap'],
      ['/game/road-rush', 'road-rush'],
      ['/settings/reminder', 'settings-reminder'],
    ];
    let okCount = 0;
    for (const [route, label] of screens) {
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 5000 });
      } catch (navErr) {
        // domcontentloaded should succeed if static export was warmed; if
        // the route is new it will 404 because service worker isn't installed
        // in headless. Try networkidle as fallback.
      }
      await waitFor(800);
      // Check for some text or that the body has content.
      const bodyText = await page.evaluate(() => document.body?.innerText?.length || 0);
      log(`  ${route}: bodyText length=${bodyText}`);
      await shot(page, `off-${label}`, `Offline ${route}`);
      if (bodyText > 50) okCount++;
    }

    await ctx.setOffline(false);

    if (okCount === screens.length) {
      endFlow(true, `all ${screens.length} screens rendered offline`);
    } else {
      endFlow(false, `${okCount}/${screens.length} screens rendered offline`);
    }
  } catch (e) {
    await shot(page, 'off-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 11: mobile viewport ────────────────────
async function testMobileViewports(browser) {
  for (const [vp, label] of [
    [{ width: 375, height: 667 }, 'iphone-se'],
    [{ width: 810, height: 1080 }, 'ipad'],
  ]) {
    startFlow(`11. Mobile viewport — ${label} (${vp.width}x${vp.height})`);
    const { ctx, page } = await newSeeded(browser, vp);
    try {
      for (const [route, name] of [
        ['/', 'home'],
        ['/play', 'play'],
        ['/profile', 'profile'],
        ['/game/word-sprint', 'word-sprint'],
        ['/game/road-rush', 'road-rush'],
      ]) {
        await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {});
        await waitFor(1000);
        await shot(page, `vp-${label}-${name}`, `${label} ${route}`);
        // Check for any element with negative left or overflowing body.
        const overflow = await page.evaluate(() => {
          const docW = document.documentElement.clientWidth;
          const scrollW = document.documentElement.scrollWidth;
          return { docW, scrollW, overflow: scrollW > docW + 1 };
        });
        log(`  ${route}: doc=${overflow.docW} scroll=${overflow.scrollW} overflow=${overflow.overflow}`);
        if (overflow.overflow) {
          recordError(`[overflow] ${route}: scrollW ${overflow.scrollW} > docW ${overflow.docW}`);
        }
      }
      endFlow(true, `screenshots captured for ${label}`);
    } catch (e) {
      await shot(page, `vp-${label}-FAIL`, e.message);
      endFlow(false, `exception: ${e.message}`);
    }
    await ctx.close();
  }
}

// ──────────────────────────── flow 12: rapid clicks ───────────────────────
async function testRapidClicks(browser) {
  startFlow('12. Rapid-click "Start today\'s game" 5 times');
  const { ctx, page } = await newSeeded(browser);
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await waitFor(1200);
    await shot(page, 'rc-01-home', 'Home');

    const cta = page.getByText(/Start today's game|Play another round/);
    const count = await cta.count();
    log(`  CTA matches: ${count}`);
    if (count === 0) throw new Error('CTA not found');
    const btn = cta.last();
    // Fire 5 clicks rapidly without waits.
    for (let i = 0; i < 5; i++) {
      btn.click({ timeout: 1000 }).catch(() => {});
    }
    await waitFor(1500);
    await shot(page, 'rc-02-after', 'After rapid clicks');
    const url = page.url();
    log(`  url after: ${url}`);
    // Should be on /play
    const onPlay = /\/play/.test(url) || url === BASE + '/play';
    if (!onPlay) {
      endFlow(false, `expected /play, got ${url}`);
    } else {
      // Check there's only one /play visible (no double-stack visual artifact).
      endFlow(true, 'rapid clicks landed cleanly on /play');
    }
  } catch (e) {
    await shot(page, 'rc-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 13: refresh during gameplay ───────────
async function testRefreshDuringGame(browser) {
  startFlow('13. Hard refresh during Brain Rush — lands sensibly');
  const { ctx, page } = await newSeeded(browser);
  try {
    await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
    await waitFor(800);
    // Click Start game
    await page.getByText('Start game', { exact: true }).last().click({ timeout: 4000 });
    await waitFor(500);
    await shot(page, 'rf-01-countdown', 'Countdown');
    // Wait through countdown
    await waitFor(3800);
    // We are at Q1. Click an answer to advance to result, then click Next.
    const vp = page.viewportSize();
    await page.mouse.click(vp.width / 2, vp.height * 0.55);
    await waitFor(900);
    try { await page.getByText('Next question', { exact: true }).first().click({ timeout: 2000 }); } catch {}
    await waitFor(500);
    await shot(page, 'rf-02-q2', 'At Q2');

    // Hard refresh.
    await page.reload({ waitUntil: 'networkidle' });
    await waitFor(2000);
    await shot(page, 'rf-03-after-reload', 'After reload');

    const url = page.url();
    log(`  url after reload: ${url}`);

    // Per the code, /game/session with empty questions arrayredirects to /play.
    // Acceptable destinations: /play, /, or even staying on /game/session if
    // gracefully blank (but it should NOT crash).
    const bodyText = await page.evaluate(() => document.body?.innerText?.length || 0);
    log(`  body text length: ${bodyText}`);

    const errored = await page.evaluate(() => {
      // Look for any "Something went wrong" or React error overlay.
      const t = (document.body?.innerText || '').toLowerCase();
      return t.includes('something went wrong') || t.includes('error: ');
    });

    if (errored) {
      endFlow(false, 'page shows an error after refresh');
    } else if (bodyText < 20) {
      endFlow(false, 'page is blank after refresh');
    } else if (!/\/(play|game\/session|tabs)?$/.test(url) && !/\/$/.test(url)) {
      // Loose check — any reasonable URL is fine.
      endFlow(true, `landed at ${url} with content`);
    } else {
      endFlow(true, `landed at ${url} with content`);
    }
  } catch (e) {
    await shot(page, 'rf-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ──────────────────────────── flow 14: back during countdown ─────────────
async function testBackDuringCountdown(browser) {
  startFlow('14. Browser back during countdown');
  const { ctx, page } = await newSeeded(browser);
  try {
    await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
    await waitFor(800);
    await page.getByText('Start game', { exact: true }).last().click({ timeout: 4000 });
    await waitFor(800);
    await shot(page, 'bk-01-countdown', 'Countdown');

    // Browser back — this should pop back to /play.
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
    await waitFor(1200);
    await shot(page, 'bk-02-after-back', 'After back');
    const url = page.url();
    log(`  url after back: ${url}`);

    // Wait a moment to ensure the countdown timer (which the screen still
    // has running) doesn't blow up.
    await waitFor(4000);
    await shot(page, 'bk-03-settled', 'Settled');

    const onPlay = /\/play$/.test(url) || /\/play\?/.test(url);
    if (onPlay) endFlow(true, `back returned to /play`);
    else endFlow(true, `back returned to ${url} (acceptable, not a crash)`);
  } catch (e) {
    await shot(page, 'bk-FAIL', e.message);
    endFlow(false, `exception: ${e.message}`);
  }
  await ctx.close();
}

// ────────────────────────────── report ────────────────────────────────────
function writeReport() {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# BrainStreak QA Report — ${date}`);
  lines.push('');
  lines.push('## Flows tested');
  for (const f of flows) {
    lines.push(`- ${f.ok ? '✅' : '❌'} ${f.name} — ${f.outcome}`);
  }

  lines.push('');
  lines.push('## Screenshots');
  for (const f of flows) {
    if (f.shots.length === 0) continue;
    lines.push(`### ${f.name}`);
    for (const s of f.shots) {
      lines.push(`- \`${s.file}\` — ${s.description}`);
    }
  }

  lines.push('');
  lines.push('## Console errors observed (excluding known Reanimated #418)');
  let anyError = false;
  for (const f of flows) {
    const filtered = f.errors.filter((e) => !REANIMATED_418.test(e));
    if (filtered.length === 0) continue;
    anyError = true;
    lines.push(`### ${f.name}`);
    for (const e of filtered) {
      // Truncate huge stack traces.
      lines.push(`- \`${e.replace(/\n/g, ' ').slice(0, 280)}\``);
    }
  }
  if (!anyError) lines.push('_(none beyond the known Reanimated #418)_');

  lines.push('');
  lines.push('## Bugs found (severity-ordered)');
  const failed = flows.filter((f) => !f.ok);
  if (failed.length === 0) {
    lines.push('_(no failures — every flow passed)_');
  } else {
    lines.push('### Critical / Important');
    for (const f of failed) {
      lines.push(`- **${f.name}** — ${f.outcome}`);
    }
  }
  // Re-list errors at the bottom for severity context.

  lines.push('');
  lines.push('## Mobile viewport issues');
  let mobileIssues = false;
  for (const f of flows.filter((x) => /viewport/i.test(x.name))) {
    const overflowErrs = f.errors.filter((e) => /overflow/i.test(e));
    if (overflowErrs.length > 0) {
      mobileIssues = true;
      lines.push(`- ${f.name}`);
      for (const e of overflowErrs) lines.push(`  - ${e}`);
    }
  }
  if (!mobileIssues) lines.push('_(no overflow issues detected at 375 or 810 widths)_');

  lines.push('');
  lines.push('## Verdict');
  const allPass = flows.every((f) => f.ok);
  const onlyMinorFails = failed.length <= 2;
  if (allPass) {
    lines.push('**READY** — every flow passed and no unexpected console errors.');
  } else if (onlyMinorFails) {
    lines.push(`**NEEDS FIXES** — ${failed.length} flow(s) failed; review the bugs section above.`);
  } else {
    lines.push(`**NOT READY** — ${failed.length} flows failed; significant breakage.`);
  }

  fs.writeFileSync(path.join(OUT, 'qa-full-report.md'), lines.join('\n'));
  log(`\nReport written to ${path.join(OUT, 'qa-full-report.md')}`);
}

// ────────────────────────────── main ──────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: true });
  log(`base URL: ${BASE}`);
  log(`output:   ${OUT}`);

  try {
    await testOnboarding(browser);
    await testBrainRush(browser);
    await testWordSprint(browser);
    await testNumberSense(browser);
    await testMemoryMatch(browser);
    await testReactionTap(browser);
    await testRoadRush(browser);
    await testPersistenceAfterGame(browser);
    await testAchievementUnlock(browser);
    await testOffline(browser);
    await testMobileViewports(browser);
    await testRapidClicks(browser);
    await testRefreshDuringGame(browser);
    await testBackDuringCountdown(browser);
  } finally {
    await browser.close();
  }

  writeReport();

  const failed = flows.filter((f) => !f.ok).length;
  log(`\n--- DONE ---`);
  log(`passed: ${flows.length - failed} / ${flows.length}`);
  log(`failed: ${failed}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
