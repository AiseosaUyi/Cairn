/**
 * Generate the 8 character portraits using Pollinations.ai — a free
 * image-generation API (no key required, no per-image cost). Saves
 * PNGs to public/assets/characters/<id>.png.
 *
 * Pollinations wraps several open models (Flux Schnell by default).
 * Quality is variable — won't reach DALL-E 3 / Imagen 3 fidelity but
 * gives believable cartoon portraits at $0. If quality disappoints,
 * we can revert to dicebear placeholders in src/companion/characters.ts.
 *
 * Run: bun scripts/gen-portraits.mjs
 *
 * The script imports the same CHARACTERS array + buildImagePrompt
 * function the app uses, so portrait prompts stay in sync with
 * the CHARACTER_STYLE_GUIDE.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { CHARACTERS, buildImagePrompt } from '../src/companion/characters.ts';

const root = new URL('..', import.meta.url).pathname;
const outDir = `${root}public/assets/characters`;
mkdirSync(outDir, { recursive: true });

const POLL_BASE = 'https://image.pollinations.ai/prompt';
const SIZE = 768;
const FORCE = process.argv.includes('--force');

// Deterministic seed per character so re-runs produce the same image.
function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function generate(c) {
  const out = `${outDir}/${c.id}.png`;
  if (!FORCE && existsSync(out)) {
    console.log(`· ${c.id.padEnd(8)} exists, skip (use --force to regen)`);
    return;
  }
  const prompt = buildImagePrompt(c);
  // Pollinations passes the prompt in the URL path; URL-encode and
  // cap length to avoid hitting URL-length limits at proxies.
  const encoded = encodeURIComponent(prompt.slice(0, 900));
  const seed = hashSeed(c.seed);
  const url =
    `${POLL_BASE}/${encoded}` +
    `?width=${SIZE}&height=${SIZE}` +
    `&model=flux&nologo=true&private=true&enhance=true&seed=${seed}`;

  process.stdout.write(`→ ${c.id.padEnd(8)} ${c.name} (${c.role})… `);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      // Pollinations can take 15–60s for Flux generations.
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      console.log(`✗ HTTP ${res.status}`);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 4_000) {
      console.log(`✗ tiny response (${buf.length} bytes) — probably an error image`);
      return;
    }
    writeFileSync(out, buf);
    const sec = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`✓ ${(buf.length / 1024).toFixed(1)} KB in ${sec}s`);
  } catch (e) {
    console.log(`✗ ${e.message}`);
  }
}

console.log(`Generating ${CHARACTERS.length} portraits → ${outDir.replace(root, '')}`);
console.log('Pollinations.ai (Flux Schnell, free, no key)\n');

// Sequential — Pollinations rate-limits parallel requests aggressively.
for (const c of CHARACTERS) {
  await generate(c);
}

console.log('\nDone. Inspect the PNGs and decide:');
console.log('  - If quality holds → update src/companion/characters.ts:avatarUrl()');
console.log('    to return /assets/characters/${c.id}.png');
console.log('  - If poor → keep the dicebear fallback, delete the bad PNGs');
