/**
 * State-sensing v1 (eng-review locked): mood/energy from an explicit calm
 * check-in plus transcript sentiment. NO acoustic prosody in v1 — "voice
 * mood-sensing" means sentiment over transcribed text, deferred otherwise.
 */
const POS = /\b(good|better|proud|relieved|hopeful|calm|did it|finished|won|progress)\b/i;
const NEG = /\b(bad|worse|tired|exhausted|anxious|scared|stuck|failed|can'?t|hopeless|alone)\b/i;

/** Rough sentiment from transcript only. -1..1. Conservative, never clinical. */
export function transcriptSentiment(text: string): number {
  let s = 0;
  if (POS.test(text)) s += 0.5;
  if (NEG.test(text)) s -= 0.5;
  if (/\b(really|very|so)\b/i.test(text)) s *= 1.3;
  return Math.max(-1, Math.min(1, s));
}

/** Blend explicit self-report (authoritative) with transcript signal (hint). */
export function blendMood(
  selfMood: number,
  selfEnergy: number,
  sentiment: number,
): { mood: number; energy: number } {
  const nudge = sentiment * 0.5; // self-report dominates; sentiment only nudges
  const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
  return { mood: clamp(selfMood + nudge), energy: clamp(selfEnergy + nudge * 0.5) };
}
