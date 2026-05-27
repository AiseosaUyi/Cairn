/**
 * Queue consumer: portfolio reviews.
 *
 * Producer: /api/coach with mode=review-portfolio-async — enqueues
 *           { cacheKey, payload, model } onto topic 'coach-portfolio-review'
 *           and returns immediately so the user isn't blocked for 30+ sec.
 *
 * Consumer: this handler. Vercel invokes it automatically (push mode)
 *           per the vercel.json experimentalTriggers config. We:
 *             1. Run the (potentially slow) portfolio review pipeline
 *                — fetch + Sandbox render + multimodal review.
 *             2. Write the result into runtime cache under `cacheKey`.
 *             3. Client polls /api/coach (mode=review-portfolio, same
 *                key inputs) and gets the cached result instantly.
 *
 * Why this matters: a real multimodal portfolio review can run 15-30
 * seconds (Sandbox cold-start + Chromium install on first run + GPT-5.4
 * vision call). That blocks the request budget on a sync route and
 * scares users with a spinner. Queue-ing makes it a "submit → check
 * back in 30 sec" flow that the UI can show progress for.
 *
 * Idempotency: the queue may redeliver. The cacheKey is deterministic,
 * so duplicate runs simply overwrite the same cache entry with the
 * same content. Cost-wasteful but not behaviorally wrong.
 */

import { handleCallback } from '@vercel/queue';
import { writeCache } from '../../src/server/cache';
import { fetchAndStrip, renderPortfolioInSandbox } from '../../src/server/portfolio';
import { chatJson, type ImagePart, type TextPart } from '../../src/server/gateway';

interface QueueMessage {
  cacheKey: string;
  model: string;
  payload: {
    url?: string;
    taskTitle?: string;
    userContext?: string;
  };
}

export const POST = handleCallback(async (raw: unknown, metadata: { messageId: string }) => {
  const msg = raw as QueueMessage;
  if (!msg || !msg.cacheKey || !msg.payload?.url) {
    console.error('[queue/portfolio-review] malformed message', metadata.messageId);
    return;
  }
  const { cacheKey, model, payload } = msg;
  const payloadUrl = payload.url;
  let url: URL;
  try {
    if (!payloadUrl) throw new Error('missing url');
    url = new URL(payloadUrl);
  } catch {
    await writeCache(cacheKey, {
      whatISaw: '',
      whatIMissed: `"${payloadUrl ?? ''}" is not a valid URL.`,
      body: 'Include https://',
    });
    return;
  }
  const urlStr = url.toString();

  // Try plain fetch first.
  const plain = await fetchAndStrip(urlStr);
  if (plain.ok && plain.text.trim().length > 200) {
    const reviewed = await reviewText(model, payload, urlStr, plain.text);
    await writeCache(cacheKey, reviewed, {
      ttl: 60 * 60 * 24 * 7,
      tags: ['portfolio', urlStr],
    });
    return;
  }

  // Sandbox render for JS-heavy.
  const rendered = await renderPortfolioInSandbox(urlStr).catch((e) => ({
    ok: false as const,
    reason: e instanceof Error ? e.message : String(e),
  }));
  if (!rendered.ok) {
    await writeCache(
      cacheKey,
      {
        whatISaw: plain.ok ? `${plain.text.length} chars (empty shell).` : '',
        whatIMissed: `Could not headless-render either. ${rendered.reason}.`,
        body:
          'I tried both plain fetch and a headless-browser render. Both failed. ' +
          'Paste your About + case-study text and I\'ll review the content directly.',
      },
      { ttl: 60 * 60 * 24, tags: ['portfolio', urlStr] },
    );
    return;
  }

  const reviewed = await reviewMultimodal(model, payload, urlStr, rendered.text, rendered.screenshotUrl);
  await writeCache(cacheKey, reviewed, {
    ttl: 60 * 60 * 24 * 7,
    tags: ['portfolio', urlStr],
  });
});

async function reviewText(
  model: string,
  body: QueueMessage['payload'],
  url: string,
  text: string,
) {
  const sys = [
    'You are a senior career coach reviewing a portfolio site.',
    'Be direct. Quote specific lines. Never make up content — only refer to the fetched text.',
    'Honesty band: you saw the text (server-rendered fetch). NO visual design judgment (no screenshot).',
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

async function reviewMultimodal(
  model: string,
  body: QueueMessage['payload'],
  url: string,
  text: string,
  screenshotUrl: string,
) {
  const visionModel = (process.env.LLM_VISION_MODEL || 'openai/gpt-5.4').includes('/')
    ? process.env.LLM_VISION_MODEL || 'openai/gpt-5.4'
    : `openai/${process.env.LLM_VISION_MODEL || 'gpt-5.4'}`;
  const sys = [
    'You are a senior career coach reviewing a portfolio site — content AND visual design.',
    'You can see both the rendered text and a full-page screenshot. Use both.',
    `Honesty band: you saw text + screenshot via headless Chromium. Note any interactive elements (hovers, modals) you could not test.`,
    'Score 5 dimensions: specificity, judgment-vs-polish, senior signals, trust/receipts, visual design.',
    'Return JSON: { whatISaw, whatIMissed, body, score: { overall, dimensions[{label,score,saw,push}], nextAction } }.',
  ].join('\n');
  const userParts: Array<TextPart | ImagePart> = [
    { type: 'text', text: `URL: ${url}` },
    ...(body.taskTitle ? [{ type: 'text' as const, text: `Task: ${body.taskTitle}` }] : []),
    ...(body.userContext ? [{ type: 'text' as const, text: `User context: ${body.userContext}` }] : []),
    { type: 'text', text: `\nFETCHED TEXT (first 6000 chars):\n${text.slice(0, 6000)}` },
    { type: 'image_url', image_url: { url: screenshotUrl } },
    { type: 'text', text: '\nReturn JSON only.' },
  ];
  return chatJson(visionModel, sys, userParts);
}
