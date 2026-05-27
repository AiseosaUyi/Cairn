/**
 * Portfolio rendering — two-tier strategy.
 *
 *   Tier 1: fetchAndStrip(url)
 *     Plain HTTP fetch, parse out body text. Cheap (~200ms), works for
 *     ~40% of portfolios (server-rendered Next.js, Notion, GitHub Pages,
 *     blogs). If we get back >200 chars of body text, ship the review
 *     from that — no need to burn Sandbox time.
 *
 *   Tier 2: renderPortfolioInSandbox(url)
 *     Spin a Vercel Sandbox (ephemeral Firecracker microVM), install
 *     Playwright + Chromium, render the URL with JS, extract text +
 *     full-page screenshot. Upload screenshot to Vercel Blob (public,
 *     time-limited) so the multimodal model can see it via image_url.
 *
 * The caller in api/coach.ts picks the tier: Tier 2 only fires when
 * Tier 1 came up short (the empty-shell JS-rendered case).
 *
 * Honest about its limits — LinkedIn / behind-auth sites still fail
 * here. The caller surfaces those caveats in the review's transparency
 * band rather than papering over them.
 */

export type StripResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export async function fetchAndStrip(rawUrl: string): Promise<StripResult> {
  try {
    const res = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CairnReviewer/1.0; +https://cairn.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, reason: `the site returned HTTP ${res.status}` };
    }
    const contentType = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      return {
        ok: false,
        reason: `the URL returned ${contentType || 'a non-HTML response'} — I review HTML pages, not raw assets.`,
      };
    }
    const html = await res.text();
    return { ok: true, text: stripHtml(html) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `the fetch failed (${msg})` };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Sandbox-rendered fetch — for JS-heavy portfolios (Framer, Webflow,
// client-rendered Next.js, etc).
//
// Strategy:
//   1. Create a Sandbox VM (node24 runtime).
//   2. Install Playwright Chromium in it.
//   3. Run a render script: navigate, wait for network idle, screenshot,
//      dump page text.
//   4. Read the screenshot file off the sandbox's fs, upload to Vercel
//      Blob (public URL the vision model can fetch).
//   5. Stop the sandbox (or let it auto-snapshot for reuse on the next
//      review of the same URL).
//
// Failure modes (all surface to the caller as { ok: false, reason }):
//   - Sandbox creation fails (region / quota / OIDC)
//   - Playwright install fails (network egress blocked)
//   - Page navigation times out
//   - Screenshot upload to Blob fails
// ---------------------------------------------------------------------------

export type RenderResult =
  | { ok: true; text: string; screenshotUrl: string }
  | { ok: false; reason: string };

export async function renderPortfolioInSandbox(url: string): Promise<RenderResult> {
  // Guard: Sandbox needs OIDC. Without it, this function can't run.
  if (!process.env.VERCEL_OIDC_TOKEN && !process.env.VERCEL_TOKEN) {
    return {
      ok: false,
      reason:
        'Sandbox not configured — needs VERCEL_OIDC_TOKEN (auto on Vercel) or VERCEL_TOKEN. ' +
        'Falling back to plain fetch results.',
    };
  }

  try {
    const { Sandbox } = await import('@vercel/sandbox');
    const sandbox = await Sandbox.create({
      runtime: 'node24',
      timeout: 4 * 60 * 1000, // 4 minutes — generous; render usually <30s
      // Persistent by default so the second review of the same URL can
      // reuse the already-installed Chromium. Tagged so we can identify
      // it in the dashboard.
      tags: { app: 'cairn', purpose: 'portfolio-render' },
    });

    try {
      // 1. Install Playwright + browsers. Cached after first run thanks
      //    to persistent snapshots.
      const install = await sandbox.runCommand('bash', [
        '-c',
        'npm i --silent playwright @playwright/test && npx playwright install --with-deps chromium 2>&1 | tail -5',
      ]);
      if (install.exitCode !== 0) {
        const stderr = await install.stderr();
        return { ok: false, reason: `playwright install failed: ${stderr.slice(0, 300)}` };
      }

      // 2. Write the render script into the sandbox.
      const script = `
        const { chromium } = require('playwright');
        (async () => {
          const url = process.argv[2];
          const browser = await chromium.launch({ headless: true });
          try {
            const ctx = await browser.newContext({
              viewport: { width: 1440, height: 900 },
              userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            });
            const page = await ctx.newPage();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            // Give animation-heavy hero sections a beat to settle.
            await page.waitForTimeout(800);
            const text = await page.evaluate(() => document.body.innerText || '');
            await page.screenshot({ path: '/tmp/shot.png', fullPage: true, type: 'png' });
            // Newline-delimited JSON: first line text, second line "done".
            // Keeps text out of stderr.
            process.stdout.write(JSON.stringify({ text }) + '\\n');
          } finally {
            await browser.close();
          }
        })().catch((e) => {
          console.error(e.message || String(e));
          process.exit(1);
        });
      `;
      await sandbox.fs.writeFile('/vercel/sandbox/render.js', script);

      // 3. Run it.
      const render = await sandbox.runCommand('node', ['render.js', url]);
      if (render.exitCode !== 0) {
        const stderr = await render.stderr();
        return { ok: false, reason: `render failed: ${stderr.slice(0, 300)}` };
      }
      const stdout = await render.stdout();
      const parsed = JSON.parse(stdout.trim()) as { text: string };

      // 4. Read screenshot, upload to Blob.
      const png = (await sandbox.fs.readFile('/tmp/shot.png')) as Buffer | Uint8Array;
      const { put } = await import('@vercel/blob');
      // Path includes a hash of the URL so the same URL overwrites — good
      // for the runtime cache key alignment.
      const { createHash } = await import('node:crypto');
      const hash = createHash('sha256').update(url).digest('hex').slice(0, 16);
      const blob = await put(`portfolio-shots/${hash}.png`, png as Buffer, {
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false,
        // Re-renders of the same URL overwrite the previous screenshot
        // (deterministic hash path) — without allowOverwrite, put()
        // throws on path collision.
        allowOverwrite: true,
        // Cache for a week — matches portfolio review cache TTL.
        cacheControlMaxAge: 60 * 60 * 24 * 7,
      });

      return { ok: true, text: parsed.text || '', screenshotUrl: blob.url };
    } finally {
      // Don't hold the sandbox open between requests — Vercel's
      // persistent snapshot picks up the install state for the next one.
      await sandbox.stop().catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `sandbox render errored: ${msg}` };
  }
}
