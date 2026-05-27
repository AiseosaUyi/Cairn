/**
 * BotID client init — fires once on web, no-op on native.
 *
 * What it does: registers paths that should carry the BotID challenge
 * headers. The server's `checkBotId()` call (in /api/_lib/botid.ts)
 * validates those headers. If they're missing or invalid, the request
 * is classified as a bot and 403'd.
 *
 * We protect the high-value/expensive routes:
 *   - /api/coach        — every coaching call (template / review / score /
 *                          examples / portfolio render). Expensive in tokens
 *                          + Sandbox time → bot abuse target.
 *   - /api/transcribe   — Whisper transcription. Bot DoS target.
 *
 * NOT protected:
 *   - /api/chat         — primary chat surface. Will protect once we
 *                          confirm the BotID challenge doesn't add
 *                          perceptible latency to first message.
 *   - /api/queues/*     — invoked only by Vercel's queue infrastructure;
 *                          not publicly addressable.
 */

import { Platform } from 'react-native';

let initialized = false;

export function initBotIdOnce(): void {
  if (initialized) return;
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  initialized = true;
  // Lazy-import so React Native native bundles don't pull in browser DOM
  // dependencies at module-graph time.
  import('botid/client/core')
    .then(({ initBotId }) => {
      initBotId({
        protect: [
          { path: '/api/coach', method: 'POST' },
          { path: '/api/transcribe', method: 'POST' },
        ],
      });
    })
    .catch((e) => {
      // Non-fatal — server still runs the check, may fail-open per
      // BOTID_REQUIRED env. We log so it's visible in dev.
      console.warn('[botid] client init failed:', e);
    });
}
