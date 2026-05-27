/**
 * /api/transcribe — Whisper proxy as a Vercel Serverless Function.
 *
 * Receives multipart/form-data with the audio Blob in `file`,
 * forwards to OpenAI's transcription endpoint, returns { text, ok }.
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

  let inbound: FormData;
  try {
    inbound = await request.formData();
  } catch {
    return Response.json(
      { ok: false, error: 'Expected multipart/form-data with a `file` field' },
      { status: 400 },
    );
  }

  const file = inbound.get('file');
  if (!file || !(file instanceof Blob)) {
    return Response.json({ ok: false, error: 'Missing file' }, { status: 400 });
  }

  const ext = file.type.includes('webm') ? 'webm'
    : file.type.includes('ogg') ? 'ogg'
    : file.type.includes('mp4') ? 'm4a'
    : file.type.includes('wav') ? 'wav'
    : 'webm';

  const out = new FormData();
  out.append('file', file, `voice.${ext}`);
  out.append('model', 'whisper-1');
  out.append('response_format', 'json');

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: out,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return Response.json(
        { ok: false, error: `Whisper ${res.status}: ${errText.slice(0, 240)}` },
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
