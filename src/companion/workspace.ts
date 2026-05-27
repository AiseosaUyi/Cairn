/**
 * Workspace client — the typed bridge between the UI and /api/coach.
 *
 * Mirrors the structured shapes returned by the server endpoints.
 * Falls back to deterministic mock content when:
 *   - EXPO_PUBLIC_LLM_PROVIDER is not 'openai' (dev / no key configured)
 *   - the request fails (offline, server error)
 *
 * Mocks are EXPLICITLY LABELED as mock content. They demonstrate the
 * shape of the workspace without faking a real coaching review — the
 * founder's bar is "don't ship vibes".
 */

import type { ArtifactExample, ArtifactReview, ArtifactScore } from './artifacts';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

interface CoachRequest {
  mode:
    | 'template'
    | 'review'
    | 'score'
    | 'examples'
    | 'review-portfolio'
    | 'review-portfolio-async';
  taskTitle?: string;
  taskKind?: string;
  taskWhy?: string;
  userContext?: string;
  draft?: string;
  url?: string;
  rubric?: string;
  refresh?: boolean;
}

interface CoachResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Always try the real server. The earlier gate (`REAL_PROVIDER` env flag)
 * meant the user had to set BOTH OPENAI_API_KEY on the server AND
 * EXPO_PUBLIC_LLM_PROVIDER=openai on the build — and forgetting the second
 * one silently returned mocks even though the server was ready. Now: try,
 * and only fall back to mock if the server explicitly responds with no key.
 */
