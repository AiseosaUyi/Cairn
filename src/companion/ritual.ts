/**
 * The daily proactive ritual + disengagement-decay (eng-review locked).
 *
 * The ritual is the core loop: it reaches out first, references yesterday's
 * specific commitment, asks one sharp question, logs mood. Disengagement-decay
 * (design-review locked behavioral spec): if the user goes silent, the
 * companion eases off with grace — it does NOT nag a struggling person. After
 * `maxConsecutiveSilentDays` it stops pushing and waits, warmly, for them.
 */
import type { Mode } from '@/design/tokens';
import { getStore } from '@/memory/store';
import { playbooks } from './playbook';

const DAY = 86_400_000;

export interface RitualDecision {
  /** Should the proactive check-in fire now? */
  fire: boolean;
  /** When suppressed by decay, the companion's posture toward the user. */
  posture: 'fire' | 'gentle' | 'waiting';
  reason: string;
}

/** Days since the user last sent anything in this mode. */
async function silentDays(mode: Mode): Promise<number> {
  const snap = await (await getStore()).snapshot(mode);
  const lastUser = [...snap.episodic]
    .filter((e) => e.role === 'user')
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!lastUser) return 0;
  return Math.floor((Date.now() - lastUser.createdAt) / DAY);
}

async function firedToday(mode: Mode): Promise<boolean> {
  const snap = await (await getStore()).snapshot(mode);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return snap.episodic.some(
    (e) => e.role === 'companion' && e.createdAt >= startOfDay.getTime(),
  );
}

export async function evaluateRitual(
  mode: Mode,
  now = new Date(),
): Promise<RitualDecision> {
  const cadence = playbooks[mode].cadence;
  if (await firedToday(mode))
    return { fire: false, posture: 'waiting', reason: 'already checked in today' };

  const hour = now.getHours();
  const silent = await silentDays(mode);

  // Disengagement-decay: never nag. Past the threshold, stop pushing and wait.
  if (silent > cadence.maxConsecutiveSilentDays) {
    return {
      fire: false,
      posture: 'waiting',
      reason:
        `silent ${silent}d > ${cadence.maxConsecutiveSilentDays}d — backing off ` +
        `with grace, not guilt; the door stays open`,
    };
  }

  // Within window but a few days quiet: softer, no streak pressure.
  if (silent >= 2) {
    return {
      fire: hour >= cadence.preferredHour,
      posture: 'gentle',
      reason: `${silent}d quiet — reach out gently, acknowledge the gap, no guilt`,
    };
  }

  return {
    fire: hour >= cadence.preferredHour,
    posture: 'fire',
    reason:
      hour >= cadence.preferredHour
        ? 'within cadence, normal check-in'
        : `before preferred hour (${cadence.preferredHour}:00)`,
  };
}

/** The opening line tone the UI/turn should use given the decay posture. */
export function openingHint(posture: RitualDecision['posture']): string {
  switch (posture) {
    case 'gentle':
      return "It's been a few days. No pressure at all — I just wanted to be here.";
    case 'waiting':
      return "Whenever you're ready. I'm not going anywhere.";
    case 'fire':
    default:
      return '__RITUAL__';
  }
}
