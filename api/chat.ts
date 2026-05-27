/**
 * /api/chat — OpenAI proxy as a Vercel Serverless Function.
 *
 * Lives at the project root /api/ — Vercel's native auto-detect path.
 *
 * Uses the Vercel Node.js handler signature (req, res) rather than the
 * Web standard (request: Request) => Response. The Web signature works
 * intermittently on Vercel's runtime depending on @vercel/node version;
 * the Node signature is battle-tested across every plan and runtime.
 *
 * Key stays server-side: process.env.OPENAI_API_KEY (no EXPO_PUBLIC_).
 *
 * Every code path returns JSON. Cold-start failures, parse errors, and
 * upstream OpenAI errors are all caught and reported as
 * `{ error: string }`. The client should never see a generic HTML 500.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatBody {
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
}

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Top-level try so cold-start or unexpected errors never leak as raw HTML.
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error('[api/chat] OPENAI_API_KEY is missing from server env');
      res.status(500).json({
        error:
          'OPENAI_API_KEY is not configured on the server. Set it in Vercel project settings → Environment Variables, then redeploy.',
      });
      return;
    }

    // Vercel parses JSON bodies automatically when Content-Type is JSON.
    // Accept either parsed object or raw string for resilience.
    let body: ChatBody;
    if (req.body && typeof req.body === 'object') {
      body = req.body as ChatBody;
    } else if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body) as ChatBody;
      } catch {
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Missing request body' });
      return;
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      res.status(400).json({ error: 'messages[] is required and must be non-empty' });
      return;
    }

    const model = body.model || process.env.LLM_MODEL || 'gpt-4.1-mini';

    const upstream = await fetch(ENDPOINT, {
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

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error(`[api/chat] OpenAI ${upstream.status}: ${errText.slice(0, 280)}`);
      res.status(upstream.status).json({
        error: `OpenAI ${upstream.status}: ${errText.slice(0, 280) || 'no body'}`,
      });
      return;
    }

    const json = (await upstream.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
    };
    const choice = json.choices?.[0];
    res.status(200).json({
      text: choice?.message?.content ?? '',
      stop: choice?.finish_reason ?? 'stop',
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error(`[api/chat] unhandled error: ${msg}`);
    res.status(500).json({ error: msg });
  }
}
