/**
 * /api/transcribe — server-side Whisper proxy.
 *
 * Receives a multipart/form-data POST with an audio Blob in the `file`
 * field, forwards to OpenAI's transcription endpoint (whisper-1), and
 * returns { text, ok }. Same security model as /api/chat — key lives
 * only in process.env.OPENAI_API_KEY on the server.
 */

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { ok: false, error: 'OPENAI_API_KEY is not configured on the server' },
      { status: 500 },
    );
  }

  let inboundForm: FormData;
  try {
    inboundForm = await request.formData();
  } catch {
    return Response.json(
      { ok: false, error: 'Expected multipart/form-data with a `file` field' },
      { status: 400 },
    );
  }

  const file = inboundForm.get('file');
  if (!file || !(file instanceof Blob)) {
    return Response.json({ ok: false, error: 'Missing file' }, { status: 400 });
  }

  // Rebuild the form for OpenAI — keeps the original blob's mime type
  // and gives it a filename (the API requires one).
  const out = new FormData();
  const ext = file.type.includes('webm') ? 'webm'
    : file.type.includes('ogg') ? 'ogg'
    : file.type.includes('mp4') ? 'm4a'
    : file.type.includes('wav') ? 'wav'
    : 'webm';
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
