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
import type { LlmMessage } from '@/llm/provider';
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
import {
  getActiveGoal,
  type GoalProposal,
  type ProposalFraming,
  type GoalIntent,
  type PathUpdate,
  type PathOp,
} from '@/companion/goals';
import { findCharacter } from '@/companion/characters';

export interface TurnResult {
  reply: string;
  crisis: CrisisLevel;
  deferred: boolean;
  /** UI renders the calm inline crisis element when set. */
  crisisInline: string | null;
  /** Agent-emitted "lock this in as a goal" suggestion, when the
   *  conversation reached goal-shape. UI renders as an inline chip. */
  proposal: GoalProposal | null;
  /** Agent-emitted fine-grained edits to the active goal's path
   *  (add/complete/skip/remove/reschedule/rename tasks). */
  pathUpdate: PathUpdate | null;
}

const PROPOSAL_FENCE_RE = /```goal-proposal\s*([\s\S]*?)```/i;
const PATH_UPDATE_FENCE_RE = /```path-update\s*([\s\S]*?)```/i;

const VALID_INTENTS: GoalIntent[] = [
  'land-senior', 'get-promo', 'negotiate', 'switch', 'first-job',
  'founder', 'real-feedback', 'improve-areas', 'stay-valuable',
  'sense-next', 'custom',
];
const VALID_FRAMINGS: ProposalFraming[] = ['create', 'update', 'replace'];

/** Pull the agent's goal-proposal JSON block out of the reply. Returns
 *  the proposal + the cleaned reply (block stripped). Resilient to
 *  malformed JSON — if anything's off, returns no proposal and the
 *  original reply minus the malformed block. */
function extractProposal(reply: string): { reply: string; proposal: GoalProposal | null } {
  const match = reply.match(PROPOSAL_FENCE_RE);
  if (!match) return { reply, proposal: null };
  const cleaned = reply.replace(PROPOSAL_FENCE_RE, '').trim();
  try {
    const obj = JSON.parse(match[1].trim());
    if (
      typeof obj.title === 'string' && obj.title.trim().length > 0 &&
      typeof obj.context === 'string' &&
      typeof obj.horizon === 'string' &&
      VALID_INTENTS.includes(obj.intent) &&
      VALID_FRAMINGS.includes(obj.framing)
    ) {
      return {
        reply: cleaned,
        proposal: {
          title: obj.title.trim(),
          intent: obj.intent,
          context: obj.context.trim(),
          horizon: obj.horizon.trim(),
          framing: obj.framing,
        },
      };
    }
  } catch {
    /* fall through — invalid JSON, drop the block, no proposal */
  }
  return { reply: cleaned, proposal: null };
}

const VALID_OP_KINDS: PathOp['kind'][] = [
  'add-task',
  'complete-task',
  'skip-task',
  'remove-task',
  'reschedule-task',
  'rename-phase',
  'reorder-tasks',
];

/** Pull the agent's path-update block out of the reply. Same shape as
 *  the proposal parser — validates op kinds, drops malformed entries
 *  silently, returns null on total failure. */
function extractPathUpdate(reply: string): { reply: string; pathUpdate: PathUpdate | null } {
  const match = reply.match(PATH_UPDATE_FENCE_RE);
  if (!match) return { reply, pathUpdate: null };
  const cleaned = reply.replace(PATH_UPDATE_FENCE_RE, '').trim();
  try {
    const obj = JSON.parse(match[1].trim());
    if (
      typeof obj.rationale === 'string' &&
      Array.isArray(obj.operations) &&
      obj.operations.length > 0
    ) {
      const ops = obj.operations.filter(
        (o: unknown): o is PathOp =>
          !!o && typeof o === 'object' && VALID_OP_KINDS.includes((o as PathOp).kind),
      );
      if (ops.length > 0) {
        return { reply: cleaned, pathUpdate: { rationale: obj.rationale.trim(), operations: ops } };
      }
    }
  } catch {
    /* fall through */
  }
  return { reply: cleaned, pathUpdate: null };
}

/**
 * Prior turns from the same chat session. Caller passes the conversation
 * up to (but NOT including) the current user message. Limited to
 * `MAX_HISTORY` to keep token costs bounded.
 */
export interface ChatTurn {
  role: 'user' | 'companion';
  text: string;
}

const MAX_HISTORY = 12; // 6 back-and-forth turns

export async function runTurn(
  mode: Mode,
  userText: string,
  userName: string | null,
  history: ChatTurn[] = [],
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
      proposal: null,
      pathUpdate: null,
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
  const profile = await getProfile();
  const coachName = resolveCoachName(profile, mode);
  const goal = await getActiveGoal();
  const character = findCharacter(profile.companionId);
  const system = pb.systemPrompt({ ctx, profile, goal, character, userName, coachName });

  // Build the LLM message list with REAL conversation history.
  //   [system, ...recent prior turns, current user message]
  // Without this the model lost context between turns ("years of
  // experience?" → "8" → "what is 8?" — fixed 2026-05-27).
  const priorMessages: LlmMessage[] = history.slice(-MAX_HISTORY).map((t) => ({
    role: t.role === 'companion' ? 'assistant' : 'user',
    content: t.text,
  }));

  const safe = await completeSafe(
    [
      { role: 'system', content: system },
      ...priorMessages,
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

  // Parse the agent-emitted goal-proposal and path-update blocks. The
  // prompt says these are mutually exclusive per reply, but parse both
  // defensively in case the model emits both.
  const afterProposal = extractProposal(reply);
  reply = afterProposal.reply;
  const afterPath = extractPathUpdate(reply);
  reply = afterPath.reply;
  const proposal = afterProposal.proposal;
  const pathUpdate = afterPath.pathUpdate;

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

  return {
    reply: companionText,
    crisis,
    deferred: safe.deferred,
    crisisInline,
    proposal,
    pathUpdate,
  };
}
