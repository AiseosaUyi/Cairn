/**
 * AI Gateway client — single chokepoint so every server function calls
 * one place. Prefers Vercel AI Gateway (provider fallback, observability,
 * unified billing) and falls back to direct OpenAI when the Gateway key
 * isn't configured. Both routes return the same shape.
 *
 * Why Gateway: one URL/key fronts hundreds of providers. If OpenAI
 * hard-downs (it has, multiple times in 2025), Gateway can fall back to
 * Anthropic / xAI without us shipping a code change.
 *
 * Why we still keep the direct path: zero-credential dev (mock provider)
 * still works without either key. And during the cutover, AI_GATEWAY_API_KEY
 * may not be live yet — direct OpenAI keeps the path working.
 *
 * Model naming:
 *   - Gateway: `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4-7`, etc.
 *   - Direct OpenAI: `gpt-4o-mini` (no prefix).
 * We accept either and strip the prefix when calling direct.
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<TextPart | ImagePart>;
}

interface TextPart {
  type: 'text';
  text: string;
}

interface ImagePart {
  type: 'image_url';
  image_url: { url: string };
}

export interface CallOptions {
  /** json: force JSON-object output. text: free-form text. */
  responseFormat?: 'json' | 'text';
  temperature?: number;
  maxTokens?: number;
}

/** Resolve which transport to use.
 *
 *  Auth precedence (OIDC preferred):
 *    1. VERCEL_OIDC_TOKEN — auto-injected on Vercel deploys, auto-rotating,
 *       no manual rotation needed. Locally: run `vercel env pull` to get
 *       a dev OIDC token in .env.local. THIS IS THE RECOMMENDED PATH.
 *    2. AI_GATEWAY_API_KEY — long-lived API key. Use this only for
 *       external CI/CD or non-Vercel hosts where OIDC isn't available.
 *    3. OPENAI_API_KEY — direct-OpenAI fallback during Gateway cutover
 *       or when Gateway isn't enabled on the project yet.
 *    4. null — misconfigured; handler surfaces a clear error. */
function transport(): { kind: 'gateway' | 'openai'; key: string; baseUrl: string } | null {
  const oidc = process.env.VERCEL_OIDC_TOKEN;
  if (oidc) {
    return { kind: 'gateway', key: oidc, baseUrl: 'https://ai-gateway.vercel.sh/v1' };
  }
  const gwKey = process.env.AI_GATEWAY_API_KEY;
  if (gwKey) {
    return { kind: 'gateway', key: gwKey, baseUrl: 'https://ai-gateway.vercel.sh/v1' };
  }
  const oaKey = process.env.OPENAI_API_KEY;
  if (oaKey) {
    return { kind: 'openai', key: oaKey, baseUrl: 'https://api.openai.com/v1' };
  }
  return null;
}

/** Normalize a model id for the active transport. */
function modelForTransport(model: string, kind: 'gateway' | 'openai'): string {
  if (kind === 'gateway') {
    // Gateway requires provider prefix. Default to openai if caller
    // passed a bare model name.
    return model.includes('/') ? model : `openai/${model}`;
  }
  // Direct OpenAI rejects the provider prefix.
  return model.replace(/^[a-z-]+\//, '');
}

export interface ChatCallResult {
  text: string;
  finish: 'stop' | 'length' | 'content_filter' | 'error';
}

export async function chatCall(
  model: string,
  messages: ChatMessage[],
  opts: CallOptions = {},
): Promise<ChatCallResult> {
  const t = transport();
  if (!t) {
    return {
      text: 'AI is not configured on the server. Set AI_GATEWAY_API_KEY (preferred) or OPENAI_API_KEY in Vercel project env.',
      finish: 'error',
    };
  }

  const body: Record<string, unknown> = {
    model: modelForTransport(model, t.kind),
    messages,
    temperature: opts.temperature ?? 0.5,
    max_completion_tokens: opts.maxTokens ?? 1600,
  };
  if (opts.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${t.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${t.key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      text: `${t.kind} ${res.status}: ${text.slice(0, 240)}`,
      finish: 'error',
    };
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice = json.choices?.[0];
  const finish = choice?.finish_reason ?? 'stop';
  return {
    text: choice?.message?.content ?? '',
    finish:
      finish === 'stop' ? 'stop'
      : finish === 'length' ? 'length'
      : finish === 'content_filter' ? 'content_filter'
      : 'error',
  };
}

/** JSON-mode call that parses the response. Returns null on parse failure
 *  so the caller can decide whether to retry or surface an error. */
export async function chatJson<T = unknown>(
  model: string,
  system: string,
  user: string | Array<TextPart | ImagePart>,
  opts: Omit<CallOptions, 'responseFormat'> = {},
): Promise<T | { error: string; raw?: string } | null> {
  const result = await chatCall(
    model,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { ...opts, responseFormat: 'json' },
  );
  if (result.finish !== 'stop' && result.finish !== 'length') {
    return { error: result.text };
  }
  try {
    return JSON.parse(result.text) as T;
  } catch {
    return { error: 'model returned non-JSON', raw: result.text.slice(0, 500) };
  }
}

export type { ChatMessage, TextPart, ImagePart };
