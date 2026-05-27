/**
 * /api/transcribe — Whisper proxy as a Vercel Serverless Function.
 *
 * Wire protocol (chosen for serverless reliability):
 *   - Client sends the raw audio bytes as the POST body.
 *   - Content-Type is the audio mime (audio/webm, audio/mp4, etc.).
 *   - NO multipart on the wire to/from the client.
 *
 * Why: Vercel's Node.js runtime handles `multipart/form-data` bodies
 * inconsistently across versions — sometimes auto-buffered into
 * `req.body`, sometimes left as a stream, sometimes truncated. Two
 * earlier attempts (`request.formData()` then `bodyParser: false` +
 * stream-collect) both produced opaque 500s. Forwarding raw bytes
 * removes the multipart parser from the path entirely; we construct
 * the multipart for OpenAI here on the server using Node's built-in
 * FormData (Node 18+).
 *
 * Defensive body reader handles both shapes Vercel may give us:
 *   1. `req.body` as a Buffer (auto-buffered binary)
 *   2. `req` as a Readable stream (truly raw)
 *
 * Key stays server-side (process.env.OPENAI_API_KEY).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

// Keep this even though plain Vercel functions don't always honor it —
// it's a no-op on Vercel native but signals intent for any tooling
// that does respect the Next.js convention.
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readBytes(req: VercelRequest): Promise<Buffer> {
  // Vercel may pre-buffer the body even when we ask it not to.
  if (req.body) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
    if (req.body instanceof Uint8Array) return Buffer.from(req.body);
    // Fallback for anything else — stringify then encode.
    return Buffer.from(JSON.stringify(req.body));
  }
  // Otherwise read the raw stream.
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'binary') : chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function extensionFor(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4') || m.includes('aac') || m.includes('m4a')) return 'm4a';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
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

    const contentType = (req.headers['content-type'] || 'audio/webm').toString();
    if (!contentType.toLowerCase().startsWith('audio/')) {
      res.status(400).json({
        ok: false,
        error: `Expected an audio/* Content-Type, got: ${contentType}`,
      });
      return;
    }

    let bytes: Buffer;
    try {
      bytes = await readBytes(req);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[api/transcribe] body read failed: ${msg}`);
      res.status(400).json({ ok: false, error: `Failed to read audio body: ${msg}` });
      return;
    }

    if (!bytes || bytes.byteLength === 0) {
      res.status(400).json({ ok: false, error: 'Empty audio body' });
      return;
    }

    // Construct the multipart for OpenAI here. Node 18+ FormData/Blob
    // are global and stable; this is the canonical pattern for binary
    // file upload from a serverless function.
    const ext = extensionFor(contentType);
    const blob = new Blob([bytes], { type: contentType });
    const fd = new FormData();
    fd.append('file', blob, `voice.${ext}`);
    fd.append('model', 'whisper-1');
    fd.append('response_format', 'json');

    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        // Don't set Content-Type — fetch sets it (with the multipart
        // boundary) when body is a FormData instance.
      },
      body: fd,
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
