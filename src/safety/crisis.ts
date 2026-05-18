/**
 * Crisis detection + escalation.
 *
 * UX is locked (design review): a CALM in-conversation shift. No red modal,
 * no full-screen takeover, no ejection from the chat. The companion stays
 * present, names what it heard, surfaces region-aware help inline.
 *
 * The classifier here is a deliberately conservative keyword+pattern pass.
 * It is NOT the production model. Per the CEO-plan hard gate, the actual
 * detection thresholds, copy, and routing must be reviewed and signed off by
 * a qualified mental-health professional (eval-recall gated) before exposure.
 * Detection runs regardless; what changes behind the gate is what the user
 * sees and whether an operator alert fires.
 */
import { Gates } from './gates';

export type CrisisLevel = 'none' | 'concern' | 'acute';

const ACUTE = [
  /\b(kill myself|end my life|suicid|don'?t want to (be here|live)|better off dead)\b/i,
  /\b(hurt myself|harm myself|cut myself)\b/i,
  /\b(overdose|take all (the|my) pills)\b/i,
];
const CONCERN = [
  /\b(hopeless|no point|can'?t go on|give up on everything|worthless)\b/i,
  /\b(nobody would (care|notice)|disappear forever)\b/i,
];

export function classifyCrisis(text: string): CrisisLevel {
  if (ACUTE.some((r) => r.test(text))) return 'acute';
  if (CONCERN.some((r) => r.test(text))) return 'concern';
  return 'none';
}

// Region-aware help. NG + US first (target markets); extend per region.
export interface Hotline {
  region: string;
  name: string;
  contact: string;
  note: string;
}

export function hotlinesFor(region: 'NG' | 'US' | 'unknown'): Hotline[] {
  const us: Hotline[] = [
    { region: 'US', name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', note: '24/7, free, confidential' },
    { region: 'US', name: 'Crisis Text Line', contact: 'Text HOME to 741741', note: '24/7 text support' },
  ];
  const ng: Hotline[] = [
    { region: 'NG', name: 'Nigeria Suicide Prevention Initiative', contact: 'Call 0800 6577 4357', note: 'Toll-free helpline' },
    { region: 'NG', name: 'Mentally Aware Nigeria (MANI)', contact: 'Text/WhatsApp support line', note: 'Youth-focused support' },
  ];
  if (region === 'US') return us;
  if (region === 'NG') return ng;
  return [...us, ...ng];
}

/**
 * The calm in-conversation response. The companion does not vanish or alarm.
 * It stays, acknowledges, and offers help as a persistent inline element.
 * Copy here is placeholder pending professional review (gate).
 */
export function crisisInlineMessage(level: CrisisLevel): string {
  if (level === 'acute') {
    return (
      "I'm really glad you told me that, and I'm staying right here with you. " +
      "What you're feeling is heavy and you should not carry it alone. " +
      "If you're in immediate danger, please reach the help below now — and " +
      "we can keep talking while you do."
    );
  }
  return (
    "That sounds genuinely hard, and I don't want to gloss over it. I'm here. " +
    "If it would help to talk to a person tonight, this is always available — " +
    "and either way, tell me more, I'm listening."
  );
}

/**
 * Whether the calm UI may render the reviewed crisis experience.
 * When the gate is closed we still show help (a person's safety overrides a
 * gate) but flag it as pre-review so it is never mistaken for the final copy.
 */
export function crisisExposureAllowed(): boolean {
  return Gates.crisisReviewed;
}
