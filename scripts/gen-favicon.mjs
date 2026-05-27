/**
 * Favicon + PWA icons for Cairn. Renders the brand mark (3 stacked
 * stones) in white on a rounded terracotta tile at multiple sizes
 * for browser tabs, iOS home-screen, Android, and the PWA manifest.
 *
 * Outputs:
 *   assets/favicon.png           48×48 — browser tab + small UI
 *   assets/icon.png             1024×1024 — Expo iOS / generic
 *   assets/adaptive-icon.png    1024×1024 — Android adaptive fg
 *   assets/icon-192.png          192×192 — PWA manifest
 *   assets/icon-512.png          512×512 — PWA manifest
 *
 * Run: bun scripts/gen-favicon.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;

const ACCENT = '#A24F33';
const STONE = '#FFFFFF';
const RADIUS_PCT = 22; // % of canvas — iOS-style rounded corners

function tile(size, opts = {}) {
  const { rounded = true } = opts;
  const r = rounded ? Math.round((size * RADIUS_PCT) / 100) : 0;
  // Same Cairn mark paths as src/components/CairnMark.tsx (viewBox 24×24).
  // Center inside a 24-unit space, scale to fill nicely.
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${ACCENT}"/>
  <g transform="translate(${size * 0.08}, ${size * 0.08}) scale(${(size * 0.84) / 24})">
    <path d="M3 19 C 3 17, 5 16, 8 16 L 16 16 C 19 16, 21 17, 21 19 C 21 20, 19 20.5, 16 20.5 L 8 20.5 C 5 20.5, 3 20, 3 19 Z"
          fill="${STONE}" stroke="${STONE}" stroke-width="0.6" stroke-linejoin="round"/>
    <path d="M6 13.5 C 6 12, 7.5 11, 10 11 L 15 11 C 17 11, 18 12, 18 13.5 C 18 14.5, 17 15, 15 15 L 10 15 C 7.5 15, 6 14.5, 6 13.5 Z"
          fill="${STONE}" stroke="${STONE}" stroke-width="0.6" stroke-linejoin="round"/>
    <path d="M9 9.5 C 9 8, 10 7, 12 7 C 14 7, 15 8, 15 9.5 C 15 10.5, 14 11, 12 11 C 10 11, 9 10.5, 9 9.5 Z"
          fill="${STONE}" stroke="${STONE}" stroke-width="0.6" stroke-linejoin="round"/>
  </g>
</svg>
`.trim();
}

function render(svg, w, out) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: w } });
  writeFileSync(out, r.render().asPng());
  console.log(`✓ ${out.replace(root, '')}`);
}

render(tile(48), 48, `${root}assets/favicon.png`);
render(tile(1024), 1024, `${root}assets/icon.png`);
render(tile(1024, { rounded: false }), 1024, `${root}assets/adaptive-icon.png`);
render(tile(192), 192, `${root}assets/icon-192.png`);
render(tile(512), 512, `${root}assets/icon-512.png`);
// Splash uses the rounded tile too — same visual as the icon.
render(tile(1024), 1024, `${root}assets/splash-icon.png`);

console.log('\nDone. Browser favicons, iOS home-screen, Android adaptive, PWA manifest all updated.');
