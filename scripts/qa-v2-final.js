'use strict';
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const OUT = '/Users/basusingh/Desktop/Mob_App/qa-out/v2-evidence';
fs.mkdirSync(OUT, { recursive: true });

async function seedOnboarded(ctx) {
  await ctx.addInitScript(() => {
    try {
      if (!localStorage.getItem('@brainstreak/profile')) {
        localStorage.setItem('@brainstreak/profile', JSON.stringify({
          state: { profile: { username: 'QA_V2', totalXP: 120, level: 2, gamesPlayed: 5 }, streak: { current: 3, longest: 5, lastPlayDate: null }, authState: 'anonymous', authedUserId: null }, version: 0
        }));
      }
      if (!localStorage.getItem('@brainstreak/settings')) {
        localStorage.setItem('@brainstreak/settings', JSON.stringify({ state: { onboarded: true, soundOn: false, hapticsOn: false, dailyReminderTime: null }, version: 0 }));
      }
      if (!localStorage.getItem('@brainstreak/achievements')) {
        localStorage.setItem('@brainstreak/achievements', JSON.stringify({ state: { unlocked: ['first-round'] }, version: 0 }));
      }
    } catch {}
  });
}

(async () => {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone 13 Pro'];
  const ctx = await browser.newContext({ ...iPhone });
  await seedOnboarded(ctx);
  const page = await ctx.newPage();

  // Cartoon evidence: Reaction Tap zap, Number Sense fully settled
  console.log('=== Number Sense — capture after numbers settle ===');
  await page.goto(BASE + '/game/number-sense', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 4000)); // let counting numbers settle
  await page.screenshot({ path: path.join(OUT, '07-number-sense-settled.png'), fullPage: false });
  console.log('shot: 07-number-sense-settled.png');

  console.log('=== Reaction Tap — capture early ===');
  await page.goto(BASE + '/game/reaction-tap', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUT, '08-reaction-tap-early.png'), fullPage: false });
  // tap once where the dot likely is
  await page.mouse.click(196, 400);
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '08-reaction-tap-after-tap.png'), fullPage: false });
  console.log('shot: 08-reaction-tap-*.png');

  console.log('=== Color Trap — verify off-theme bg ===');
  await page.goto(BASE + '/game/color-trap', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, '09-color-trap.png'), fullPage: false });

  console.log('=== Word Sprint cartoon letters ===');
  await page.goto(BASE + '/game/word-sprint', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, '10-word-sprint.png'), fullPage: false });

  console.log('=== Memory Match — capture combo ===');
  await page.goto(BASE + '/game/memory-match', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT, '11-memory-match.png'), fullPage: false });

  console.log('=== Brain Rush deep capture — countdown -> Q1 ===');
  await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '12-play-tab.png'), fullPage: false });
  // try clicking "Start game" or "Tap to play" on play tab
  for (const t of ['Start game', 'Tap to play', 'TAP TO PLAY', 'Start']) {
    const el = page.getByText(t, { exact: false }).first();
    if (await el.count()) {
      try { await el.click({ timeout: 1500 }); break; } catch {}
    }
  }
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(OUT, '13-brain-rush-q1.png'), fullPage: false });

  // Visit Profile and the See full stats link path
  console.log('=== Profile / Stats final ===');
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '14-profile-final.png'), fullPage: false });

  // Animated background orbs visibility on home
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 2000));
  // Sample top-left and top-right corners which should hold orbs
  const bgPixels = await page.evaluate(() => {
    // walk all absolutely-positioned circular elements
    const orbs = [];
    document.querySelectorAll('div').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.borderRadius && parseInt(cs.borderRadius) > 50 && cs.opacity && parseFloat(cs.opacity) > 0.1) {
        const r = el.getBoundingClientRect();
        if (r.width > 100 && r.width < 500) orbs.push({ w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, op: cs.opacity });
      }
    });
    return orbs.slice(0, 10);
  });
  console.log('background orbs detected:', JSON.stringify(bgPixels, null, 2));

  await browser.close();
})();
