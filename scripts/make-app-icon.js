#!/usr/bin/env node
//
// Generate the new BrainStreak app icons:
//   assets/icon.png           — 1024x1024, full-bleed tangerine + cream bolt (legacy / iOS / web)
//   assets/adaptive-icon.png  — 1024x1024, transparent bg, bolt centered in safe zone (Android adaptive foreground)
//   assets/splash-icon.png    — 1024x1024, transparent bg, violet bolt + tangerine spark (works on cream splash)
//   assets/favicon.png        — 256x256, scaled icon
//
// Design: tangerine #FF7A2D launcher tile + cream #FAF4E8 lightning bolt
// with violet #7A3FF2 offset shadow (risograph misregistration effect) +
// honey gold #F2B233 spark dot at the bottom tip. Zero text, zero gradients
// inside the bolt — flat shapes that survive at 48px.
//
// Decided by marketing + CEO + brand-guardian agents.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');

// ── Palette
const C = {
  tangerine: '#FF7A2D',
  cream:     '#FAF4E8',
  violet:    '#7A3FF2',
  gold:      '#F2B233',
  ink:       '#1B1726',
};

// ── Bolt geometry, scaled & translated into the 1024 grid.
//   Source polygon (proven from the feature graphic):
//     M 90 0 L 32 200 L 84 200 L 50 372 L 156 144 L 100 144 L 142 0 Z
//   bbox: 32..156 wide (124), 0..372 tall (372). We scale by 1.92 to make
//   the bolt fill ~70% of the 1024 canvas height, then translate so it
//   sits optically centered.
function boltPath(scale, dx, dy) {
  const pts = [
    [90, 0], [32, 200], [84, 200], [50, 372],
    [156, 144], [100, 144], [142, 0],
  ];
  const xy = pts.map(([x, y]) => `${(x * scale + dx).toFixed(1)} ${(y * scale + dy).toFixed(1)}`);
  return `M ${xy[0]} L ${xy[1]} L ${xy[2]} L ${xy[3]} L ${xy[4]} L ${xy[5]} L ${xy[6]} Z`;
}

// Helper: compute (dx, dy) so the bolt's bbox is geometrically centered on
// the 1024 canvas at a given scale. Original bolt bbox: x[32..156], y[0..372].
// We then apply OPTICAL adjustments:
//   - shift left by half SHADOW_DX so the bolt+shadow group balances
//   - shift up because the bolt's visual mass is top-heavy (the bottom
//     tapers to a single point)
function center(scale) {
  const bw = (156 - 32) * scale;
  const bh = (372 -   0) * scale;
  const dx = (1024 - bw) / 2 - 32 * scale - 14;   // -14 for shadow + bolt asymmetry
  const dy = (1024 - bh) / 2 - 0  * scale - 36;   // -36 for top-heavy compensation
  return { dx, dy };
}

// Full-canvas bolt — ~70% canvas height.
const F = center(1.92);
const BOLT_FULL  = boltPath(1.92, F.dx, F.dy);
const SPARK_FULL = { cx: 50 * 1.92 + F.dx, cy: 372 * 1.92 + F.dy };

// Adaptive-icon bolt — must live inside the inner ~66% safe zone.
const I = center(1.52);
const BOLT_INNER  = boltPath(1.52, I.dx, I.dy);
const SPARK_INNER = { cx: 50 * 1.52 + I.dx, cy: 372 * 1.52 + I.dy };

const SHADOW_DX = 22;
const SHADOW_DY = 18;

function iconFullBleedSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- tangerine background (full-bleed — Android masks corners) -->
  <rect width="1024" height="1024" fill="${C.tangerine}"/>

  <!-- violet offset shadow (risograph misregistration) -->
  <path d="${BOLT_FULL}" fill="${C.violet}" transform="translate(${SHADOW_DX} ${SHADOW_DY})"/>

  <!-- cream bolt on top -->
  <path d="${BOLT_FULL}" fill="${C.cream}"/>

  <!-- honey gold spark at the bolt tip -->
  <circle cx="${SPARK_FULL.cx}" cy="${SPARK_FULL.cy + 30}" r="38" fill="${C.gold}"/>
  <circle cx="${SPARK_FULL.cx}" cy="${SPARK_FULL.cy + 30}" r="20" fill="${C.cream}"/>
</svg>`;
}

function adaptiveForegroundSvg() {
  // Same composition but content lives inside the inner safe zone so Android's
  // circle/squircle/teardrop masks never clip the bolt. Background is
  // transparent — Android draws the configured adaptiveIcon.backgroundColor
  // (tangerine) behind it.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- violet offset shadow -->
  <path d="${BOLT_INNER}" fill="${C.violet}" transform="translate(${SHADOW_DX-4} ${SHADOW_DY-2})"/>

  <!-- cream bolt -->
  <path d="${BOLT_INNER}" fill="${C.cream}"/>

  <!-- gold spark -->
  <circle cx="${SPARK_INNER.cx}" cy="${SPARK_INNER.cy + 24}" r="30" fill="${C.gold}"/>
  <circle cx="${SPARK_INNER.cx}" cy="${SPARK_INNER.cy + 24}" r="15" fill="${C.cream}"/>
</svg>`;
}

function splashIconSvg() {
  // Splash screen uses cream #FAF4E8 background. So we flip the colors:
  // VIOLET bolt with TANGERINE offset shadow + GOLD spark. Keeps brand
  // consistency but actually visible against cream.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- tangerine offset shadow -->
  <path d="${BOLT_INNER}" fill="${C.tangerine}" transform="translate(${SHADOW_DX-4} ${SHADOW_DY-2})"/>

  <!-- violet bolt on top -->
  <path d="${BOLT_INNER}" fill="${C.violet}"/>

  <!-- gold spark -->
  <circle cx="${SPARK_INNER.cx}" cy="${SPARK_INNER.cy + 24}" r="30" fill="${C.gold}"/>
  <circle cx="${SPARK_INNER.cx}" cy="${SPARK_INNER.cy + 24}" r="15" fill="${C.cream}"/>
</svg>`;
}

(async () => {
  console.log('Generating new app icons → ' + OUT);

  await sharp(Buffer.from(iconFullBleedSvg())).png().toFile(path.join(OUT, 'icon.png'));
  console.log('  ✓ icon.png            (1024×1024, full-bleed tangerine)');

  await sharp(Buffer.from(adaptiveForegroundSvg())).png().toFile(path.join(OUT, 'adaptive-icon.png'));
  console.log('  ✓ adaptive-icon.png   (1024×1024, transparent bg)');

  await sharp(Buffer.from(splashIconSvg())).png().toFile(path.join(OUT, 'splash-icon.png'));
  console.log('  ✓ splash-icon.png     (1024×1024, violet bolt for cream splash)');

  // Favicon: scale icon.png down to 256
  await sharp(Buffer.from(iconFullBleedSvg())).resize(256, 256).png().toFile(path.join(OUT, 'favicon.png'));
  console.log('  ✓ favicon.png         (256×256, scaled)');

  console.log('Done.');
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
