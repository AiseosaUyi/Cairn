/**
 * /api/transcribe — Whisper proxy as a Vercel Serverless Function.
 *
 * Why this just forwards raw bytes instead of parsing the multipart:
 * `Request.formData()` on Vercel's Node runtime is unreliable for
 * `multipart/form-data` — different runtime/undici versions either fail
 * to parse the boundary, mangle Blob filenames, or throw outright on
 * larger payloads. Symptom is an opaque HTTP 500 in the client.
 *
 * Solution: don't parse. The client already builds the FormData with
 * `file`, `model`, and `response_format` fields, so we read the body
 * as bytes, copy the original Content-Type (which carries the boundary
 * string Whisper needs), and stream it straight to OpenAI. Zero
 * multipart code on our side.
 *
 * Key stays server-side (process.env.OPENAI_API_KEY).
 */

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { ok: false, error: 'OPENAI_API_KEY is not configured on the server' },
      { status: 500 },
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return Response.json(
      { ok: false, error: `Expected multipart/form-data, got: ${contentType || 'none'}` },
      { status: 400 },
    );
  }

  let body: ArrayBuffer;
  try {
    body = await request.arrayBuffer();
  } catch (e) {
    return Response.json(
      { ok: false, error: `Failed to read request body: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  if (body.byteLength === 0) {
    return Response.json({ ok: false, error: 'Empty request body' }, { status: 400 });
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        // Forward the original multipart Content-Type unchanged so the
        // boundary string travels with the body. Don't add charset or
        // any other parameter — Whisper validates this strictly.
        'Content-Type': contentType,
      },
      body,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return Response.json(
        { ok: false, error: `Whisper ${res.status}: ${errText.slice(0, 280)}` },
        { status: res.status },
      );
    }

    const json = (await res.json()) as { text?: string };
    return Response.json({ ok: true, text: (json.text ?? '').trim() });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
