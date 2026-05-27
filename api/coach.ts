/**
 * /api/coach — the workspace backend.
 *
 * Multiplexed endpoint: one warm function handling all coaching modes
 * (template / review / score / examples / review-portfolio /
 * review-portfolio-async). Beats five cold endpoints.
 *
 * Stack:
 *   - AI Gateway (with direct-OpenAI fallback) via api/_lib/gateway.ts
 *   - Runtime Cache for repeat queries via api/_lib/cache.ts
 *   - BotID guard on every call (skipped if BOTID_REQUIRED env unset, so
 *     local dev / mock provider still works)
 *   - Sandbox-powered portfolio rendering via api/_lib/portfolio.ts
 *   - Queue-based async reviews via the review-portfolio-async mode
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chatJson, type ImagePart, type TextPart } from './_lib/gateway';
import { cacheKey, memoize, writeCache } from './_lib/cache';
import { fetchAndStrip, renderPortfolioInSandbox } from './_lib/portfolio';
import { checkBot } from './_lib/botid';

type Mode =
  | 'template'
  | 'review'
  | 'score'
  | 'examples'
  | 'review-portfolio'
  | 'review-portfolio-async';

interface CoachBody {
  mode?: Mode;
  taskTitle?: string;
  taskKind?: string;
  taskWhy?: string;
  userContext?: string;
  draft?: string;
  url?: string;
  rubric?: string;
  /** When true, ignore any cached result. The workspace's "Refresh"
   *  buttons send this. */
  refresh?: boolean;
  /** Set internally when the queue worker recalls this handler. The user
   *  doesn't send this. */
  _fromQueue?: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }
    const body = parseBody(req.body);
    if (!body) {
      res.status(400).json({ ok: false, error: 'Invalid JSON body' });
      return;
    }
    if (!body.mode) {
      res.status(400).json({ ok: false, error: 'mode is required' });
      return;
    }

    // BotID: protect everything except the internal-only queue callback.
    if (!body._fromQueue) {
      const bot = await checkBot();
      if (bot.isBot) {
        res.status(403).json({ ok: false, error: 'bot detected' });
        return;
      }
    }

    // Default model: `gpt-5.4` via AI Gateway. Override per-deploy with
    // `LLM_MODEL` (e.g. `anthropic/claude-sonnet-4-7`, `openai/gpt-5.4`,
    // `xai/grok-4.3`). Gateway lets you swap providers without code change.
    const model = process.env.LLM_MODEL || 'openai/gpt-5.4';
    const skipCache = !!body.refresh;
    let result: unknown;

    switch (body.mode) {
      case 'template':
        result = await memoize(
          cacheKey(['template', model, body.taskTitle, body.taskKind, body.taskWhy, body.userContext]),
          () => runTemplate(body, model),
          { skipCache, tags: ['template'] },
        );
        break;
      case 'examples':
        result = await memoize(
          cacheKey(['examples', model, body.taskTitle, body.taskKind, body.userContext]),
          () => runExamples(body, model),
          { skipCache, tags: ['examples'], ttl: 60 * 60 * 12 },
        );
        break;
      case 'review':
        result = await memoize(
          cacheKey(['review', model, body.taskTitle, body.taskKind, body.userContext, body.draft]),
          () => runReview(body, model),
          { skipCache, tags: ['review'] },
        );
        break;
      case 'score':
        result = await memoize(
          cacheKey(['score', model, body.taskTitle, body.taskKind, body.userContext, body.draft, body.rubric]),
          () => runScore(body, model),
          { skipCache, tags: ['score'] },
        );
        break;
      case 'review-portfolio':
        result = await memoize(
          cacheKey(['portfolio', model, body.url, body.userContext]),
          () => runPortfolioReview(body, model),
          { skipCache, tags: ['portfolio', body.url ?? 'unknown'], ttl: 60 * 60 * 24 * 7 },
        );
        break;
      case 'review-portfolio-async': {
        // Enqueue + return immediately with the cache key. The worker
        // populates the cache; the client polls /api/coach?mode=portfolio-poll
        // or simply re-calls review-portfolio (which now hits the cache).
        const key = cacheKey(['portfolio', model, body.url, body.userContext]);
        const { send } = await import('@vercel/queue');
        await send('coach-portfolio-review', {
          cacheKey: key,
          payload: body,
          model,
        });
        result = { queued: true, cacheKey: key };
        break;
      }
      default:
        res.status(400).json({ ok: false, error: `unknown mode: ${body.mode}` });
        return;
    }

    res.status(200).json({ ok: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error(`[api/coach] unhandled: ${msg}`);
    res.status(500).json({ ok: false, error: msg });
  }
}

