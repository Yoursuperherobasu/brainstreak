#!/usr/bin/env node
// Real end-to-end test. Pre-seeds onboarded state, then ACTUALLY CLICKS
// through Play → mini-games and Play → Brain Rush → X-quit. Screenshots
// every step + captures every console error.
// Run: BASE=http://127.0.0.1:8090 node scripts/e2e-test.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const OUT = path.join(__dirname, '..', 'e2e-out');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const log = [];

function step(name) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${name}`;
  log.push(line);
  console.log(line);
}

async function shot(page, name) {
  const p = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  log.push(`  screenshot: ${name}.png`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
  });

  // Pre-seed onboarded state via localStorage on origin BEFORE first page.goto.
  await ctx.addInitScript(() => {
    try {
      const profile = {
        state: {
          profile: { username: 'E2E', totalXP: 0, level: 1, gamesPlayed: 0 },
          streak: { current: 0, longest: 0, lastPlayDate: null },
          authState: 'anonymous',
          authedUserId: null,
        },
        version: 0,
      };
      const settings = {
        state: { onboarded: true, soundOn: true, dailyReminderTime: null },
        version: 0,
      };
      localStorage.setItem('@brainstreak/profile', JSON.stringify(profile));
      localStorage.setItem('@brainstreak/settings', JSON.stringify(settings));
    } catch {}
  });

  const page = await ctx.newPage();

  page.on('console', (m) => {
    const t = m.type();
    if (t !== 'error' && t !== 'warning') return;
    const text = `[${t}] ${m.text()}`;
    errors.push(text);
    log.push(`  ${text}`);
  });
  page.on('pageerror', (e) => {
    const text = `[pageerror] ${e.message}`;
    errors.push(text);
    log.push(`  ${text}`);
  });

  // 1. Land on Home (since onboarded=true).
  step('1. Go to / — expect Home');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '01-home');

  // 2. Navigate to Play tab via URL (most reliable).
  step('2. Go to /play');
  await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '02-play');

  // 3. Verify all 8 mini-game tile titles are present on Play.
  step('3. Verify mini-game tiles are visible');
  const mini = [
    'Word Sprint',
    'Number Sense',
    'Memory Match',
    'Reaction Tap',
    'Road Rush',
    'Color Trap',
    'Odd One Out',
    'Pattern Recall',
  ];
  for (const name of mini) {
    const count = await page.getByText(name, { exact: false }).count();
    log.push(`  tile "${name}": ${count} matches`);
    if (count === 0) errors.push(`MISSING TILE: ${name}`);
  }

  // 3b. For each new game, navigate directly to /game/<id> and verify the
  //     screen renders (no pageerror, screen title in DOM).
  for (const pair of [
    ['color-trap', 'Color Trap'],
    ['odd-one-out', 'Odd One Out'],
    ['pattern-recall', 'Pattern Recall'],
  ]) {
    const id = pair[0], title = pair[1];
    step(`3b. Visit /game/${id}`);
    await page.goto(BASE + `/game/${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await shot(page, `02b-${id}`);
    const t = await page.getByText(title, { exact: false }).count();
    log.push(`  title "${title}" matches: ${t}`);
    if (t === 0) errors.push(`MISSING GAME SCREEN: ${title}`);
  }
  // Return to play before the click test.
  await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 4. Try clicking the Word Sprint tile by its visible text.
  step('4. Click "Word Sprint" tile');
  try {
    await page.getByText('Word Sprint').first().click({ timeout: 4000 });
    await page.waitForTimeout(1500);
    await shot(page, '03-word-sprint-after-click');
    const url = page.url();
    log.push(`  url after click: ${url}`);
    if (!url.includes('/game/word-sprint')) {
      errors.push(`FAIL: Word Sprint click did not navigate. URL=${url}`);
    }
  } catch (e) {
    errors.push(`FAIL: Word Sprint click error: ${e.message}`);
    await shot(page, '03-word-sprint-click-FAIL');
  }

  // 5. Back to Play.
  step('5. Back to /play');
  await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 6. Tap "Mixed" category (BrainRush starts in Mixed already, but let's be explicit)
  //    then tap the big "Start today's game" / "Start playing" button to launch session.
  step('6. Launch Brain Rush — find and tap Start button');
  try {
    // The Brain Rush Start CTA is labeled "Start game" (Play tab) or
    // "Start today's game" (Home). Match exactly to avoid grabbing the
    // bottom "Play" tab label.
    const c = page.getByText('Start game', { exact: true });
    const count = await c.count();
    log.push(`  "Start game" matches: ${count}`);
    if (count === 0) throw new Error('Start game button not found');
    await c.last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await c.last().click({ timeout: 3000 });
    log.push('  clicked "Start game"');
    // Capture the countdown screen with the new X button.
    await page.waitForTimeout(800);
    await shot(page, '04a-during-countdown');
    // Wait for countdown to finish (~3s) so we're in the playing phase.
    await page.waitForTimeout(3500);
    await shot(page, '04-brain-rush-playing');
    const url = page.url();
    log.push(`  url after start: ${url}`);
    if (!url.includes('/game/session')) {
      errors.push(`FAIL: Brain Rush Start did not navigate to /game/session. URL=${url}`);
    }
  } catch (e) {
    errors.push(`FAIL: Brain Rush start: ${e.message}`);
    await shot(page, '04-brain-rush-start-FAIL');
  }

  // 7. THE BIG ONE: try to click the X close button. Bypass the confirm dialog
  //    by auto-accepting it. Then verify we're back on /play.
  step('7. Click X close button in game');
  page.on('dialog', async (d) => {
    log.push(`  dialog: ${d.type()} message="${d.message()}"`);
    await d.accept();
  });
  try {
    // The X is "✕". Look for aria-label first (web path), fall back to text.
    let clickedX = false;
    const byAria = page.locator('[aria-label="Quit round"]');
    if ((await byAria.count()) > 0) {
      await byAria.first().click({ timeout: 3000 });
      clickedX = true;
      log.push('  clicked X via aria-label');
    } else {
      // Fall back: find a small button containing the ✕ character.
      const byChar = page.getByText('✕');
      if ((await byChar.count()) > 0) {
        await byChar.first().click({ timeout: 3000 });
        clickedX = true;
        log.push('  clicked X via text');
      }
    }
    if (!clickedX) throw new Error('no X button found in DOM');

    await page.waitForTimeout(2000);
    await shot(page, '05-after-x-click');
    const url = page.url();
    log.push(`  url after X: ${url}`);
    if (url.includes('/game/session')) {
      errors.push(`FAIL: X click did not leave /game/session. URL=${url}`);
    } else {
      log.push(`  PASS: X click navigated away (to ${url})`);
    }
  } catch (e) {
    errors.push(`FAIL: X click error: ${e.message}`);
    await shot(page, '05-x-click-FAIL');
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
  fs.writeFileSync(path.join(OUT, 'errors.txt'), errors.length ? errors.join('\n') : '(no errors)');
  console.log('\n--- DONE ---');
  console.log(`Output: ${OUT}`);
  console.log(`Errors: ${errors.length}`);
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
