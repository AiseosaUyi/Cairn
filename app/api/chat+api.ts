/**
 * /api/chat — server-side OpenAI proxy.
 *
 * Expo Router API route (the `+api.ts` suffix). In dev, served by the
 * Expo dev server. In production on Vercel, deploys as a Vercel
 * Function. The OpenAI key lives ONLY here (process.env.OPENAI_API_KEY,
 * no EXPO_PUBLIC_ prefix → never bundled to the client).
 *
 * Client uses src/llm/provider.ts which POSTs here with the message
 * list; we forward to OpenAI Chat Completions and return the shape
 * the client expects: { text, stop }.
 *
 * Hardening to add when this leaves friends-test mode:
 *   - Auth: require a valid Supabase session before calling OpenAI
 *   - Rate limit: per-user requests/minute (Upstash Redis or Vercel KV)
 *   - Streaming: switch to SSE so long replies feel faster
 *   - Per-user spend tracking (log token counts to Supabase)
 *
 * For now: open endpoint + OpenAI account spend cap = acceptable for
 * a small friends-test, BAD for any wider audience.
 */

interface ChatRequest {
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
}

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured on the server' },
      { status: 500 },
    );
  }

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json(
      { error: 'messages[] is required and must be non-empty' },
      { status: 400 },
    );
  }

  const model = body.model || process.env.LLM_MODEL || 'gpt-4.1-mini';

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        max_completion_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return Response.json(
        { error: `OpenAI ${res.status}: ${errText.slice(0, 280)}` },
        { status: res.status },
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
    };
    const choice = json.choices?.[0];
    return Response.json({
      text: choice?.message?.content ?? '',
      stop: choice?.finish_reason ?? 'stop',
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
