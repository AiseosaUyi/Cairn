/**
 * /api/transcribe — Whisper proxy as a Vercel Serverless Function.
 *
 * Uses the Vercel Node.js handler signature (req, res). Forwards the
 * raw multipart body straight to OpenAI without server-side parsing —
 * `request.formData()` on Vercel's runtime is unreliable for multipart
 * payloads. The client appends file + model + response_format itself.
 *
 * Vercel auto-parses JSON bodies but leaves other content-types as
 * a readable stream on req. We collect that stream into a Buffer and
 * pass it through to OpenAI with the original Content-Type header
 * (which carries the multipart boundary).
 *
 * `bodyParser: false` would skip Vercel's parsing, but it's only
 * applied to JSON anyway — for multipart, req is already a raw stream.
 *
 * Key stays server-side (process.env.OPENAI_API_KEY).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

// Vercel respects this — keeps the body as a raw stream we can pipe.
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error('[api/transcribe] OPENAI_API_KEY is missing from server env');
      res.status(500).json({
        ok: false,
        error:
          'OPENAI_API_KEY is not configured on the server. Set it in Vercel project settings → Environment Variables, then redeploy.',
      });
      return;
    }

    const contentType = (req.headers['content-type'] || '').toString();
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      res.status(400).json({
        ok: false,
        error: `Expected multipart/form-data, got: ${contentType || 'none'}`,
      });
      return;
    }

    let body: Buffer;
    try {
      body = await readRawBody(req);
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: `Failed to read request body: ${e instanceof Error ? e.message : String(e)}`,
      });
      return;
    }

    if (body.byteLength === 0) {
      res.status(400).json({ ok: false, error: 'Empty request body' });
      return;
    }

    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        // Forward the original multipart Content-Type unchanged so the
        // boundary string travels with the body.
        'Content-Type': contentType,
      },
      body,
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error(
        `[api/transcribe] Whisper ${upstream.status}: ${errText.slice(0, 280)}`,
      );
      res.status(upstream.status).json({
        ok: false,
        error: `Whisper ${upstream.status}: ${errText.slice(0, 280) || 'no body'}`,
      });
      return;
    }

    const json = (await upstream.json()) as { text?: string };
    res.status(200).json({ ok: true, text: (json.text ?? '').trim() });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error(`[api/transcribe] unhandled error: ${msg}`);
    res.status(500).json({ ok: false, error: msg });
  }
}
