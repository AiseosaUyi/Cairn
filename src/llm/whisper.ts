/**
 * Voice transcription — calls OUR /api/transcribe proxy.
 *
 * After the 2026-05-27 security fix: the Whisper API key lives ONLY
 * on the server (process.env.OPENAI_API_KEY in app/api/transcribe+api.ts).
 * The client uploads the raw audio Blob to our endpoint, which forwards
 * to OpenAI server-side.
 *
 * Web-only for now (uses fetch + FormData with the browser Blob from
 * MediaRecorder). Native (expo-av recording) is a follow-up; the
 * proxy endpoint stays the same.
 */

export interface TranscribeResult {
  text: string;
  ok: boolean;
  error?: string;
}

function apiBase(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
}

export async function transcribe(audio: Blob): Promise<TranscribeResult> {
  const fd = new FormData();
  // Filename is required by Whisper for content-type sniffing; extension
  // must match the audio mime or Whisper rejects with "Invalid file
  // format". Browser-recorded webm/opus is the common case.
  const ext = audio.type.includes('webm') ? 'webm'
    : audio.type.includes('ogg') ? 'ogg'
    : audio.type.includes('mp4') ? 'm4a'
    : audio.type.includes('wav') ? 'wav'
    : 'webm';
  // The proxy forwards this multipart unchanged, so all Whisper-required
  // fields have to be set here on the client.
  fd.append('file', audio, `voice.${ext}`);
  fd.append('model', 'whisper-1');
  fd.append('response_format', 'json');

  try {
    const res = await fetch(`${apiBase()}/api/transcribe`, {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const err = await safeJson(res);
      return {
        ok: false,
        text: '',
        error: err?.error ?? `HTTP ${res.status}`,
      };
    }

    const json = (await res.json()) as { ok?: boolean; text?: string; error?: string };
    return {
      ok: !!json.ok,
      text: (json.text ?? '').trim(),
      error: json.error,
    };
  } catch (e) {
    return {
      ok: false,
      text: '',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function safeJson(res: Response): Promise<{ error?: string } | null> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return null;
  }
}
