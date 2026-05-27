/**
 * /api/chat — OpenAI proxy as a Vercel Serverless Function.
 *
 * This file lives at the PROJECT ROOT /api/, not under app/. That's
 * Vercel's native auto-detect path — every .ts file in /api/ deploys
 * as a serverless function automatically, regardless of framework
 * (Expo, Next, Astro, whatever). Bulletproof routing.
 *
 * Key stays server-side: process.env.OPENAI_API_KEY (no EXPO_PUBLIC_
 * prefix). Client posts here; we forward to OpenAI; return the shape
 * the LlmProvider in src/llm/provider.ts expects: { text, stop }.
 *
 * Hardening to add post-friends-test: auth gate (require Supabase
 * session), rate limiting, streaming, per-user token accounting.
 */

interface ChatBody {
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
}

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured on the server' },
      { status: 500 },
    );
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
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
