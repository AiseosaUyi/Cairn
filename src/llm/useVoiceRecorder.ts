/**
 * Web voice recorder hook. Wraps the browser MediaRecorder API + Whisper
 * transcription into one ergonomic interface for the chat composer.
 *
 *   const { recording, elapsed, start, stopAndTranscribe, cancel, error } =
 *     useVoiceRecorder();
 *
 * Native (iOS/Android) recording is intentionally not wired here — would
 * use expo-av Audio.Recording. On native the `start()` returns immediately
 * with an error so the UI can fall back gracefully.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { transcribe } from './whisper';

interface State {
  recording: boolean;
  /** Seconds elapsed in the current recording. */
  elapsed: number;
  /** Whisper request in flight after stop. */
  transcribing: boolean;
  /** Latest user-facing error (mic denied, no API key, network, etc.). */
  error: string | null;
}

export interface VoiceRecorder extends State {
  start: () => Promise<void>;
  /** Stop the recording, transcribe, return the text (or null on failure). */
  stopAndTranscribe: () => Promise<string | null>;
  cancel: () => void;
}

export function useVoiceRecorder(): VoiceRecorder {
  const [state, setState] = useState<State>({
    recording: false,
    elapsed: 0,
    transcribing: false,
    error: null,
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
    };
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (Platform.OS !== 'web') {
      setState((s) => ({ ...s, error: 'Voice recording is web-only for now.' }));
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState((s) => ({ ...s, error: "Your browser doesn't support voice recording." }));
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setState((s) => ({ ...s, error: "Your browser doesn't support MediaRecorder." }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Let the browser pick the best mime; Whisper accepts webm/ogg/mp4/wav.
      const mime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
        : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setState({ recording: true, elapsed: 0, transcribing: false, error: null });
      tickRef.current = setInterval(() => {
        setState((s) => ({ ...s, elapsed: s.elapsed + 1 }));
      }, 1000);
    } catch (e) {
      stopTracks();
      const msg = e instanceof Error ? e.message : String(e);
      setState({
        recording: false,
        elapsed: 0,
        transcribing: false,
        error: msg.includes('NotAllowedError')
          ? "Mic permission denied — enable it in your browser's site settings."
          : msg.includes('NotFoundError')
          ? 'No microphone found on this device.'
          : `Couldn't start recording: ${msg}`,
      });
    }
  }, [stopTracks]);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    const rec = recorderRef.current;
    if (!rec) return null;
    setState((s) => ({ ...s, recording: false, transcribing: true }));

    // Wait for the recorder to flush its last chunk via 'stop'.
    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () => {
        const out = new Blob(chunksRef.current, {
          type: rec.mimeType || 'audio/webm',
        });
        resolve(out);
      };
      try {
        rec.stop();
      } catch {
        resolve(new Blob(chunksRef.current));
      }
    });

    stopTracks();
    recorderRef.current = null;

    if (blob.size === 0) {
      setState((s) => ({ ...s, transcribing: false, error: 'No audio captured.' }));
      return null;
    }

    const res = await transcribe(blob);
    setState((s) => ({
      ...s,
      transcribing: false,
      error: res.ok ? null : res.error ?? 'Transcription failed.',
    }));
    return res.ok ? res.text : null;
  }, [stopTracks]);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    chunksRef.current = [];
    recorderRef.current = null;
    stopTracks();
    setState({ recording: false, elapsed: 0, transcribing: false, error: null });
  }, [stopTracks]);

  return { ...state, start, stopAndTranscribe, cancel };
}
