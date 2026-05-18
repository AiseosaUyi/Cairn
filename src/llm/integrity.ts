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
