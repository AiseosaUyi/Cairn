/**
 * Voice transcription — POSTs raw audio bytes to /api/transcribe.
 *
 * After the 2026-05-27 wire-protocol simplification: the client sends
 * the audio Blob directly as the request body (no multipart). The
 * proxy builds the multipart for Whisper server-side. This sidesteps
 * Vercel's flaky multipart parsing — which produced opaque HTTP 500s
 * in two earlier attempts (formData() and bodyParser:false + stream).
 *
 * Web-only for now (uses fetch + the browser Blob from MediaRecorder).
 * Native (expo-av recording) follows the same wire shape when added.
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
  // Content-Type carries the audio mime to the server so it can pick
  // the right Whisper-compatible filename extension. Default to webm
  // for browsers that don't set type on MediaRecorder output.
  const contentType = audio.type || 'audio/webm';

  try {
    const res = await fetch(`${apiBase()}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: audio,
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
