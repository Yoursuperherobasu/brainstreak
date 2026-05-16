#!/usr/bin/env node
//
// Generate Google Play Store marketing assets:
//   1) Feature graphic (1024x500) — the banner at the top of the listing
//   2) Six framed phone screenshots (1242x2208) with headlines + subheads
//
// Uses Sharp (libvips) for image composition and inline SVG for all text +
// shapes — no external fonts/raster assets needed beyond the raw screenshots.
//
// Sunwashed Arcade palette:
//   cream paper #FAF4E8   ink #1B1726    muted ink #5A4F6B
//   violet     #7A3FF2   violet dark #4A1FB0
//   tangerine  #FF7A2D   honey gold #F2B233   hot pink #EC4899
//
// Run:   node scripts/make-play-assets.js
// Output: assets/play-store/*.png

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'play-store');
const SHOTS = path.join(ROOT, 'qa-out', 'v2-evidence');

fs.mkdirSync(OUT, { recursive: true });

// ── Palette
const C = {
  cream: '#FAF4E8',
  creamWarm: '#F2E9D6',
  ink: '#1B1726',
  inkMuted: '#5A4F6B',
  violet: '#7A3FF2',
  violetDark: '#4A1FB0',
  violetLight: '#B596FF',
  tangerine: '#FF7A2D',
  gold: '#F2B233',
  goldLight: '#FFD98A',
  pink: '#EC4899',
  white: '#FFFFFF',
};

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─────────────────────────────────────────────────────────────────────────
// 1) FEATURE GRAPHIC — 1024 x 500
//    Layout: lightning bolt motif on the left, headline + subline center,
//    BrainStreak wordmark + "60 seconds. go." chip on the right.
// ─────────────────────────────────────────────────────────────────────────

function featureGraphicSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.cream}"/>
      <stop offset="100%" stop-color="${C.creamWarm}"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.gold}"/>
      <stop offset="100%" stop-color="${C.tangerine}"/>
    </linearGradient>
    <radialGradient id="orbV" cx="0.2" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="${C.violet}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${C.violet}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orbP" cx="0.85" cy="0.85" r="0.5">
      <stop offset="0%" stop-color="${C.pink}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${C.pink}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- background -->
  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" fill="url(#orbV)"/>
  <rect width="1024" height="500" fill="url(#orbP)"/>

  <!-- big lightning bolt on the left, behind the wordmark -->
  <g transform="translate(110 64)" filter="url(#glow)">
    <path d="M 90 0 L 32 200 L 84 200 L 50 372 L 156 144 L 100 144 L 142 0 Z"
          fill="url(#bolt)" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>
  </g>

  <!-- secondary smaller bolts (decorative) -->
  <g transform="translate(880 60) scale(0.5)" opacity="0.55">
    <path d="M 90 0 L 32 200 L 84 200 L 50 372 L 156 144 L 100 144 L 142 0 Z"
          fill="${C.gold}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>
  </g>
  <g transform="translate(820 360) scale(0.32) rotate(-20)" opacity="0.5">
    <path d="M 90 0 L 32 200 L 84 200 L 50 372 L 156 144 L 100 144 L 142 0 Z"
          fill="${C.tangerine}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>
  </g>

  <!-- BrainStreak wordmark, top -->
  <text x="320" y="120" font-family="Helvetica, Arial, sans-serif" font-weight="900"
        font-size="46" fill="${C.violet}" letter-spacing="-2">BrainStreak</text>

  <!-- headline -->
  <text x="320" y="240" font-family="Helvetica, Arial, sans-serif" font-weight="900"
        font-size="108" fill="${C.ink}" letter-spacing="-4">Beat brain</text>
  <text x="320" y="350" font-family="Helvetica, Arial, sans-serif" font-weight="900"
        font-size="108" fill="${C.violet}" letter-spacing="-4">rot<tspan fill="${C.ink}">.</tspan></text>

  <!-- subline -->
  <text x="320" y="402" font-family="Helvetica, Arial, sans-serif" font-weight="500"
        font-size="24" fill="${C.inkMuted}" letter-spacing="-0.5">Daily quiz + 8 arcade games. Offline. No ads.</text>

  <!-- CTA chip, bottom-right area -->
  <g transform="translate(320 432)">
    <rect width="190" height="42" rx="21" fill="${C.violet}"/>
    <text x="95" y="28" font-family="Helvetica, Arial, sans-serif" font-weight="800"
          font-size="18" fill="${C.white}" text-anchor="middle" letter-spacing="0.6">60 SECONDS. GO.</text>
  </g>
</svg>`;
}

async function makeFeatureGraphic() {
  const svg = featureGraphicSvg();
  const out = path.join(OUT, 'feature-graphic.png');
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log('  ✓ feature-graphic.png  (1024×500)');
}

// ─────────────────────────────────────────────────────────────────────────
// 2) PHONE SCREENSHOTS — 1242 x 2208 (16:9-ish portrait Play Store accepts)
//    Layout: headline at top, subhead below, framed phone screenshot below.
// ─────────────────────────────────────────────────────────────────────────

const SHOTS_OUT = [
  { src: '01-home-theme.png',         headline: 'Your daily 5.',           sub: 'One quiz, eight warmups, zero doomscroll.' },
  { src: '13-brain-rush-q1.png',      headline: '15 seconds. Think fast.', sub: 'Math, science, history, pop. Speed earns bonus.' },
  { src: '02-stats-full.png',         headline: 'Stats, not guilt.',       sub: 'Watch the streak grow. Watch yourself get sharper.' },
  { src: '04-road-rush-idle.png',     headline: 'Dodge or eat curb.',      sub: 'Reflex training disguised as a cartoon car.' },
  { src: '11-memory-match.png',       headline: "Simon says don't blink.", sub: 'Watch the pattern. Repeat it. Flex.' },
  { src: '05-odd-one-out.png',        headline: 'Spot the imposter.',      sub: 'Your eyes will lie. Train them not to.' },
];

// Final canvas: 1242 x 2208 (≈ 9:16, accepted by Play; min long side 1080)
const W = 1242;
const H = 2208;
// Headline area: top 480px
const HEADLINE_Y = 200;
const SUBHEAD_Y  = 320;
// Phone screenshot frame: 920px wide, vertically centered in the bottom 1600px
const PHONE_W = 920;
const PHONE_X = (W - PHONE_W) / 2;     // = 161
const PHONE_Y = 480;
// Source images are 1170×1992 (≈ 0.587 aspect). Scaled to 920 wide:
const PHONE_H = Math.round(PHONE_W * (1992 / 1170));  // = 1567

function frameSvg(headline, sub, index) {
  const tintRotation = (index * 37) % 360;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgFrame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.cream}"/>
      <stop offset="100%" stop-color="${C.creamWarm}"/>
    </linearGradient>
    <radialGradient id="orb1" cx="0.15" cy="0.18" r="0.55">
      <stop offset="0%" stop-color="${C.violet}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${C.violet}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb2" cx="0.92" cy="0.12" r="0.42">
      <stop offset="0%" stop-color="${C.tangerine}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${C.tangerine}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb3" cx="0.85" cy="0.95" r="0.45">
      <stop offset="0%" stop-color="${C.pink}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${C.pink}" stop-opacity="0"/>
    </radialGradient>
    <filter id="phoneShadow" x="-10%" y="-5%" width="120%" height="115%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="22"/>
      <feOffset dx="0" dy="18"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.28"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="url(#bgFrame)"/>
  <rect width="${W}" height="${H}" fill="url(#orb1)"/>
  <rect width="${W}" height="${H}" fill="url(#orb2)"/>
  <rect width="${W}" height="${H}" fill="url(#orb3)"/>

  <!-- decorative small lightning top-left -->
  <g transform="translate(${50 + ((index*23)%40)} ${60 + ((index*17)%30)}) scale(0.34) rotate(${tintRotation})" opacity="0.55">
    <path d="M 90 0 L 32 200 L 84 200 L 50 372 L 156 144 L 100 144 L 142 0 Z"
          fill="${C.gold}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>
  </g>

  <!-- BrainStreak wordmark, small, top-right -->
  <text x="${W-50}" y="100" font-family="Helvetica, Arial, sans-serif" font-weight="800"
        font-size="34" fill="${C.violet}" text-anchor="end" letter-spacing="-1">BrainStreak</text>

  <!-- headline -->
  <text x="${W/2}" y="${HEADLINE_Y}" font-family="Helvetica, Arial, sans-serif" font-weight="900"
        font-size="78" fill="${C.ink}" text-anchor="middle" letter-spacing="-2.5">${xml(headline)}</text>

  <!-- subhead -->
  <text x="${W/2}" y="${SUBHEAD_Y}" font-family="Helvetica, Arial, sans-serif" font-weight="500"
        font-size="32" fill="${C.inkMuted}" text-anchor="middle" letter-spacing="-0.3">${xml(sub)}</text>

  <!-- phone screenshot placeholder (we composite over this) -->
  <rect x="${PHONE_X}" y="${PHONE_Y}" width="${PHONE_W}" height="${PHONE_H}"
        rx="48" ry="48" fill="${C.white}" filter="url(#phoneShadow)"/>

  <!-- footer chip -->
  <g transform="translate(${W/2 - 220} ${H - 130})">
    <rect width="440" height="64" rx="32" fill="${C.violet}"/>
    <text x="220" y="42" font-family="Helvetica, Arial, sans-serif" font-weight="800"
          font-size="24" fill="${C.white}" text-anchor="middle" letter-spacing="0.6">FREE  ·  NO ADS  ·  OFFLINE</text>
  </g>
</svg>`;
}

async function makeFramedShot({ src, headline, sub }, index) {
  const srcPath = path.join(SHOTS, src);
  if (!fs.existsSync(srcPath)) throw new Error('missing screenshot: ' + srcPath);

  // 1) Render the SVG frame at full Play-Store size.
  const frameBuf = await sharp(Buffer.from(frameSvg(headline, sub, index)))
    .png()
    .toBuffer();

  // 2) Take the raw screenshot and resize to fit the phone slot, with rounded
  //    corners that match the white frame underneath.
  const phoneBuf = await sharp(srcPath)
    .resize(PHONE_W, PHONE_H, { fit: 'cover', position: 'top' })
    .composite([{
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${PHONE_W}" height="${PHONE_H}">
           <rect x="0" y="0" width="${PHONE_W}" height="${PHONE_H}" rx="44" ry="44" fill="#fff"/>
         </svg>`),
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();

  // 3) Composite the rounded screenshot onto the frame at the slot position.
  const outName = String(index + 1).padStart(2, '0') + '-' + path.basename(src, '.png').replace(/^[\d-]+/, '') + '-framed.png';
  const out = path.join(OUT, outName);
  await sharp(frameBuf)
    .composite([{ input: phoneBuf, top: PHONE_Y, left: PHONE_X }])
    .png()
    .toFile(out);
  console.log('  ✓ ' + outName + '  (' + W + '×' + H + ')');
}

// ─────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Generating Play Store assets → ' + OUT);
  await makeFeatureGraphic();
  for (let i = 0; i < SHOTS_OUT.length; i++) {
    await makeFramedShot(SHOTS_OUT[i], i);
  }
  console.log('Done.');
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
