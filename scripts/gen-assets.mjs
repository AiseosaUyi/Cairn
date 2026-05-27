/**
 * Brand asset pipeline. Renders the SVG mark + art-directed store frames to
 * the PNGs Expo/stores need. Run: bun scripts/gen-assets.mjs
 *
 * Store frames here are bold, on-brand placeholders (the mark + composition,
 * not fake device screenshots). Final store screenshots come from the running
 * app — capture those once it renders on a device.
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const brand = `${root}assets/brand`;
mkdirSync(`${brand}/store`, { recursive: true });
// Ensure the web-served directory exists. PWA manifest icon URLs
// (manifest.webmanifest) point at /assets/*.png which Vercel serves
// from public/assets/. Without these files the manifest fails Chrome's
// installability check and beforeinstallprompt never fires.
mkdirSync(`${root}public/assets`, { recursive: true });

const render = (svg, w, out) => {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: w }, background: 'rgba(0,0,0,0)' });
  writeFileSync(out, r.render().asPng());
  console.log('→', out.replace(root, ''));
};

/** Render to both the native Expo asset path and the web public/ path
 *  so PWA install criteria are met. */
const renderBoth = (svg, w, name) => {
  render(svg, w, `${root}assets/${name}`);
  render(svg, w, `${root}public/assets/${name}`);
};

const logo = readFileSync(`${brand}/logo.svg`, 'utf8');

// App icon + adaptive foreground + splash + favicon, all from one mark.
renderBoth(logo, 1024, 'icon.png');
renderBoth(logo, 512, 'icon-512.png');
renderBoth(logo, 192, 'icon-192.png');
renderBoth(logo, 1024, 'adaptive-icon.png');
renderBoth(logo, 1024, 'splash-icon.png');
renderBoth(logo, 96, 'favicon.png');

// --- Art-directed store frames (1242 x 2208) ----------------------------
const seedMark = readFileSync(`${brand}/logo.svg`, 'utf8')
  .replace('<svg width="1024" height="1024" viewBox="0 0 1024 1024"', '<g transform="translate(421,360) scale(0.39)"')
  .replace('</svg>', '</g>');

const frame = (bg1, bg2, accent, kicker, line1, line2, glyph) => `
<svg width="1242" height="2208" viewBox="0 0 1242 2208" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="1242" height="2208" fill="url(#bg)"/>
  <circle cx="1050" cy="240" r="320" fill="${accent}" opacity="0.16"/>
  <circle cx="180" cy="1980" r="260" fill="${accent}" opacity="0.12"/>
  ${seedMark}
  <text x="621" y="940" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="118" font-weight="700" fill="#2A2622">${glyph}</text>
  <text x="621" y="1180" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="40" letter-spacing="6" fill="${accent}">${kicker}</text>
  <text x="621" y="1320" text-anchor="middle" font-family="Georgia, serif"
        font-size="92" font-weight="700" fill="#2A2622">${line1}</text>
  <text x="621" y="1430" text-anchor="middle" font-family="Georgia, serif"
        font-size="92" font-weight="700" fill="#2A2622">${line2}</text>
  <rect x="321" y="1620" width="600" height="150" rx="75" fill="${accent}"/>
  <text x="621" y="1715" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="46" font-weight="700" fill="#FFFFFF">Start your garden</text>
</svg>`;

render(frame('#FBE0C9', '#FBF6EE', '#E8943A', 'TRUESELF · CAREER', 'A companion that', 'remembers you', 'TrueSelf'),
  1242, `${root}assets/brand/store/01-companion.png`);
render(frame('#DDEFE8', '#FBF6EE', '#3FA98A', 'YOUR DAILY RITUAL', 'It reaches out', 'first', '◆'),
  1242, `${root}assets/brand/store/02-ritual.png`);
render(frame('#FBE0C9', '#F3E7D6', '#E8943A', 'YOUR LIFE-GARDEN', 'Momentum you tend,', 'never a streak', '🌱'),
  1242, `${root}assets/brand/store/03-garden.png`);

console.log('done.');
