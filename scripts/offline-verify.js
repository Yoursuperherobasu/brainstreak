#!/usr/bin/env node
// Verify the app makes ZERO external network calls. We don't blanket-disable
// the network (that would block the local dev server too); instead, we
// allow the static localhost requests through and abort everything else.
// If the app needs to phone home, we'll see it here.
// Run: BASE=http://127.0.0.1:8090 node scripts/offline-verify.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const OUT = path.join(__dirname, '..', 'offline-out');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const externalRequests = [];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
  });

  // Block everything that is NOT served by the local static host. If the app
  // tries to call out (Supabase, OTDB, anything), we'll see it here and the
  // request will be aborted — simulating offline.
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('http://localhost:8090') || url.startsWith('data:') || url.startsWith('blob:')) {
      route.continue();
    } else {
      externalRequests.push(`${route.request().method()} ${url}`);
      route.abort();
    }
  });

  await ctx.addInitScript(() => {
    try {
      const profile = {
        state: {
          profile: { username: 'OfflineTest', totalXP: 0, level: 1, gamesPlayed: 0 },
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

  page.on('pageerror', (e) => {
    errors.push(`[pageerror] ${e.message}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console-error] ${m.text()}`);
  });

  const routes = [
    ['/', '01-home'],
    ['/play', '02-play'],
    ['/profile', '03-profile'],
    ['/onboarding/welcome', '04-welcome'],
    ['/onboarding/username', '05-username'],
    ['/game/word-sprint', '06-word-sprint'],
    ['/game/number-sense', '07-number-sense'],
    ['/game/memory-match', '08-memory-match'],
    ['/game/reaction-tap', '09-reaction-tap'],
    ['/game/road-rush', '10-road-rush'],
    ['/settings/reminder', '11-settings'],
  ];

  for (const [route, name] of routes) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 8000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
    } catch (e) {
      errors.push(`[nav] ${route}: ${e.message.split('\n')[0]}`);
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT, 'errors.txt'), errors.length ? errors.join('\n') : '(none)');
  fs.writeFileSync(path.join(OUT, 'external-requests.txt'), externalRequests.length
    ? externalRequests.join('\n')
    : '(none — app made zero external network calls)');

  console.log('\n--- DONE ---');
  console.log(`Output: ${OUT}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`External requests attempted: ${externalRequests.length}`);
  if (externalRequests.length > 0) {
    console.log('External requests:');
    externalRequests.forEach((r) => console.log('  ' + r));
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
