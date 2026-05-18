/**
 * Turn orchestration — the engine entrypoint the UI calls.
 *
 * Pipeline (order matters; safety is engine-layer, not bolted on):
 *   classify crisis → retrieve memory → build system → completeSafe →
 *   health guardrail (if sensitive) → record risk event → persist episodic +
 *   embeddings → extract open-loop resolution / arc moments.
 */
import type { Mode } from '@/design/tokens';
import { completeSafe } from '@/llm/integrity';
import { embed, retrieve } from '@/memory/retrieval';
import { newId, type EpisodicEntry } from '@/memory/schema';
import { getStore } from '@/memory/store';
import {
  classifyCrisis,
  crisisInlineMessage,
  type CrisisLevel,
} from '@/safety/crisis';
import { guardHealthReply } from '@/safety/healthGuardrails';
import { Safety } from '@/safety/observability';
import { playbooks } from './playbook';
import { getProfile, resolveCoachName } from '@/profile';

export interface TurnResult {
  reply: string;
  crisis: CrisisLevel;
  deferred: boolean;
  /** UI renders the calm inline crisis element when set. */
  crisisInline: string | null;
}

export async function runTurn(
  mode: Mode,
  userText: string,
  userName: string | null,
): Promise<TurnResult> {
  const store = await getStore();

  if (Safety.isKilled(mode)) {
    return {
      reply:
        "I've paused this mode for a moment to keep things safe. Please check " +
        'back shortly.',
      crisis: 'none',
      deferred: true,
      crisisInline: null,
    };
  }

  const crisis = classifyCrisis(userText);
  const pb = playbooks[mode];

  // Persist the user's turn first (with embedding) so memory is never lost.
  const userEntry: EpisodicEntry = {
    id: newId(),
    mode,
    role: 'user',
    text: userText,
    createdAt: Date.now(),
    embedding: await embed(userText),
  };
  await store.addEpisodic(userEntry);

  const ctx = await retrieve(mode, userText);
  const coachName = resolveCoachName(await getProfile(), mode);
  const system = pb.systemPrompt(ctx, userName, coachName);

  const safe = await completeSafe(
    [
      { role: 'system', content: system },
      { role: 'user', content: userText },
    ],
    { sensitive: pb.sensitive, maxRetries: 1 },
  );

  let reply = safe.text;
  let redFlag = false;

  if (pb.sensitive) {
    const guarded = guardHealthReply(userText, reply);
    reply = guarded.text;
    redFlag = guarded.redFlag;
  }

  // Crisis overrides the conversational reply with the calm inline experience,
  // but the companion still stays present (not a takeover).
  const crisisInline = crisis !== 'none' ? crisisInlineMessage(crisis) : null;

  // Runtime safety: every turn is scored + logged; risky turns flag a human.
  Safety.record({
    mode,
    crisis,
    redFlag,
    deferred: safe.deferred,
    excerpt: userText.slice(0, 80),
  });

  const companionText = crisisInline ?? reply;
  await store.addEpisodic({
    id: newId(),
    mode,
    role: 'companion',
    text: companionText,
    createdAt: Date.now(),
    embedding: await embed(companionText),
  });

  return { reply: companionText, crisis, deferred: safe.deferred, crisisInline };
}
