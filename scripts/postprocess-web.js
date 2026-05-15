#!/usr/bin/env node
// Post-process the `dist/` web export so the static HTML is shareable,
// installable, and looks professional in tabs / bookmarks / social previews.
//
// Expo's static export produces an empty <title> and no description / og
// tags / theme-color / manifest. This script walks every *.html in dist/,
// injects the missing <meta> + <title> + <link> elements into <head>, and
// writes a PWA manifest.webmanifest at the root. Idempotent — re-running
// just refreshes the tags in place.
//
// Run: node scripts/postprocess-web.js   (or as part of `npm run web:export`)

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

const APP_NAME = 'BrainStreak';
const APP_SHORT = 'BrainStreak';
const APP_DESC =
  '60 seconds a day. Math, words, and the world. Daily trivia with streaks, XP, and zero clutter.';
const THEME_COLOR = '#2F6FED';
const BG_COLOR = '#F6F7F9';

// Per-route titles so each tab / bookmark is meaningful. Falls back to the
// generic title for anything not listed.
const ROUTE_TITLES = {
  'index.html': `${APP_NAME} — Daily trivia & streaks`,
  '+not-found.html': `Page not found — ${APP_NAME}`,
  '_sitemap.html': `Sitemap — ${APP_NAME}`,
  'play.html': `Play — ${APP_NAME}`,
  'profile.html': `Profile — ${APP_NAME}`,
  '(tabs)/index.html': `${APP_NAME} — Daily trivia & streaks`,
  '(tabs)/play.html': `Play — ${APP_NAME}`,
  '(tabs)/profile.html': `Profile — ${APP_NAME}`,
  'onboarding/welcome.html': `Welcome — ${APP_NAME}`,
  'onboarding/username.html': `Pick a username — ${APP_NAME}`,
  'onboarding/sign-in-prompt.html': `Sync across devices — ${APP_NAME}`,
  'auth/sign-in.html': `Sign in — ${APP_NAME}`,
  'game/session.html': `Round in progress — ${APP_NAME}`,
  'settings/reminder.html': `Daily reminder — ${APP_NAME}`,
};

// Marker comment so we know which block we injected and can replace it
// idempotently on re-runs without piling up duplicates.
const BEGIN = '<!-- bs:meta:begin -->';
const END = '<!-- bs:meta:end -->';

function metaBlockFor(rel) {
  const title = ROUTE_TITLES[rel] ?? `${APP_NAME}`;
  const lines = [
    BEGIN,
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeAttr(APP_DESC)}" />`,
    `<meta name="theme-color" content="${THEME_COLOR}" />`,
    `<meta name="color-scheme" content="light" />`,
    `<meta name="apple-mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`,
    `<meta name="apple-mobile-web-app-title" content="${escapeAttr(APP_SHORT)}" />`,
    `<meta name="mobile-web-app-capable" content="yes" />`,
    `<meta name="application-name" content="${escapeAttr(APP_NAME)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeAttr(APP_NAME)}" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(APP_DESC)}" />`,
    `<meta property="og:image" content="/favicon.ico" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(APP_DESC)}" />`,
    `<link rel="manifest" href="/manifest.webmanifest" />`,
    `<link rel="apple-touch-icon" href="/favicon.ico" />`,
    END,
  ];
  return lines.join('');
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// React Native Web emits `body { overflow: hidden }` to keep RN's
// scroll-views in charge. On phone-sized viewports this works, but when
// our frame wrapper or the embedded ScrollView fails to receive height
// propagation (or content simply exceeds the visible area), the page
// becomes unscrollable. We layer in a tiny CSS shim that lets the body
// scroll as a fallback while leaving RN's inner scroll-views intact.
const SCROLL_FIX_CSS = `
<style id="bs-scroll-fix">
  html, body { height: 100% !important; }
  body { overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; overscroll-behavior-y: contain; }
  #root { min-height: 100vh; }
  /* Stop RN-Web's transient hidden overlays from blocking pointer/wheel events. */
  div[style*="position:absolute"][style*="visibility:hidden"][style*="pointer-events:none"] { pointer-events: none !important; }
</style>`;

