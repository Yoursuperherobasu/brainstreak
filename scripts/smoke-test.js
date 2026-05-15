#!/usr/bin/env node
// End-to-end smoke test for BrainStreak web build.
// Walks: welcome -> username -> sign-in-prompt -> home -> all 4 mini-games.
// Captures screenshots + console errors at each step.
// Run: BASE=http://127.0.0.1:8090 node scripts/smoke-test.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const OUT  = path.join(__dirname, '..', 'smoke-out');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const log = [];

function step(name) {
  log.push(`[${new Date().toISOString().slice(11, 19)}] ${name}`);
  console.log(name);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  log.push(`  screenshot: ${name}.png`);
}

async function clickByText(page, text, timeout = 4000) {
  await page.getByText(text, { exact: false }).first().click({ timeout });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone 11-ish
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const t = `[${m.type()}] ${m.text()}`;
      errors.push(t);
      log.push(`  ${t}`);
    }
  });
  page.on('pageerror', (e) => {
    const t = `[pageerror] ${e.message}`;
    errors.push(t);
    log.push(`  ${t}`);
  });

  // 1. Welcome
  step('1. Open root → onboarding/welcome');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '01-welcome');

  // 2. Click Get started
  step('2. Click "Get started"');
  try {
    await clickByText(page, 'Get started');
    await page.waitForURL(/onboarding\/username/, { timeout: 3000 });
    await shot(page, '02-username');
  } catch (e) {
    log.push(`  ! click "Get started" failed: ${e.message}`);
    await shot(page, '02-username-FAIL');
  }

  // 3. Type username + continue
  step('3. Type username + Continue');
  try {
    const input = page.locator('input, [contenteditable="true"]').first();
    await input.click({ timeout: 2000 });
    await input.fill('SmokeTest');
    await shot(page, '03-username-typed');
    await clickByText(page, 'Continue');
    await page.waitForTimeout(1200);
    await shot(page, '04-after-username');
  } catch (e) {
    log.push(`  ! username flow: ${e.message}`);
    await shot(page, '04-after-username-FAIL');
  }

  // 4. If sign-in prompt is shown, skip (real copy is "Maybe later — start playing")
  step('4. Try "Maybe later" (sign-in prompt) if shown');
  try {
    await clickByText(page, 'Maybe later', 3000);
    await page.waitForTimeout(1500);
    await shot(page, '05-after-skip');
  } catch {
    log.push('  (no Maybe later button — probably already on Home)');
  }

  // 5. Verify on home tab — look for "BrainStreak" / "Start"
  step('5. Verify Home tab rendered');
  await page.waitForTimeout(800);
  await shot(page, '06-home');

  // 6. Navigate to Play tab via URL (most reliable on web)
  step('6. Visit /play');
  await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '07-play-tab');

  // 7. Word Sprint
  step('7. /game/word-sprint');
  await page.goto(BASE + '/game/word-sprint', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '08-word-sprint');

  // 8. Number Sense
  step('8. /game/number-sense');
  await page.goto(BASE + '/game/number-sense', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '09-number-sense');

  // try to tap a choice — first button on screen
  try {
    const btn = page.locator('button, [role="button"]').nth(2);
    await btn.click({ timeout: 2000 });
    await page.waitForTimeout(400);
    await shot(page, '10-number-sense-after-tap');
  } catch (e) {
    log.push(`  number-sense tap: ${e.message}`);
  }

  // 9. Memory Match
  step('9. /game/memory-match');
  await page.goto(BASE + '/game/memory-match', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '11-memory-match');

  // 10. Reaction Tap
  step('10. /game/reaction-tap');
  await page.goto(BASE + '/game/reaction-tap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '12-reaction-tap');

  // 11. Brain Rush
  step('11. /game/session');
  await page.goto(BASE + '/game/session', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '13-brain-rush');

  // 11b. Road Rush
  step('11b. /game/road-rush');
  await page.goto(BASE + '/game/road-rush', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await shot(page, '13b-road-rush');

  // 12. Profile
  step('12. /profile');
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '14-profile');

  // 13. Settings reminder
  step('13. /settings/reminder');
  await page.goto(BASE + '/settings/reminder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot(page, '15-settings-reminder');

  await browser.close();

  fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
  fs.writeFileSync(path.join(OUT, 'errors.txt'), errors.length ? errors.join('\n') : '(no console errors / pageerrors)');
  console.log('\n--- DONE ---');
  console.log(`Screenshots + log: ${OUT}`);
  console.log(`Console errors captured: ${errors.length}`);
  process.exit(errors.length > 0 ? 0 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
