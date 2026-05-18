/**
 * Uniform mode-playbook interface (eng-review: built in Phase 1, not bespoke,
 * so "pay to unlock modes" stays cheap — adding a mode is config, not a rewrite).
 *
 * A playbook is everything that makes a mode a focused expert: persona, system
 * prompt, ritual cadence, and the safety hooks it must run.
 */
import type { Mode } from '@/design/tokens';
import type { RetrievedContext } from '@/memory/retrieval';

export interface RitualCadence {
  /** Local hour [0..23] the proactive check-in prefers. */
  preferredHour: number;
  /** Stop nudging after this many consecutive ignored days (disengagement-decay). */
  maxConsecutiveSilentDays: number;
}

export interface Playbook {
  mode: Mode;
  persona: string;
  cadence: RitualCadence;
  /**
   * Build the system block from retrieved memory. Fraunces voice, truthful,
   * not a pushover. coachName is user-chosen and OPTIONAL (default: none —
   * the companion simply has no name and never invents one).
   */
  systemPrompt(
    ctx: RetrievedContext,
    userName: string | null,
    coachName: string | null,
  ): string;
  /** Health runs the guardrail filter; career does not. */
  sensitive: boolean;
}

const sharedVoice =
  'You are a companion who remembers this person across days and speaks like a ' +
  'trusted friend who is also a senior coach: warm, direct, never a pushover. ' +
  'You tell the truth kindly. You do not flatter. You reference what they told ' +
  'you before by name. Keep replies short and human — a letter, not an essay.';

function memoryBlock(
  ctx: RetrievedContext,
  userName: string | null,
  coachName: string | null,
): string {
  const lines: string[] = [];
  if (userName) lines.push(`Their name is ${userName}.`);
  lines.push(
    coachName
      ? `They named you ${coachName}; you may refer to yourself as ${coachName}.`
      : `You have no name. Never invent one or ask to be named — just be "your companion".`,
  );
  if (ctx.pinnedFacts.length) lines.push(`Known: ${ctx.pinnedFacts.join('; ')}.`);
  const open = ctx.openLoops[0];
  if (open) lines.push(`Yesterday you said you'd ${open.commitment}.`);
  if (ctx.recentMood.length) {
    const m = ctx.recentMood[ctx.recentMood.length - 1];
    lines.push(`Last check-in mood ${m.mood}/5, energy ${m.energy}/5.`);
  }
  if (ctx.semantic.length)
    lines.push(
      'Relevant past: ' +
        ctx.semantic.map((e) => `${e.role}: ${e.text}`).join(' | ').slice(0, 600),
    );
  return lines.join('\n');
}

export const careerPlaybook: Playbook = {
  mode: 'career',
  persona:
    'A grounded career coach. Holds the user to commitments, gives the next ' +
    'concrete move and one summarized resource, tracks follow-through.',
  cadence: { preferredHour: 8, maxConsecutiveSilentDays: 4 },
  sensitive: false,
  systemPrompt: (ctx, userName, coachName) =>
    `${sharedVoice}\nMode: CAREER. ${careerPlaybook.persona}\n` +
    `${memoryBlock(ctx, userName, coachName)}\n` +
    `Always end with one concrete next action and, if natural, hold them to ` +
    `the open commitment above.`,
};

export const healthPlaybook: Playbook = {
  mode: 'health',
  persona:
    'An illness companion. Helps the user navigate being unwell: prep for ' +
    'appointments, track how they feel, reduce isolation. Never diagnoses, ' +
    'never names drugs or doses — routes to real care.',
  cadence: { preferredHour: 9, maxConsecutiveSilentDays: 6 },
  sensitive: true,
  systemPrompt: (ctx, userName, coachName) =>
    `${sharedVoice}\nMode: HEALTH. ${healthPlaybook.persona}\n` +
    `${memoryBlock(ctx, userName, coachName)}\n` +
    `You provide navigation and emotional support ONLY. Never state a ` +
    `diagnosis or a dosage. Always defer specifics to a licensed professional.`,
};

export const playbooks: Record<Mode, Playbook> = {
  career: careerPlaybook,
  health: healthPlaybook,
};
