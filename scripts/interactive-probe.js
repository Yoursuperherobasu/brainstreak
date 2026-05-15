#!/usr/bin/env node
// Interactive probe — actually plays each mini-game with Playwright,
// captures mid-play screenshots, and logs console errors per page.
// Run: BASE=http://127.0.0.1:8090 node scripts/interactive-probe.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const OUT = path.join(__dirname, '..', 'probe-out');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const allErrors = [];
const log = [];

function note(msg) {
  log.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
  console.log(msg);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  log.push(`  screenshot: ${name}.png`);
}

function attachConsole(page, label) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const t = `[${label}] [${m.type()}] ${m.text()}`;
      allErrors.push(t);
      log.push(`  ${t}`);
    }
  });
  page.on('pageerror', (e) => {
    const t = `[${label}] [pageerror] ${e.message}`;
    allErrors.push(t);
    log.push(`  ${t}`);
  });
}

async function ensureOnboarded(page) {
  // Set localStorage to a fully onboarded state up-front so we land directly
  // on Home. Storage keys must match lib/storage.ts:StorageKeys exactly, and
  // AsyncStorage on web is plain localStorage with each key namespaced the
  // same way Zustand's persist middleware writes them.
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        '@brainstreak/settings',
        JSON.stringify({
          state: { onboarded: true, soundOn: true, hapticsOn: true, dailyReminderTime: null },
          version: 0,
        })
      );
      localStorage.setItem(
        '@brainstreak/profile',
        JSON.stringify({
          state: {
            profile: { username: 'ProbeBot', level: 1, totalXP: 0, gamesPlayed: 0 },
            streak: { current: 0, longest: 0, lastPlayDate: null },
            authState: 'anonymous',
            authedUserId: null,
          },
          version: 0,
        })
      );
    } catch {}
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  attachConsole(page, 'main');
  await ensureOnboarded(page);

  // 1. Land on home
  note('1. Home');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot(page, '01-home');

  // 2. Profile
  note('2. Profile');
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '02-profile');

  // 3. Play tab
  note('3. Play');
  await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '03-play');

  // 4. Brain Rush — pick category and tap start
  note('4. Brain Rush start');
  await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  try {
    await page.getByText('Start game', { exact: false }).first().click({ timeout: 2000 });
    await page.waitForTimeout(3500);
    await shot(page, '04-brain-rush-mid');
    // Try to tap an answer bubble
    try {
      const bubbles = page.locator('[data-testid*="bubble"], button, [role="button"]');
      const count = await bubbles.count();
      if (count > 3) {
        await bubbles.nth(3).click({ timeout: 1500 });
        await page.waitForTimeout(700);
        await shot(page, '04b-brain-rush-after-tap');
      }
    } catch (e) {
      note(`  brain-rush tap: ${e.message}`);
    }
  } catch (e) {
    note(`  brain-rush start failed: ${e.message}`);
    await shot(page, '04-brain-rush-FAIL');
  }

  // 5. Number Sense — tap a choice
  note('5. Number Sense play');
  await page.goto(BASE + '/game/number-sense', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '05-number-sense-loaded');
  // Find all buttons / pressables in the choices row.
  try {
    // The Exit "← Exit" is a Pressable text. Choices are plain Pressables with text "20","16","12".
    const c20 = page.locator('text=20');
    const exists = await c20.count();
    if (exists > 0) {
      await c20.first().click({ timeout: 1500 });
      await page.waitForTimeout(400);
      await shot(page, '05b-number-sense-after-tap');
    } else {
      note('  no "20" choice visible — choices labelling may have changed');
    }
  } catch (e) {
    note(`  number-sense tap: ${e.message}`);
  }

  // 6. Word Sprint — type a word
  note('6. Word Sprint type');
  await page.goto(BASE + '/game/word-sprint', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot(page, '06-word-sprint-loaded');
  try {
    // The letters get shuffled at random. Read them off the screen, pick first 3,
    // type that as an attempt — it almost certainly won't match a real word but
    // exercises the submit handler.
    const input = page.locator('input[placeholder*="word"]').first();
    await input.click({ timeout: 1500 });
    await input.fill('abc');
    await page.waitForTimeout(200);
    await shot(page, '06b-word-sprint-typed');
    await page.getByText('Submit', { exact: false }).first().click({ timeout: 1500 });
    await page.waitForTimeout(300);
    await shot(page, '06c-word-sprint-submitted');
  } catch (e) {
    note(`  word-sprint typing: ${e.message}`);
  }

  // 7. Memory Match — wait through sequence then tap
  note('7. Memory Match');
  await page.goto(BASE + '/game/memory-match', { waitUntil: 'networkidle' });
  // sequence playback ≈ (FLASH+GAP)*N. Round 1 is length 1 → ~700ms.
  await page.waitForTimeout(1800);
  await shot(page, '07-memory-match-input-phase');

  // 8. Reaction Tap — wait for dot, click it
  note('8. Reaction Tap');
  await page.goto(BASE + '/game/reaction-tap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await shot(page, '08-reaction-tap-loaded');
  // The dot is a Pressable inside a positioned wrap. Try clicking center of field.
  try {
    // Tap repeatedly around centre.
    const field = page.locator('[style*="aspectRatio"], div').first();
    const box = await field.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(400);
    await shot(page, '08b-reaction-tap-after-click');
  } catch (e) {
    note(`  reaction tap: ${e.message}`);
  }

  // 9. Road Rush — render then tap once to switch lanes
  note('9. Road Rush');
  await page.goto(BASE + '/game/road-rush', { waitUntil: 'networkidle' });
  // The game starts the moment the screen mounts (no idle phase). Capture
  // the FIRST frame, then a mid-play frame, then crash-state.
  await page.waitForTimeout(150);
  await shot(page, '09-road-rush-first-frame');
  await page.mouse.click(207, 400); // mid-canvas tap
  await page.waitForTimeout(700);
  await shot(page, '09b-road-rush-after-tap');
  await page.waitForTimeout(3500);
  await shot(page, '09c-road-rush-later');

  // 10. Test 404
  note('10. Random URL → 404');
  await page.goto(BASE + '/total-garbage', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shot(page, '10-not-found');

  // 11. Refresh on /game/session directly (should bounce to /play)
  note('11. /game/session direct → should bounce');
  await page.goto(BASE + '/game/session', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '11-session-bounce');
  const url = page.url();
  note(`  ended at: ${url}`);

  // 12. Resize test — wide viewport
  note('12. Wide viewport (tablet/desktop)');
  await ctx.close();

  const wideCtx = await browser.newContext({
    viewport: { width: 1024, height: 800 },
    deviceScaleFactor: 1,
  });
  const widePage = await wideCtx.newPage();
  attachConsole(widePage, 'wide');
  await ensureOnboarded(widePage);
  await widePage.goto(BASE + '/', { waitUntil: 'networkidle' });
  await widePage.waitForTimeout(900);
  await widePage.screenshot({ path: path.join(OUT, '12-home-wide.png') });
  await widePage.goto(BASE + '/play', { waitUntil: 'networkidle' });
  await widePage.waitForTimeout(700);
  await widePage.screenshot({ path: path.join(OUT, '12b-play-wide.png') });

  await browser.close();

  fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
  fs.writeFileSync(
    path.join(OUT, 'errors.txt'),
    allErrors.length ? allErrors.join('\n') : '(no console errors)'
  );
  console.log('\n--- DONE ---');
  console.log(`Errors captured: ${allErrors.length}`);
  console.log(`Out: ${OUT}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
