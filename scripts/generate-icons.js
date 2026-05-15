#!/usr/bin/env node
// Rasterize brand SVGs to PNGs at the sizes Expo / Play Store / web expect.
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..', 'assets');
const brand = path.join(root, 'brand');

const tasks = [
  // App icon (iOS-style square, used by Expo as the canonical icon)
  { src: 'icon.svg',                 out: 'icon.png',           w: 1024, h: 1024, bg: { r: 246, g: 247, b: 249, alpha: 1 } },
  // Android adaptive icon foreground — transparent bg, safe zone centered
  { src: 'adaptive-foreground.svg',  out: 'adaptive-icon.png',  w: 1080, h: 1080, bg: null },
  // Splash image — light bg, centered glyph
  { src: 'splash.svg',               out: 'splash-icon.png',    w: 2048, h: 2048, bg: { r: 246, g: 247, b: 249, alpha: 1 } },
  // Web favicon
  { src: 'icon.svg',                 out: 'favicon.png',        w: 64,   h: 64,   bg: { r: 246, g: 247, b: 249, alpha: 1 } },
];

async function main() {
  for (const t of tasks) {
    const srcPath = path.join(brand, t.src);
    const outPath = path.join(root, t.out);
    if (!fs.existsSync(srcPath)) {
      console.error('missing source:', srcPath);
      process.exit(1);
    }
    let pipe = sharp(srcPath, { density: 384 }).resize(t.w, t.h);
    if (t.bg) pipe = pipe.flatten({ background: t.bg });
    await pipe.png({ compressionLevel: 9 }).toFile(outPath);
    const size = fs.statSync(outPath).size;
    console.log(`  wrote ${t.out.padEnd(20)} ${t.w}×${t.h}  ${(size / 1024).toFixed(1)} KB`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
