/**
 * Health guardrail layer. Health is navigation/information ONLY — never
 * diagnosis-as-verdict, never dosage-as-instruction (CEO-plan lock).
 *
 * This filter sits between the model and the user in Health mode. It strips /
 * blocks unsafe shapes and forces the defer-to-professional posture. The whole
 * Health domain is also gated (Gates.healthCleared) until legal + clinical
 * review of disclaimers and the red-flag set.
 */
import { Gates, gateNotice } from './gates';

const DOSAGE = /\b(\d+\s?(mg|mcg|ml|g)\b|take\s+\d+\s+(tablet|pill|capsule)s?)/i;
const DIAGNOSIS_VERDICT =
  /\b(you (have|are suffering from)|this is definitely|it'?s clearly)\s+[a-z]/i;

// Conservative physical red-flags → escalate to "seek care now".
const RED_FLAG = [
  /\b(chest pain|pressure in (my|the) chest|crushing chest)\b/i,
  /\b(can'?t breathe|trouble breathing|short(ness)? of breath)\b/i,
  /\b(slurred speech|face drooping|one side.*numb|stroke)\b/i,
  /\b(severe bleeding|coughing up blood|blood in (stool|urine))\b/i,
  /\b(suicidal|overdose)\b/i,
];

const DISCLAIMER =
  'This is general information to help you navigate, not medical advice. ' +
  'Please confirm anything specific with a licensed pharmacist or doctor.';

export interface GuardedHealthReply {
  text: string;
  redFlag: boolean;
  blocked: boolean;
}

export function hasRedFlag(userText: string): boolean {
  return RED_FLAG.some((r) => r.test(userText));
}

export function guardHealthReply(
  userText: string,
  modelText: string,
): GuardedHealthReply {
  if (hasRedFlag(userText)) {
    return {
      redFlag: true,
      blocked: true,
      text:
        "Some of what you described can be serious and time-sensitive. I'm not " +
        'going to try to work through this over text — please seek in-person ' +
        'medical care now (a clinic, ER, or local emergency number). I can help ' +
        'you think through what to tell them once you are safe.',
    };
  }
  if (DOSAGE.test(modelText) || DIAGNOSIS_VERDICT.test(modelText)) {
    // Model produced an unsafe shape. Block it, do not surface raw.
    return {
      redFlag: false,
      blocked: true,
      text:
        "I can help you understand options and questions to bring to a " +
        'professional, but I won\'t name a diagnosis or a dose — that has to ' +
        `come from someone who can examine you. ${DISCLAIMER}`,
    };
  }
  return { redFlag: false, blocked: false, text: `${modelText}\n\n${DISCLAIMER}` };
}

export function healthDomainAvailable(): { ok: boolean; notice?: string } {
  return Gates.healthCleared
    ? { ok: true }
    : { ok: false, notice: gateNotice('health') };
}