async function call<T>(req: CoachRequest): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const json = (await res.json()) as CoachResponse<T>;
    if (!res.ok || !json.ok) {
      console.error('[workspace]', json.error ?? res.status);
      return null;
    }
    return json.data ?? null;
  } catch (e) {
    console.error('[workspace] fetch failed', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TemplateResult {
  title: string;
  body: string;
  instructions: string;
}

export async function fetchTemplate(input: {
  taskTitle: string;
  taskKind?: string;
  taskWhy?: string;
  userContext?: string;
}): Promise<TemplateResult> {
  const real = await call<TemplateResult>({ mode: 'template', ...input });
  if (real && typeof real.body === 'string' && real.body.length > 0) return real;
  return mockTemplate(input);
}

export interface ExamplesResult {
  examples: ArtifactExample[];
  note?: string;
}

export async function fetchExamples(input: {
  taskTitle: string;
  taskKind?: string;
  userContext?: string;
}): Promise<ExamplesResult> {
  const real = await call<ExamplesResult>({ mode: 'examples', ...input });
  if (real && Array.isArray(real.examples) && real.examples.length > 0) return real;
  return mockExamples(input);
}

export async function fetchReview(input: {
  taskTitle: string;
  taskKind?: string;
  userContext?: string;
  draft: string;
}): Promise<ArtifactReview> {
  const real = await call<ArtifactReview>({ mode: 'review', ...input });
  if (real && typeof real.body === 'string') return real;
  return mockReview(input);
}

export async function fetchScore(input: {
  taskTitle: string;
  taskKind?: string;
  userContext?: string;
  draft: string;
  rubric?: string;
}): Promise<ArtifactScore> {
  const real = await call<ArtifactScore>({ mode: 'score', ...input });
  if (real && Array.isArray(real.dimensions)) return real;
  return mockScore(input);
}

export async function fetchPortfolioReview(input: {
  taskTitle?: string;
  userContext?: string;
  url: string;
}): Promise<ArtifactReview> {
  // Two-call dance:
  //   1. mode=review-portfolio-async — enqueues the heavy work, returns
  //      immediately with a cacheKey. The worker (api/queues/portfolio-review)
  //      runs the Sandbox render + multimodal review and writes the
  //      result into runtime cache under that key.
  //   2. mode=review-portfolio — synchronous; the runtime cache hit
  //      returns the worker's result instantly. If the worker hasn't
  //      finished yet, this falls through to a sync render in the same
  //      function (slower but works) — so we always return SOMETHING.
  //
  // Why both: queueing makes Sandbox+multimodal cold starts (15-30 sec)
  // not feel awful. Sync fallback means if Queues isn't enabled on the
  // project, the workspace still works.
  const queued = await call<{ queued?: boolean; cacheKey?: string }>({
    mode: 'review-portfolio-async',
    ...input,
  });
  if (queued?.queued && queued.cacheKey) {
    // Poll the sync endpoint — it returns the cached result the worker
    // writes. Up to 12 attempts × 3 sec = 36 sec budget.
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const polled = await call<ArtifactReview>({ mode: 'review-portfolio', ...input });
      if (polled && polled.whatISaw !== undefined && polled.body) {
        return polled;
      }
    }
  }
  // Fallback: synchronous review. Either we never queued (Queues
  // disabled) or the worker is slow — run it in-line here.
  const real = await call<ArtifactReview>({ mode: 'review-portfolio', ...input });
  if (real && typeof real.body === 'string') return real;
  return mockPortfolioReview(input);
}

// ---------------------------------------------------------------------------
// Deterministic fallbacks. Explicitly labeled as previews of the shape.
// ---------------------------------------------------------------------------

function mockTemplate(input: { taskTitle: string; taskKind?: string }): TemplateResult {
  const kind = input.taskKind ?? 'write';
  const body =
    kind === 'write'
      ? `# ${input.taskTitle}\n\n**Context (1-2 lines):**\n[your context here]\n\n**The thing (3-5 paragraphs):**\n\n*Paragraph 1 — set the stage:*\n[your text here]\n\n*Paragraph 2 — the decision / move / proof:*\n[your text here]\n\n*Paragraph 3 — what changed:*\n[your text here]\n\n**One number:**\n[the metric that grounds this]\n\n**One regret (senior move):**\n[what you'd do differently]`
      : kind === 'outreach'
        ? `Subject: [3-5 word hook]\n\nHi [name],\n\n[One line of legitimate connection — a piece of work of theirs you actually read]\n\n[One line of who you are + why you are writing — 25 words max]\n\n[The ask — specific, small, time-boxed. "15 minutes next week to ask one question about X" beats "would love to chat"]\n\nNo pressure either way.\n\n[your name]`
        : kind === 'reflect'
          ? `# Reflection: ${input.taskTitle}\n\n**What I think is true:**\n- \n- \n- \n\n**What I am not sure about:**\n- \n- \n\n**What I am avoiding looking at:**\n- \n\n**One sentence that would change if this went well:**`
          : `# ${input.taskTitle}\n\n[Starter scaffold — the real workspace will pre-fill this with your context once OpenAI is configured.]`;
  return {
    title: input.taskTitle,
    body,
    instructions:
      '[Preview shape] Set EXPO_PUBLIC_LLM_PROVIDER=openai and OPENAI_API_KEY on the server to get a template pre-filled with your goal, context, and companion voice.',
  };
}

function mockExamples(input: { taskTitle: string }): ExamplesResult {
  return {
    examples: [
      {
        title: '[Preview — real examples require server key]',
        oneLineWhy:
          'The real Examples tool returns 3-5 specific named examples with URLs the model knows. Mocked here so the UI shape is visible.',
        source: 'preview',
      },
    ],
    note: `Configure OPENAI_API_KEY on the server to surface real examples for "${input.taskTitle}".`,
  };
}

function mockReview(input: { taskTitle: string; draft: string }): ArtifactReview {
  return {
    whatISaw: `A draft of ${input.draft.length} characters.`,
    whatIMissed:
      'The full context — what level you are interviewing for, the audience, related artifacts.',
    body:
      `[Preview review — server key not configured]\n\nA real review reads your draft, quotes specific lines, names what is working and what is weak, and tells you the one revision to make first.\n\nSet OPENAI_API_KEY on the server and EXPO_PUBLIC_LLM_PROVIDER=openai to switch on real reviews.`,
  };
}

function mockScore(input: { taskTitle: string; draft: string }): ArtifactScore {
  return {
    overall: 0,
    dimensions: [
      {
        label: 'Specificity',
        score: 0,
        saw: '[preview]',
        push: 'Configure the server key to get real scoring.',
      },
      { label: 'Senior signal', score: 0, saw: '[preview]', push: 'Same.' },
      { label: 'Through-line', score: 0, saw: '[preview]', push: 'Same.' },
    ],
    nextAction:
      'Set OPENAI_API_KEY and EXPO_PUBLIC_LLM_PROVIDER=openai to get a real rubric score.',
  };
}

function mockPortfolioReview(input: { url: string }): ArtifactReview {
  return {
    whatISaw: '',
    whatIMissed:
      'Cannot fetch the URL without the server key. Real portfolio review fetches the page server-side, strips it to text, and reviews against a senior-portfolio rubric.',
    body:
      `[Preview — server key not configured]\n\nThe real portfolio review pulls ${input.url}, extracts the content, and reviews it with an honesty band: what could be seen, what could not, and a rubric scoring.\n\nSet OPENAI_API_KEY on the server. For JS-rendered sites (Framer, Webflow), the next step is wiring a headless browser (Browserless or Vercel Sandbox) — until then we surface "the site is JS-rendered, paste the text" rather than fake a review.`,
  };
}
