/**
 * Safety gates. These encode the CEO-plan HARD GATES in code.
 *
 * Crisis copy/routing and the health domain are blocked from ANY user exposure
 * until a qualified professional / legal+clinical review signs off. The flags
 * default false. Flipping them true without that sign-off violates the
 * approved plan — the gate is here so that violation has to be deliberate and
 * visible, never accidental.
 */
const truthy = (v: string | undefined) => v === 'true' || v === '1';

export const Gates = {
  /** Crisis detection + escalation copy reviewed by a mental-health professional. */
  crisisReviewed: truthy(process.env.EXPO_PUBLIC_GATE_CRISIS_REVIEWED),
  /** Health domain: legal disclaimer + navigation framing + clinical red-flag set cleared. */
  healthCleared: truthy(process.env.EXPO_PUBLIC_GATE_HEALTH_CLEARED),
} as const;

export function gateNotice(which: 'crisis' | 'health'): string {
  if (which === 'crisis') {
    return (
      'Crisis support is being reviewed by a mental-health professional before ' +
      'it goes live. Until then, if you are in danger or thinking about harming ' +
      'yourself, please contact local emergency services or a crisis line now.'
    );
  }
  return (
    'Health mode is not open yet. It ships only after legal and clinical review ' +
    'of every disclaimer and the red-flag set. This is intentional, not a bug.'
  );
}
