/**
 * Generate the OG image for Cairn at public/assets/og.png (1200×630).
 *
 * Hand-composed SVG → PNG via resvg-js. Uses system serif (Georgia) +
 * sans-serif fallbacks for fonts since Instrument Serif and Inter
 * aren't bundled as files in the repo (they're loaded at runtime
 * via @expo-google-fonts at app start). Georgia is close enough to
 * Instrument Serif for a social preview card.
 *
 * Run: bun scripts/gen-og.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
mkdirSync(`${root}public/assets`, { recursive: true });

// Brand colors (locked in DESIGN.md)
const CANVAS = '#F8F7F4';
const INK = '#0E0D0B';
const ACCENT = '#A24F33';
const WASH = '#F1E5D6';
const HAIRLINE = '#E8E4DC';
const INK_SOFT = '#5E5A52';

// Cairn brand mark — three stacked stones. Same paths as CairnMark.tsx
// (viewBox 24×24), scaled up via a wrapping <g>.
const cairnMark = (scale = 1, color = INK) => `
  <g transform="scale(${scale})">
    <path d="M3 19 C 3 17, 5 16, 8 16 L 16 16 C 19 16, 21 17, 21 19 C 21 20, 19 20.5, 16 20.5 L 8 20.5 C 5 20.5, 3 20, 3 19 Z" fill="${color}" stroke="${color}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M6 13.5 C 6 12, 7.5 11, 10 11 L 15 11 C 17 11, 18 12, 18 13.5 C 18 14.5, 17 15, 15 15 L 10 15 C 7.5 15, 6 14.5, 6 13.5 Z" fill="${color}" stroke="${color}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M9 9.5 C 9 8, 10 7, 12 7 C 14 7, 15 8, 15 9.5 C 15 10.5, 14 11, 12 11 C 10 11, 9 10.5, 9 9.5 Z" fill="${color}" stroke="${color}" stroke-width="1.4" stroke-linejoin="round"/>
  </g>
`;

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- Canvas -->
  <rect width="1200" height="630" fill="${CANVAS}"/>

  <!-- Soft warm accent blob upper-right -->
  <circle cx="1050" cy="-80" r="380" fill="${WASH}" opacity="0.85"/>
  <circle cx="1180" cy="200" r="180" fill="${WASH}" opacity="0.55"/>

  <!-- Hairline at the bottom for editorial weight -->
  <rect x="80" y="540" width="1040" height="1" fill="${HAIRLINE}"/>

  <!-- Wordmark lockup (top-left) -->
  <g transform="translate(80, 70)">
    <!-- Cairn mark — scaled to ~36px from 24px viewBox -->
    <g transform="scale(1.5)">
      ${cairnMark(1, INK)}
    </g>
    <text x="50" y="32" font-family="Georgia, 'Times New Roman', serif"
          font-size="36" font-weight="400" fill="${INK}" letter-spacing="-0.5">
      Cairn
    </text>
  </g>

  <!-- Headline -->
  <g transform="translate(80, 240)">
    <text font-family="Georgia, 'Times New Roman', serif"
          font-size="76" font-weight="400" fill="${INK}" letter-spacing="-1.4">
      <tspan x="0" dy="0">The career coach</tspan>
      <tspan x="0" dy="92" font-style="italic" fill="${ACCENT}">who actually plans</tspan>
      <tspan x="0" dy="92">with you.</tspan>
    </text>
  </g>

  <!-- Sub -->
  <g transform="translate(80, 562)">
    <text font-family="Helvetica, 'Helvetica Neue', Arial, sans-serif"
          font-size="20" font-weight="400" fill="${INK_SOFT}" letter-spacing="-0.2">
      Eight AI specialists. Real paths with daily tasks. Not a chatbot.
    </text>
  </g>

  <!-- Subtle 'cairn.app' tag in the lower-right -->
  <g transform="translate(1120, 562)">
    <text text-anchor="end" font-family="Helvetica, 'Helvetica Neue', Arial, sans-serif"
          font-size="18" font-weight="500" fill="${ACCENT}" letter-spacing="0.5">
      cairn.app
    </text>
  </g>
</svg>
`.trim();

const r = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  background: CANVAS,
});
const png = r.render().asPng();
writeFileSync(`${root}public/assets/og.png`, png);
console.log(`✓ wrote public/assets/og.png (${(png.length / 1024).toFixed(1)} KB)`);
