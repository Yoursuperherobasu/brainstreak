// V2 evidence capture for Sunwashed Arcade theme + new features.
// Pre-seeds localStorage so onboarding is skipped. Uses iPhone 13 Pro descriptor.
'use strict';

const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const OUT = '/Users/basusingh/Desktop/Mob_App/qa-out/v2-evidence';
fs.mkdirSync(OUT, { recursive: true });

async function seedOnboarded(ctx, username = 'QA_V2') {
  await ctx.addInitScript((u) => {
    try {
      if (!localStorage.getItem('@brainstreak/profile')) {
        const profile = {
          state: {
            profile: { username: u, totalXP: 120, level: 2, gamesPlayed: 5 },
            streak: { current: 3, longest: 5, lastPlayDate: null },
            authState: 'anonymous',
            authedUserId: null,
          },
          version: 0,
        };
        localStorage.setItem('@brainstreak/profile', JSON.stringify(profile));
      }
      if (!localStorage.getItem('@brainstreak/settings')) {
        const settings = {
          state: { onboarded: true, soundOn: false, hapticsOn: false, dailyReminderTime: null },
          version: 0,
        };
        localStorage.setItem('@brainstreak/settings', JSON.stringify(settings));
      }
      if (!localStorage.getItem('@brainstreak/achievements')) {
        localStorage.setItem('@brainstreak/achievements', JSON.stringify({ state: { unlocked: ['first-round'] }, version: 0 }));
      }
    } catch {}
  }, username);
}

async function waitFor(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function shot(page, name, note) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  shot: ${name}.png  ${note || ''}`);
}

(async () => {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone 13 Pro'];
  const ctx = await browser.newContext({ ...iPhone });
  await seedOnboarded(ctx);
  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  console.log('=== 1. Home (Sunwashed Arcade theme) ===');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await waitFor(2000); // let orbs animate
  await shot(page, '01-home-theme', 'Cream + Brain Rush hero + Warmups rail');

  // Sample the document background color to confirm cream theme
  const bodyBg = await page.evaluate(() => {
    const el = document.querySelector('div'); // root view
    return el ? getComputedStyle(el).backgroundColor : null;
  });
  console.log(`  body bg sample: ${bodyBg}`);

  // Count "warmup" text occurrences to confirm rail rendered
  const bodyText = await page.evaluate(() => document.body.innerText || '');
  console.log(`  /  body length: ${bodyText.length}`);
  const hasBrainRush = /brain rush/i.test(bodyText);
  const hasWarmups = /warmup/i.test(bodyText);
  const hasDaily = /daily challenge/i.test(bodyText);
  console.log(`  text checks → brainRush=${hasBrainRush} warmups=${hasWarmups} daily=${hasDaily}`);

  // Try a full-page screenshot too so the Warmups rail (below the fold) is captured
  await page.screenshot({ path: path.join(OUT, '01-home-full.png'), fullPage: true });
  console.log('  shot: 01-home-full.png  full-page');

  console.log('=== 2. /stats (charts) ===');
  await page.goto(BASE + '/stats', { waitUntil: 'networkidle' });
  await waitFor(1500);
  await shot(page, '02-stats', 'Heatmap + Bars + Radar');
  await page.screenshot({ path: path.join(OUT, '02-stats-full.png'), fullPage: true });
  const statsText = await page.evaluate(() => document.body.innerText || '');
  console.log(`  /stats body length: ${statsText.length}`);
  // SVG nodes in stats page
  const svgCount = await page.evaluate(() => document.querySelectorAll('svg').length);
  console.log(`  svg nodes: ${svgCount}`);

  console.log('=== 3. /profile (See full stats link) ===');
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
  await waitFor(1500);
  await shot(page, '03-profile', 'Profile with "See full stats" link');
  await page.screenshot({ path: path.join(OUT, '03-profile-full.png'), fullPage: true });
  const profileText = await page.evaluate(() => document.body.innerText || '');
  const hasSeeFullStats = /see full stats/i.test(profileText);
  console.log(`  "See full stats" present: ${hasSeeFullStats}`);

  console.log('=== 4. /game/road-rush (car renders) ===');
  await page.goto(BASE + '/game/road-rush', { waitUntil: 'networkidle' });
  await waitFor(1500);
  await shot(page, '04-road-rush-idle', 'Road Rush idle');
  // SVG should be the player car
  const rrSvgs = await page.evaluate(() => document.querySelectorAll('svg').length);
  console.log(`  road-rush svgs: ${rrSvgs}`);

  console.log('=== 5. /game/odd-one-out (grid + contrast) ===');
  await page.goto(BASE + '/game/odd-one-out', { waitUntil: 'networkidle' });
  await waitFor(2500); // let the level kick in
  await shot(page, '05-odd-one-out', 'Odd One Out grid');
  // Tally distinct tile backgrounds. If there's an "odd" tile, we should see
  // at least 2 distinct colors.
  const tileColors = await page.evaluate(() => {
    const colors = new Set();
    document.querySelectorAll('[style*="background"]').forEach((el) => {
      const c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)') colors.add(c);
    });
    return [...colors];
  });
  console.log(`  distinct bg colors on page: ${tileColors.length}`);

  // Bonus: capture the new "stats" route from profile by clicking the link
  console.log('=== 6. Bonus: click "See full stats" from profile ===');
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
  await waitFor(1000);
  try {
    const link = page.getByText('See full stats', { exact: false }).first();
    if (await link.count()) {
      await link.click({ timeout: 3000 });
      await waitFor(1500);
      await shot(page, '06-stats-from-profile', 'Stats after clicking from Profile');
    } else {
      console.log('  link not found by text — skip');
    }
  } catch (e) {
    console.log(`  click failed: ${e.message}`);
  }

  console.log('\n--- DONE ---');
  console.log(`console errors (non-Reanimated): ${errors.filter((e) => !/418|hydration|did not match/i.test(e)).length}`);
  console.log(errors.slice(0, 5).join('\n'));

  await browser.close();
})();
