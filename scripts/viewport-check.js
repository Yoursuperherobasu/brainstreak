#!/usr/bin/env node
// Visual viewport check at iPhone SE, iPhone 11, iPad portrait, and desktop.
// Confirms the layout doesn't break at narrow widths or stretch into walls
// of whitespace on wide widths.
// Run: BASE=http://127.0.0.1:8090 node scripts/viewport-check.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const OUT = path.join(__dirname, '..', 'viewport-out');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [
  { name: 'iphone-se',  width: 375,  height: 667 },
  { name: 'iphone-11',  width: 414,  height: 896 },
  { name: 'ipad',       width: 810,  height: 1080 },
  { name: 'desktop',    width: 1440, height: 900 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  for (const s of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: s.width, height: s.height },
      deviceScaleFactor: 2,
    });
    await ctx.addInitScript(() => {
      try {
        const profile = {
          state: {
            profile: { username: 'Tester', totalXP: 280, level: 3, gamesPlayed: 6 },
            streak: { current: 4, longest: 7, lastPlayDate: new Date().toISOString().slice(0, 10) },
            authState: 'anonymous',
            authedUserId: null,
          },
          version: 0,
        };
        const settings = { state: { onboarded: true, soundOn: true, dailyReminderTime: null }, version: 0 };
        localStorage.setItem('@brainstreak/profile', JSON.stringify(profile));
        localStorage.setItem('@brainstreak/settings', JSON.stringify(settings));
      } catch {}
    });
    const page = await ctx.newPage();

    for (const route of ['/', '/play', '/profile']) {
      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 8000 });
        await page.waitForTimeout(1000);
        const safe = route === '/' ? 'home' : route.slice(1).replace(/\//g, '-');
        await page.screenshot({
          path: path.join(OUT, `${s.name}-${safe}.png`),
          fullPage: false,
        });
      } catch (e) {
        console.error(`${s.name} ${route}: ${e.message}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`Output: ${OUT}`);
  console.log(`Sizes captured: ${SIZES.map((s) => s.name).join(', ')}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
