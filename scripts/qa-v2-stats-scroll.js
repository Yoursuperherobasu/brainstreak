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
  await page.goto(BASE + '/stats', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 1500));

  // Try to find the inner ScrollView and screenshot via scrolling
  // Many RN-web ScrollViews are nested divs with overflow:scroll/auto.
  const scrollables = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      const sh = el.scrollHeight;
      const ch = el.clientHeight;
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && sh > ch + 4) {
        out.push({ tag: el.tagName, classes: el.className, sh, ch });
      }
    });
    return out;
  });
  console.log('Scrollable nodes:', JSON.stringify(scrollables, null, 2));

  // Scroll the largest scrollable to the bottom
  await page.evaluate(() => {
    let best = null;
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        if (!best || (el.scrollHeight - el.clientHeight) > (best.scrollHeight - best.clientHeight)) best = el;
      }
    });
    if (best) best.scrollTop = best.scrollHeight;
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT, '02-stats-scrolled-bottom.png'), fullPage: false });
  console.log('shot: 02-stats-scrolled-bottom.png');

  // Mid scroll
  await page.evaluate(() => {
    let best = null;
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        if (!best || (el.scrollHeight - el.clientHeight) > (best.scrollHeight - best.clientHeight)) best = el;
      }
    });
    if (best) best.scrollTop = Math.floor((best.scrollHeight - best.clientHeight) / 2);
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT, '02-stats-scrolled-mid.png'), fullPage: false });
  console.log('shot: 02-stats-scrolled-mid.png');

  // Count SVGs once scrolled
  const svgCount = await page.evaluate(() => document.querySelectorAll('svg').length);
  console.log('svg nodes (after scroll):', svgCount);

  // Likewise scroll home to see Warmups rail and Your stats
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
    let best = null;
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        if (!best || (el.scrollHeight - el.clientHeight) > (best.scrollHeight - best.clientHeight)) best = el;
      }
    });
    if (best) best.scrollTop = best.scrollHeight;
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT, '01-home-scrolled-bottom.png'), fullPage: false });
  console.log('shot: 01-home-scrolled-bottom.png');

  // Visit /game/odd-one-out and let it tick to actually start the round, capture grid
  await page.goto(BASE + '/game/odd-one-out', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '05-odd-one-out-early.png'), fullPage: false });
  // try to tap "Start" or any button to begin
  const startEl = page.getByText(/start/i).first();
  try {
    if (await startEl.count()) await startEl.click({ timeout: 1500 });
  } catch {}
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '05-odd-one-out-after-start.png'), fullPage: false });

  // Also capture Brain Rush limelight CTA by tapping the home hero CTA
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '01-home-hero-closeup.png'), fullPage: false });

  await browser.close();
})();