function rewriteHtml(filePath, rel) {
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Strip any previous injection so we don't pile up duplicates.
  const between = new RegExp(
    `${escapeRegex(BEGIN)}[\\s\\S]*?${escapeRegex(END)}`,
    'g'
  );
  html = html.replace(between, '');
  // Also strip any previous scroll-fix block so re-runs don't duplicate.
  html = html.replace(/<style id="bs-scroll-fix">[\s\S]*?<\/style>/g, '');

  // 2. Drop Expo's empty <title> tags so the injected one wins.
  html = html.replace(/<title[^>]*><\/title>/g, '');

  // 3. Inject our block just before </head>.
  const block = metaBlockFor(rel) + SCROLL_FIX_CSS;
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${block}</head>`);
  } else {
    // No <head> (shouldn't happen for Expo exports, but be safe).
    html = block + html;
  }

  fs.writeFileSync(filePath, html);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // Skip Expo's static asset bundle — we only care about HTML.
      if (entry.name === '_expo' || entry.name === 'assets') continue;
      walk(full, rel);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      rewriteHtml(full, rel);
      console.log('   wrote meta →', rel);
    }
  }
}

function writeManifest() {
  const manifest = {
    name: APP_NAME,
    short_name: APP_SHORT,
    description: APP_DESC,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BG_COLOR,
    theme_color: THEME_COLOR,
    lang: 'en',
    icons: [
      // Reuse the existing favicon — sized small but valid for installable
      // PWA. Larger sizes would come from assets/icon.png; expo-export
      // already copies favicon.ico into dist/.
      { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
    ],
  };
  fs.writeFileSync(
    path.join(DIST, 'manifest.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('   wrote manifest → manifest.webmanifest');
}

// Patch Vite-style `import.meta.env.MODE` references that some libraries
// (e.g. Zustand's devtools middleware) embed in their distributed code.
// Metro bundles them through to the web output verbatim, but the classic-
// <script> tag we emit can't execute `import.meta`, so the bundle errors at
// load and React never hydrates → buttons appear but don't fire. We surgically
// rewrite the access to a harmless equivalent.
function patchImportMeta() {
  const jsDir = path.join(DIST, '_expo', 'static', 'js', 'web');
  if (!fs.existsSync(jsDir)) return;
  for (const name of fs.readdirSync(jsDir)) {
    if (!name.endsWith('.js')) continue;
    const p = path.join(jsDir, name);
    let src = fs.readFileSync(p, 'utf8');
    if (!src.includes('import.meta')) continue;
    // Replace every `import.meta.env` access with an object literal so the
    // surrounding optional-chain / ternary degrades to the production branch.
    const before = src;
    src = src.replace(/import\.meta\.env/g, '({MODE:"production",PROD:!0,DEV:!1})');
    // Belt-and-suspenders: bare `import.meta` (no .env) → empty object.
    src = src.replace(/import\.meta(?!\.)/g, '({})');
    if (src !== before) {
      fs.writeFileSync(p, src);
      console.log('   patched import.meta →', name);
    }
  }
}

// Make `serve` (and most static hosts) fall back to the friendly +not-found
// page for any unknown URL. Without this, hitting /total-garbage shows the
// server's plain "404 The requested path could not be found" instead of the
// in-app 404 with branding and a Home button.
//
// We do this two ways so the dev static-serve AND production hosts both work:
//   1. Copy `+not-found.html` to `200.html` and `404.html`. The `serve` CLI
//      and Netlify both pick these up automatically as SPA fallbacks.
//   2. Drop a `serve.json` config that explicitly routes unknown paths to it.
function writeSpaFallback() {
  const src = path.join(DIST, '+not-found.html');
  if (!fs.existsSync(src)) {
    console.warn('[postprocess-web] +not-found.html missing — skipping SPA fallback');
    return;
  }
  const html = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(path.join(DIST, '404.html'), html);
  fs.writeFileSync(path.join(DIST, '200.html'), html);
  console.log('   wrote SPA fallback → 200.html / 404.html');
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error(`[postprocess-web] dist/ missing — run \`expo export\` first.`);
    process.exit(1);
  }
  console.log('[postprocess-web] injecting meta into', DIST);
  walk(DIST);
  patchImportMeta();
  writeManifest();
  writeSpaFallback();
  console.log('[postprocess-web] done.');
}

main();