function parseBody(raw: unknown): CoachBody | null {
  if (raw && typeof raw === 'object') return raw as CoachBody;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CoachBody;
    } catch {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

async function runTemplate(body: CoachBody, model: string) {
  const sys = [
    'You are a senior career coach. The user has a task to do. Produce a STARTER TEMPLATE they can fill in — not a finished answer.',
    'Pre-fill the template with their context where you can. Where you need their input, write "[your answer here]" placeholders.',
    'Be specific. No generic checklists. Match the form to the task.',
    'Return JSON: { title: string, body: string (markdown), instructions: string }.',
  ].join('\n');
  const user = [
    `Task: ${body.taskTitle ?? '(no title)'}`,
    body.taskKind ? `Kind: ${body.taskKind}` : '',
    body.taskWhy ? `Why it matters: ${body.taskWhy}` : '',
    body.userContext ? `\nAbout the user:\n${body.userContext}` : '',
    '\nReturn JSON only.',
  ].filter(Boolean).join('\n');
  return chatJson(model, sys, user);
}

/**
 * Examples — uses the AI SDK + Perplexity Search (via AI Gateway) when
 * available so we get real recent examples with URLs, not training-data
 * memory. Falls back to a plain chatJson call if the gateway/SDK aren't
 * configured (e.g. direct OpenAI dev mode).
 */
async function runExamples(body: CoachBody, model: string) {
  const hasGateway = !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  if (hasGateway) {
    try {
      const { generateText, gateway } = await import('ai');
      const result = await generateText({
        model: model.includes('/') ? model : `openai/${model}`,
        system: [
          'You are a senior career coach. Find 3-5 real, specific named examples relevant to the user\'s task.',
          'Use web search liberally — the user needs CURRENT examples, not memory.',
          'For each example: title, one-line "why this works", URL (when search found one), source.',
          'After your tool calls, return JSON: { examples: [{ title, oneLineWhy, url?, source? }], note?: string }.',
          'JSON ONLY in the final response — no prose around it.',
        ].join('\n'),
        prompt: [
          `Task: ${body.taskTitle ?? ''}`,
          body.taskKind ? `Kind: ${body.taskKind}` : '',
          body.userContext ? `User context: ${body.userContext}` : '',
        ].filter(Boolean).join('\n'),
        tools: {
          perplexity_search: gateway.tools.perplexitySearch({ maxResults: 5 }),
        },
        // Allow the model to call the tool then summarize — without
        // stopWhen the model returns after the tool call without a final
        // text payload. Steps include both tool calls and text turns.
        stopWhen: ({ steps }) => steps.length >= 4,
      });
      try {
        const parsed = JSON.parse(result.text) as { examples?: unknown[]; note?: string };
        if (Array.isArray(parsed.examples)) return parsed;
      } catch {
        // Fallthrough to plain JSON call below.
      }
    } catch (e) {
      console.error('[examples] AI SDK path failed, falling back:', e);
    }
  }
  // Fallback: model knowledge, no web search.
  const sys = [
    'You are a senior career coach. Return 3-5 specific named examples relevant to the task.',
    'If you genuinely don\'t know recent examples, say so in a note field — DO NOT hallucinate URLs.',
    'Return JSON: { examples: [{ title, oneLineWhy, url?, source? }], note?: string }.',
  ].join('\n');
  const user = [
    `Task: ${body.taskTitle ?? ''}`,
    body.taskKind ? `Kind: ${body.taskKind}` : '',
    body.userContext ? `User context: ${body.userContext}` : '',
    '\nReturn JSON only.',
  ].filter(Boolean).join('\n');
  return chatJson(model, sys, user);
}

async function runReview(body: CoachBody, model: string) {
  if (!body.draft || body.draft.trim().length < 20) {
    return {
      whatISaw: 'A draft shorter than 20 characters.',
      whatIMissed: 'Most of the actual content.',
      body: 'Paste more of your draft so I have something to react to.',
    };
  }
  const sys = [
    'You are a senior career coach reviewing a piece of the user\'s work.',
    'Be direct. Specific. Quote lines from their draft when you praise or push back.',
    'Always include both what was strong AND what is weak.',
    'Return JSON: { whatISaw: string, whatIMissed: string, body: string }.',
  ].join('\n');
  const user = [
    `Task: ${body.taskTitle ?? ''}`,
    body.userContext ? `User context: ${body.userContext}` : '',
    `\n--- USER DRAFT ---\n${body.draft}\n--- END DRAFT ---`,
    '\nReturn JSON only.',
  ].filter(Boolean).join('\n');
  return chatJson(model, sys, user);
}

async function runScore(body: CoachBody, model: string) {
  if (!body.draft || body.draft.trim().length < 20) {
    return { overall: 0, dimensions: [], nextAction: 'Paste your draft and I will score it.' };
  }
  const rubric = body.rubric ?? body.taskKind ?? 'generic';
  const sys = [
    'You are a senior career coach scoring a piece of work against a rubric.',
    `Use rubric: "${rubric}". Pick 4-5 dimensions appropriate for the rubric.`,
    'For each: score 1-5, what you SAW in the draft, and the specific PUSH (what to change to move score up by one).',
    'Overall = sum × 5 (out of 100). One concrete next action — not "polish it".',
    'Return JSON: { overall: number, dimensions: [{ label, score, saw, push }], nextAction: string }.',
  ].join('\n');
  const user = [
    `Task: ${body.taskTitle ?? ''}`,
    body.userContext ? `User context: ${body.userContext}` : '',
    `\n--- USER DRAFT ---\n${body.draft}\n--- END DRAFT ---`,
    '\nReturn JSON only.',
  ].filter(Boolean).join('\n');
  return chatJson(model, sys, user);
}

/**
 * Portfolio review — two-tier fetch strategy:
 *   1) Cheap server-side fetch + strip first. If we get >200 chars, the
 *      site is server-rendered — text review is fine, ship it.
 *   2) Otherwise, fall through to the Sandbox-powered renderer which
 *      runs real Chromium, takes a screenshot, uploads it to Blob, and
 *      we hand the screenshot to a vision model for multimodal review.
 * The transparency band tells the user which path was used.
 */
async function runPortfolioReview(body: CoachBody, model: string) {
  if (!body.url) {
    return { whatISaw: '', whatIMissed: 'No URL was provided.', body: 'Send me the URL and I will review it.' };
  }
  let urlObj: URL;
  try {
    urlObj = new URL(body.url);
  } catch {
    return { whatISaw: '', whatIMissed: `"${body.url}" is not a valid URL.`, body: 'Include https://' };
  }
  const url = urlObj.toString();

  // Tier 1 — plain fetch.
  const plain = await fetchAndStrip(url);
  if (plain.ok && plain.text.trim().length > 200) {
    return runPortfolioReviewText(model, body, url, plain.text, 'server-rendered fetch');
  }

  // Tier 2 — Sandbox-rendered Chromium for JS-heavy sites.
  const rendered = await renderPortfolioInSandbox(url).catch((e) => ({
    ok: false as const,
    reason: e instanceof Error ? e.message : String(e),
  }));

  if (!rendered.ok) {
    return {
      whatISaw: plain.ok ? `${plain.text.length} chars of body text (mostly empty — JS-rendered shell).` : '',
      whatIMissed: `Could not render with a headless browser either. Reason: ${rendered.reason}.`,
      body:
        'I tried plain fetch and a headless-browser render. Both came up short. ' +
        'Paste your About + case-study text directly and I\'ll review that.',
    };
  }

  // Tier 2 hit. We have text + screenshot URL. Run a multimodal review.
  return runPortfolioReviewMultimodal(
    model,
    body,
    url,
    rendered.text,
    rendered.screenshotUrl,
    `headless Chromium render via Vercel Sandbox; screenshot stored at ${rendered.screenshotUrl}`,
  );
}

async function runPortfolioReviewText(
  model: string,
  body: CoachBody,
  url: string,
  text: string,
  saw: string,
) {
  const sys = [
    'You are a senior career coach reviewing a portfolio site.',
    'Be direct. Quote specific lines. Never make up content — only refer to the fetched text.',
    `Honesty band: you saw the text (${saw}). You did NOT see screenshots, so no visual design judgment.`,
    'Score 4-5 dimensions (specificity, judgment-vs-polish, senior signals, trust/receipts, through-line).',
    'Return JSON: { whatISaw, whatIMissed, body, score: { overall, dimensions[{label,score,saw,push}], nextAction } }.',
  ].join('\n');
  const user = [
    `URL: ${url}`,
    body.taskTitle ? `Task: ${body.taskTitle}` : '',
    body.userContext ? `User context: ${body.userContext}` : '',
    `\n--- FETCHED TEXT (first 8000 chars) ---\n${text.slice(0, 8000)}\n--- END ---`,
    '\nReturn JSON only.',
  ].filter(Boolean).join('\n');
  return chatJson(model, sys, user);
}

async function runPortfolioReviewMultimodal(
  model: string,
  body: CoachBody,
  url: string,
  text: string,
  screenshotUrl: string,
  saw: string,
) {
  // gpt-5.4 is natively multimodal — same model handles text + image_url
  // parts. Override per-deploy with `LLM_VISION_MODEL` if you want to
  // pin a different vision model (e.g. anthropic/claude-opus-4.7 for
  // its sharper visual-design eye).
  const visionModel = (process.env.LLM_VISION_MODEL || 'openai/gpt-5.4').includes('/')
    ? process.env.LLM_VISION_MODEL || 'openai/gpt-5.4'
    : `openai/${process.env.LLM_VISION_MODEL || 'gpt-5.4'}`;

  const sys = [
    'You are a senior career coach reviewing a portfolio site — content AND visual design.',
    'You can see both the rendered text and a full-page screenshot. Use both.',
    `Honesty band: you saw the text + screenshot (${saw}).`,
    'Note any sections that look like they require interaction you cannot test (hovers, modals, prototypes).',
    'Score 5 dimensions: specificity, judgment-vs-polish, senior signals, trust/receipts, visual design.',
    'Return JSON: { whatISaw, whatIMissed, body, score: { overall, dimensions[{label,score,saw,push}], nextAction } }.',
  ].join('\n');
  const userParts: Array<TextPart | ImagePart> = [
    { type: 'text', text: `URL: ${url}` },
    ...(body.taskTitle ? [{ type: 'text' as const, text: `Task: ${body.taskTitle}` }] : []),
    ...(body.userContext ? [{ type: 'text' as const, text: `User context: ${body.userContext}` }] : []),
    {
      type: 'text',
      text: `\nFETCHED TEXT (first 6000 chars):\n${text.slice(0, 6000)}`,
    },
    { type: 'image_url', image_url: { url: screenshotUrl } },
    { type: 'text', text: '\nReturn JSON only.' },
  ];
  return chatJson(visionModel, sys, userParts);
}
