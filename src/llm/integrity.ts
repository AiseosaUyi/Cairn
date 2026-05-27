/**
 * LLM-output-integrity layer (eng-review v1 scope, engine-layer / Phase 1).
 *
 * Every model response passes through here before a user sees it. Empty,
 * malformed, refusal, or low-confidence health/crisis output never reaches
 * the user raw — it routes to a safe, human deferral. Treating the model as
 * fallible is the contract everything else builds on.
 */
import { getProvider, type LlmMessage, type LlmResult } from './provider';

export interface SafeReply {
  text: string;
  /** true when we deliberately did NOT surface model output. */
  deferred: boolean;
  reason?: 'empty' | 'refusal' | 'error' | 'low_confidence';
}

const SAFE_DEFERRAL =
  "I don't want to give you something half-formed on this — it matters too " +
  'much. Let me sit with it. Can you say a little more about what you need ' +
  'right now?';

// Separate copy for transport-layer failures (proxy 500s, network blips,
// missing API key). The warm "don't want to give you something half-formed"
// makes the user think the agent is being precious — but the actual problem
// is technical and the user can fix it (or just retry). Be honest about it.
const TRANSPORT_ERROR =
  "I couldn't reach my brain just now — there might be a connection or " +
  'server-config issue. Try sending that again in a moment. If it keeps ' +
  'happening, the model proxy probably needs an API key set on the server.';

function looksMalformed(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return true;
  // Unterminated JSON-ish / obvious tool-call leakage.
  if (/^\s*[{[]/.test(t) && !/[}\]]\s*$/.test(t)) return true;
  return false;
}

export async function completeSafe(
  messages: LlmMessage[],
  opts: { maxRetries?: number; sensitive?: boolean } = {},
): Promise<SafeReply> {
  const maxRetries = opts.maxRetries ?? 1;
  let last: LlmResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      last = await getProvider().complete(messages);
    } catch {
      continue; // provider error → retry, then defer
    }
    if (!last) continue;
    if (last.stop === 'refusal') {
      return { text: SAFE_DEFERRAL, deferred: true, reason: 'refusal' };
    }
    // Provider returned an error envelope (e.g. proxy 500, OpenAI 401).
    // Use the TRANSPORT_ERROR copy so the user sees "couldn't reach my
    // brain" — which is honest and diagnosable — rather than the warm
    // refusal copy that makes the agent look precious.
    if (last.stop === 'error') {
      if (attempt < maxRetries) continue;
      return { text: TRANSPORT_ERROR, deferred: true, reason: 'error' };
    }
    const text = (last.text ?? '').trim();
    if (!text) {
      if (attempt < maxRetries) continue;
      return { text: SAFE_DEFERRAL, deferred: true, reason: 'empty' };
    }
    if (looksMalformed(text)) {
      if (attempt < maxRetries) continue;
      return { text: SAFE_DEFERRAL, deferred: true, reason: 'low_confidence' };
    }
    // Sensitive surfaces (health/crisis) get a stricter bar: a hedged or
    // very short answer on something that matters defers to a human.
    if (opts.sensitive && text.length < 40) {
      return { text: SAFE_DEFERRAL, deferred: true, reason: 'low_confidence' };
    }
    return { text, deferred: false };
  }
  return { text: SAFE_DEFERRAL, deferred: true, reason: 'error' };
}
