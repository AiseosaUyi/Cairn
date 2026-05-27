/**
 * Goals + Paths data layer.
 *
 * A user states a career goal ("transition into product design", "promotion
 * to senior engineer", "land a job at a YC startup"). The AI agent
 * researches the goal and generates a Path: a sequence of weekly Phases,
 * each phase a small set of Tasks. The user lives in Today (tasks for
 * today), drills into Goals (the full path), opens Chat for free-form.
 *
 * v0 (this pass): in-memory mock so screens are believable end-to-end.
 * Real agent + persistence later. The store interface stays compatible
 * with the existing `MemoryStore` pattern in `src/memory/store.ts`.
 */

export type TaskStatus = 'todo' | 'done' | 'skipped';

/**
 * Task "kind" — drives which Workspace affordances are relevant.
 *
 *   write    → produce a written artifact. Workspace shows Template +
 *              Examples + Review tabs. Most "draft / outline / list"
 *              tasks land here.
 *   review   → review external work (own portfolio, resume, LinkedIn,
 *              draft). Workspace shows Submit URL/Paste + Review tab.
 *   research → external research task. Workspace shows Examples +
 *              capture notes.
 *   outreach → write + send. Workspace shows Template (DM/email
 *              scripts) + Review.
 *   reflect  → introspection task. Workspace shows Coach (per-task
 *              chat) + capture notes.
 *   schedule → calendar block / time-protect. Workspace shows
 *              .ics download + Coach.
 *   do       → catch-all. Workspace shows Coach only.
 */
export type TaskKind =
  | 'write'
  | 'review'
  | 'research'
  | 'outreach'
  | 'reflect'
  | 'schedule'
  | 'do';

export interface Task {
  id: string;
  title: string;
  /** One-line context the AI agent surfaces ("Why this matters"). */
  why?: string;
  /** Estimated effort, freeform. "20 min", "Today", "This week". */
  effort?: string;
  status: TaskStatus;
  /** ISO date the task is scheduled for. */
  dueOn: string;
  /** Drives which Task Workspace affordances appear. Defaults to 'do'. */
  kind?: TaskKind;
}

export interface Phase {
  id: string;
  title: string;
  /** "Week 1", "Weeks 3-4", "Foundation", "Pre-interview". */
  meta: string;
  /** Short outcome statement — what changes for the user after this phase. */
  outcome: string;
  tasks: Task[];
  /** Done if every task is done or skipped. */
  status: 'upcoming' | 'in_progress' | 'done';
}

export type GoalStatus = 'active' | 'archived' | 'completed';

export interface Goal {
  id: string;
  /** The stated goal in the user's own words. */
  title: string;
  /** The agent's restated framing — sharper, action-oriented. */
  framing: string;
  /** Free-form context the user provided (current role, constraints, why). */
  context: string;
  /** Target horizon, freeform. "12 weeks", "By end of Q3". */
  horizon: string;
  /** ISO date when the goal was set. */
  startedAt: string;
  /** ISO date when the goal was archived/completed — null while active. */
  endedAt: string | null;
  /** One-active-goal invariant: only one Goal can have status='active'
   *  at a time. Switching active goals archives the previous one. */
  status: GoalStatus;
  phases: Phase[];
}

// ---------------------------------------------------------------------------
// Mock data — a believable end-to-end example so screens render meaningfully
// in dev. Replaced by the real agent-generated path once the backend ships.
// ---------------------------------------------------------------------------

const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const mockGoal: Goal = {
  id: 'g_demo',
  title: 'Land a senior product role at a Series B / C startup',
  framing:
    'Position yourself as the obvious senior PM hire for an 80-200 person product-led startup within 12 weeks.',
  context:
    'Currently PM at a 30-person seed-stage company, 4 years total PM experience, strongest in 0→1 work. Want sharper interview answers, a stronger portfolio, and a warm pipeline.',
  horizon: '12 weeks',
  startedAt: daysAgo(11),
  endedAt: null,
  status: 'active',
  phases: [
    {
      id: 'p_1',
      title: 'Foundation — sharpen the story',
      meta: 'Weeks 1-2',
      outcome:
        'A senior-grade narrative of your last two years that holds up under hostile interview questions.',
      status: 'done',
      tasks: [
        {
          id: 't_1_1',
          title: 'Draft three project deep-dives in STAR format',
          why: 'Senior PM interviews lean hard on past-project depth.',
          effort: '90 min',
          status: 'done',
          dueOn: daysAgo(10),
        },
        {
          id: 't_1_2',
          title: 'List five hostile questions you fear most — write the answers',
          why: 'Pre-answering kills the freeze.',
          effort: '45 min',
          status: 'done',
          dueOn: daysAgo(8),
        },
        {
          id: 't_1_3',
          title: 'Rewrite LinkedIn headline + About to lead with the strongest project',
          effort: '30 min',
          status: 'done',
          dueOn: daysAgo(6),
        },
      ],
    },
    {
      id: 'p_2',
      title: 'Portfolio — show, not tell',
      meta: 'Weeks 3-5',
      outcome:
        'A 3-case portfolio site that demonstrates senior judgment, not just shipped features.',
      status: 'in_progress',
      tasks: [
        {
          id: 't_2_1',
          title: 'Pick the three strongest case studies (judgment > polish)',
          why: 'Senior reviewers want to see how you decide, not how you Figma.',
          effort: '30 min',
          status: 'done',
          dueOn: daysAgo(3),
        },
        {
          id: 't_2_2',
          title: 'Outline case #1: the metric, the bet, the result, the regret',
          effort: '60 min',
          status: 'todo',
          dueOn: today(),
        },
        {
          id: 't_2_3',
          title: 'Send the outline to two senior PMs for hostile feedback',
          why: 'A friendly read tells you nothing.',
          effort: '15 min',
          status: 'todo',
          dueOn: today(),
        },
        {
          id: 't_2_4',
          title: 'Block 90 min tomorrow morning for case #1 first draft',
          effort: '5 min',
          status: 'todo',
          dueOn: today(),
        },
      ],
    },
    {
      id: 'p_3',
      title: 'Pipeline — warm intros, not cold applies',
      meta: 'Weeks 6-9',
      outcome:
        'Five conversations at companies that are actually a fit, sourced through people who already vouch for you.',
      status: 'upcoming',
      tasks: [
        {
          id: 't_3_1',
          title: 'Build a target list of 20 Series B/C product-led companies',
          effort: '60 min',
          status: 'todo',
          dueOn: daysFromNow(15),
        },
        {
          id: 't_3_2',
          title: 'For each: identify one person in your second-degree network',
          effort: '90 min',
          status: 'todo',
          dueOn: daysFromNow(18),
        },
      ],
    },
    {
      id: 'p_4',
      title: 'Close — convert conversations to offers',
      meta: 'Weeks 10-12',
      outcome:
        'Two competing offers and the leverage to negotiate the role you actually want.',
      status: 'upcoming',
      tasks: [],
    },
  ],
};

// Dual-mode store: in-memory cache keyed by user id ('guest' when not
// signed in). On sign-in/out the uid key changes → cache invalidates →
// next read pulls from the right source (Supabase or local-only).
//
// Guest persistence: instead of evaporating on browser refresh, guest
// goals are mirrored to localStorage under GUEST_KEY. The first
// ensureLoaded() rehydrates from there. Any mutation writes back.
// This was the source of "refresh wipes my progress" complaints.
let _goals: Goal[] = [];
let _goalsUid: string | 'guest' | null = null;

const GUEST_KEY = 'cairn.guest.goals.v1';

function readGuest(): Goal[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Goal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuest(goals: Goal[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(goals));
  } catch {
    /* quota / private mode / SSR — silently ignore */
  }
}

/** Persist the local cache for guest users. Called after every mutation
 *  so a refresh resumes where the user left off. */
function persistGuestIfNeeded(): void {
  if (_goalsUid === 'guest') writeGuest(_goals);
}

/** Reconcile phase statuses against task statuses. Catches drift from:
 *    - older saved state (predating activateNextPhase)
 *    - manual edits in another session
 *    - any state that says "phase 1 done, phase 2 upcoming" but should
 *      have phase 2 promoted to in_progress
 *  Idempotent — safe to run on every load. */
function repairGoalPhases(goal: Goal): boolean {
  let changed = false;
  for (let i = 0; i < goal.phases.length; i++) {
    const phase = goal.phases[i];
    if (phase.tasks.length > 0) {
      const allResolved = phase.tasks.every((t) => t.status !== 'todo');
      const anyDone = phase.tasks.some((t) => t.status === 'done');
      const target = allResolved ? 'done' : anyDone ? 'in_progress' : phase.status;
      if (phase.status !== target) {
        phase.status = target;
        changed = true;
      }
    }
    // If this phase is done and the next is still upcoming, promote it.
    if (phase.status === 'done') {
      const next = goal.phases[i + 1];
      if (next && next.status === 'upcoming') {
        next.status = 'in_progress';
        const todayStr = today();
        if (next.tasks.length === 0) {
          next.tasks = starterTasksFor(next);
        } else {
          for (const t of next.tasks) {
            if (t.status === 'todo' && t.dueOn > todayStr) t.dueOn = todayStr;
          }
        }
        changed = true;
      }
    }
  }
  return changed;
}

async function ensureLoaded(): Promise<void> {
  const { currentUserId, cloudListGoals } = await import('@/data/sync');
  const uid = (await currentUserId()) ?? 'guest';
  if (_goalsUid === uid) return;

  if (uid === 'guest') {
    // Guest mode: rehydrate from localStorage so a refresh doesn't wipe.
    // When transitioning from signed-in → guest, drop cloud goals first.
    if (_goalsUid !== null && _goalsUid !== 'guest') _goals = [];
    if (_goals.length === 0) _goals = readGuest();
  } else {
    // Signed in: pull from cloud, passing current local goals so the
    // sync layer can migrate them up on first sign-in if cloud is empty.
    _goals = await cloudListGoals(uid, _goals);
  }

  // Reconciliation: catch any stale phase status from saved state.
  let repairs = 0;
  for (const g of _goals) {
    if (repairGoalPhases(g)) repairs += 1;
  }
  if (repairs > 0) {
    if (uid === 'guest') {
      writeGuest(_goals);
    } else {
      // Push repaired goals back to cloud so the fix sticks across
      // devices. Best-effort — failures are non-fatal.
      const { cloudUpsertGoal } = await import('@/data/sync');
      for (const g of _goals) await cloudUpsertGoal(uid, g).catch(() => null);
    }
  }

  _goalsUid = uid;
}

export async function listGoals(): Promise<Goal[]> {
  await ensureLoaded();
  return _goals;
}

/** The single active goal — null if no goal is locked in. Enforces the
 *  one-active-goal invariant: never returns more than one. */
export async function getActiveGoal(): Promise<Goal | null> {
  await ensureLoaded();
  return _goals.find((g) => g.status === 'active') ?? null;
}

export async function listArchivedGoals(): Promise<Goal[]> {
  await ensureLoaded();
  return _goals.filter((g) => g.status !== 'active');
}

/** Drop the in-memory cache. Auth-state change hooks call this so the
 *  next read pulls from the now-correct source. */
export function resetGoalsCache(): void {
  _goals = [];
  _goalsUid = null;
}

/** Push a goal to cloud (if signed in) OR localStorage (if guest) and
 *  return the possibly-rewritten version (cloud may assign a UUID).
 *  Every mutation routes through here, so this is the single chokepoint
 *  that keeps persistence honest. */
async function syncGoal(g: Goal): Promise<Goal> {
  const { currentUserId, cloudUpsertGoal } = await import('@/data/sync');
  const uid = await currentUserId();
  if (!uid) {
    persistGuestIfNeeded();
    return g;
  }
  const saved = await cloudUpsertGoal(uid, g);
  return saved ?? g;
}

/** Archive the current active goal (if any). Returns the archived id. */
export async function archiveActiveGoal(reason: 'replaced' | 'completed' | 'abandoned' = 'replaced'): Promise<string | null> {
  await ensureLoaded();
  const active = _goals.find((g) => g.status === 'active');
  if (!active) return null;
  active.status = reason === 'completed' ? 'completed' : 'archived';
  active.endedAt = new Date().toISOString().slice(0, 10);
  await syncGoal(active);
  return active.id;
}

/** Merge new context into the active goal. Optionally regenerate phases
 *  AFTER the currently-in-progress phase (don't destroy past work). */
export async function updateActiveGoal(patch: {
  title?: string;
  contextAppend?: string;
  horizon?: string;
  intent?: GoalIntent;
}): Promise<Goal | null> {
  await ensureLoaded();
  const active = _goals.find((g) => g.status === 'active');
  if (!active) return null;
  if (patch.title) active.title = patch.title;
  if (patch.horizon) active.horizon = patch.horizon;
  if (patch.contextAppend) {
    active.context = active.context
      ? `${active.context}\n\n${patch.contextAppend}`
      : patch.contextAppend;
  }
  if (patch.intent) {
    // Regenerate ONLY the phases beyond the current in-progress one.
    // Completed/in-progress phases stay intact so past work isn't lost.
    const lockedIdx = active.phases.findIndex((p) => p.status === 'in_progress');
    const keep = lockedIdx >= 0 ? active.phases.slice(0, lockedIdx + 1) : [];
    const fresh = INTENT_TEMPLATES[patch.intent]();
    active.phases = [...keep, ...fresh.slice(keep.length)];
  }
  await syncGoal(active);
  return active;
}

// ---------------------------------------------------------------------------
// Path generation — intent-aware.
//
// Each high-level intent has its own phase template (because the path for
// "get promoted at my current job" looks NOTHING like the path for "make
// the leap into founding"). When the template id is passed directly from
// the setup walkthrough, we use it. Otherwise we infer it from the goal
// title via keyword matching.
//
// This is mock generation that's smart enough to feel tailored. The real
// LLM seam is `generatePathWithLLM` below — when EXPO_PUBLIC_LLM_PROVIDER
// is set to a real provider and a key is available, that path is taken
// instead. Currently the HTTP adapter throws; we fall back to mock cleanly.
// ---------------------------------------------------------------------------

export type GoalIntent =
  | 'land-senior'
  | 'get-promo'
  | 'negotiate'
  | 'switch'
  | 'first-job'
  | 'founder'
  | 'real-feedback'
  | 'improve-areas'
  | 'stay-valuable'
  | 'sense-next'
  | 'custom';

function inferIntent(title: string): GoalIntent {
  const t = title.toLowerCase();

  // FOUNDER — strict. Must be about starting THEIR OWN thing, not joining
  // as a "founding <role>" (which is just employee-#1 at a young company —
  // that's a senior job-search, not founding). Previous regex `/found/`
  // matched "founding designer" → wrong path. Tightened to word-boundary
  // \bfounder\b + explicit phrases, AND excludes "founding <role>" forms.
  if (
    (/\bfounder\b|first[-\s]*time\s+founder|start\s+(my\s*own|a)\s+(company|startup|business)|build\s+my\s+(own\s+)?(startup|company|business)|(?:leap|jump|move)\s+into\s+founding\b/.test(t)) &&
    !/founding\s+(designer|engineer|pm|product\s*manager|developer|member|employee|team)/.test(t)
  ) return 'founder';

  // FOUNDING-<ROLE> — explicitly a job search for the first-N hires at a
  // young company. Belongs in land-senior, not founder. Caught here
  // before the more general land-senior pattern so the wording around
  // "role" doesn't have to match.
  if (/founding\s+(designer|engineer|pm|product\s*manager|developer)/.test(t))
    return 'land-senior';

  if (/(promot|level\s*up|next\s*level)/.test(t)) return 'get-promo';
  if (/(negotiat|raise|offer\s*letter|comp\b|salary)/.test(t)) return 'negotiate';
  if (/(switch|pivot|transition|move\s+(into|from)|change\s+industr|new\s+function)/.test(t))
    return 'switch';
  if (/(first\s*job|break\s+into|land\s+my\s+first|grad(uate)?)/.test(t)) return 'first-job';
  if (/(honest|real\s*(feedback|review|analysis)|manager.?grade|performance\s*review)/.test(t))
    return 'real-feedback';
  if (/(stay\s*valuable|future\s*-?\s*proof|relevant\s+over\s+time|skill[-\s]*up)/.test(t))
    return 'stay-valuable';
  if (/(what'?s?\s*next|next\s*chapter|figure\s+out\s+what|not\s+sure\s+what)/.test(t))
    return 'sense-next';
  if (/^\s*(improve|focus|fix\s*my|weak|gap)\b/.test(t)) return 'improve-areas';

  // LAND-SENIOR — default for job-search-shaped goals. Widened to catch
  // "get hired", "get a new job", "find a role", "looking for a job" etc.
  if (
    /\b(land|hired|find|get|need|want|looking\s+for)\b.*\b(job|role|position|offer|gig)\b/.test(t) ||
    /\b(new|next|senior|fulltime|full[-\s]?time|part[-\s]?time|contract)\b.*\b(job|role|position)\b/.test(t) ||
    /\b(senior\s+role|new\s+role|land\s+a\s+role)\b/.test(t)
  ) return 'land-senior';

  return 'custom';
}

/** Intent-keyed templates. Each returns the full 4-phase shape with
 *  TASKS PER PHASE — phases 2-4 are no longer empty stubs. Each task is
 *  tagged with a `kind` so the Workspace shows the right tools.
 *
 *  Phase-1 tasks get dueOn=today; later phases get future dueOn dates
 *  that the activation logic in setTaskStatus pulls to today when the
 *  phase is reached, so the user is never staring at "due in 3 weeks". */
const INTENT_TEMPLATES: Record<GoalIntent, () => Phase[]> = {
  'land-senior': () => [
    p1('Sharpen the story', 'Weeks 1–2', 'A senior-grade narrative of your last two years that holds up under hostile questions.', [
      task('Draft three project deep-dives in STAR format', 'Most senior interviews lean hard on past-project depth.', '90 min', today(), 'write'),
      task('List the five hostile questions you fear most — write the answers', 'Pre-answering kills the freeze.', '45 min', today(), 'write'),
      task('Rewrite LinkedIn headline + About to lead with the strongest project', 'Recruiters scan headline first; treat it as the hook.', '30 min', daysFromNow(2), 'write'),
    ]),
    upcoming('Portfolio — show, not tell', 'Weeks 3–5', 'Three case studies that prove judgment, not polish.', [
      task('Pick the three strongest case studies (judgment > polish)', 'Senior reviewers want to see how you decide, not how you Figma.', '30 min', daysFromNow(14), 'reflect'),
      task('Outline case #1: the metric, the bet, the result, the regret', 'Naming the regret is the senior move.', '60 min', daysFromNow(15), 'write'),
      task('Send the outline to two senior people for hostile feedback', 'A friendly read tells you nothing.', '15 min', daysFromNow(17), 'outreach'),
      task('Have your portfolio reviewed', 'Specific score across senior dimensions beats vibes feedback.', '30 min', daysFromNow(20), 'review'),
    ]),
    upcoming('Pipeline — warm intros, not cold applies', 'Weeks 6–9', 'Five real conversations sourced through people who already vouch for you.', [
      task('Build a target list of 20 Series B/C companies that fit', 'Casting wide-and-shallow is the cold-apply trap. Pick few; pick well.', '60 min', daysFromNow(35), 'research'),
      task('For each: identify one person in your second-degree network', 'Cold pitches lose. Warm intros win.', '90 min', daysFromNow(38), 'research'),
      task('Send 10 personalised outreach DMs this week', 'Templates are starting points; personalisation is the signal.', '60 min', daysFromNow(42), 'outreach'),
    ]),
    upcoming('Close — convert conversations to offers', 'Weeks 10–12', 'Two competing offers and the leverage to negotiate the one you actually want.', [
      task('Drill answers to the three offers you most expect', 'You will be asked all three; have the answer rehearsed.', '60 min', daysFromNow(65), 'reflect'),
      task('Decide your walk-away number, target, and dream number', 'Going in without these is going in unarmed.', '30 min', daysFromNow(68), 'reflect'),
      task('Write the post-offer reply template (gratitude + question + delay)', 'Never accept on the call. Buy 24 hours.', '20 min', daysFromNow(70), 'write'),
    ]),
  ],
  'get-promo': () => [
    p1('Audit your last 12 months', 'Weeks 1–2', 'A receipts-based read of your impact, scope, and the bar at the next level.', [
      task("Pull every win, metric, and 'thing that wouldn't exist without you'", 'Promo cases live or die on receipts.', '90 min', today(), 'write'),
      task("Read your company's next-level rubric line by line", 'Most people argue their level without knowing the actual bar.', '45 min', today(), 'research'),
      task('Identify two scope expansions you could make in the next 8 weeks', 'Scope at the next level usually means a new surface — name it.', '30 min', daysFromNow(2), 'reflect'),
    ]),
    upcoming('Build the case', 'Weeks 3–5', 'A written promo packet good enough that your manager hands it up unchanged.', [
      task('Draft the promo packet — receipts, scope, level rubric mapped', 'The packet IS the case. Your manager should be able to forward it untouched.', '120 min', daysFromNow(14), 'write'),
      task('Have your packet reviewed against the rubric', 'Self-scoring overrates. Get an honest read before showing your manager.', '30 min', daysFromNow(18), 'review'),
      task('Iterate on weak dimensions', 'Two passes is the minimum; three is closer.', '60 min', daysFromNow(21), 'write'),
    ]),
    upcoming('Stakeholder strategy', 'Weeks 6–8', 'The three people whose support flips this. A plan to earn it.', [
      task('Name the three stakeholders whose vote flips this', 'Promo is often political. Pretending otherwise is naive.', '30 min', daysFromNow(35), 'reflect'),
      task('For each: identify the one thing you could do for them this month', 'Reciprocity beats lobbying.', '45 min', daysFromNow(38), 'research'),
      task('Draft an outreach message to one mentor about the move', undefined, '20 min', daysFromNow(42), 'outreach'),
    ]),
    upcoming('The conversation', 'Weeks 9–12', 'Promo conversation, then the follow-through to get it signed.', [
      task('Schedule the promo conversation with your manager', "Put it on the calendar — vague is the killer here.", '15 min', daysFromNow(60), 'schedule'),
      task('Drill the three hardest objections you expect', 'Pre-answer them; do not improvise live.', '45 min', daysFromNow(63), 'reflect'),
      task('Write the follow-up email recapping the agreement', 'What is not written down does not exist in HR systems.', '30 min', daysFromNow(70), 'write'),
    ]),
  ],
  negotiate: () => [
    p1('Benchmark', 'Week 1', 'Real market data for your role, level, and geography — not anecdote.', [
      task('Pull comp data from levels.fyi, Glassdoor, and 2–3 peers in role', 'Vibes lose negotiations. Numbers win them.', '60 min', today(), 'research'),
      task('Set three numbers: walk-away, target, dream', 'Going in without these is going in unarmed.', '30 min', today(), 'reflect'),
    ]),
    upcoming('Counter strategy', 'Week 2', 'Scripts and frames for the three responses they most likely give.', [
      task('Draft your three counter scripts (yes / push / silence)', "If they say X, you say Y — written, not improvised.", '60 min', daysFromNow(7), 'write'),
      task('Have your scripts reviewed for tone + leverage', 'Negotiation tone is a knife-edge; get a second read.', '20 min', daysFromNow(9), 'review'),
    ]),
    upcoming('Multi-leverage', 'Weeks 3–4', 'Competing offer, internal pressure, or scope ask — the lever that fits.', [
      task('Identify the one form of leverage available to you (offer / scope / time)', 'Most people skip this and rely on hope. Hope is not leverage.', '30 min', daysFromNow(14), 'reflect'),
      task('Make one move that creates that leverage this week', 'Activate intros, ask for the scope expansion, etc.', '45 min', daysFromNow(17), 'outreach'),
    ]),
    upcoming('Land the close', 'Weeks 5–6', 'Counter delivered, response handled, offer signed at the better number.', [
      task('Send the counter (calm, brief, specific)', 'A negotiation email is three lines max.', '20 min', daysFromNow(28), 'outreach'),
      task('Hold silence after sending — do not chase', "Re-pitching weakens you. Let them respond.", '5 min', daysFromNow(29), 'reflect'),
      task('Re-read the final letter line by line before signing', 'Signing bonuses, equity, refresh schedule — read all of it.', '30 min', daysFromNow(35), 'review'),
    ]),
  ],
  switch: () => [
    p1('Define the destination', 'Weeks 1–2', "A sharp picture of the role you're moving INTO — title, scope, the day-to-day.", [
      task('Write the JD of your future role from memory', "If you can't write it, you can't aim at it.", '45 min', today(), 'write'),
      task('Find five people doing that job today — read their LinkedIns end to end', 'Pattern-match the bridge that worked for them.', '60 min', today(), 'research'),
      task('Map the 3–5 skills you\'re missing vs. that role', undefined, '30 min', daysFromNow(2), 'reflect'),
    ]),
    upcoming('Build the bridge', 'Weeks 3–6', 'Real projects or proof points that close the gap your background has.', [
      task('Pick ONE bridge project that proves the missing skill', 'Switchers get hired on proof, not promise.', '30 min', daysFromNow(14), 'reflect'),
      task('Draft a public artifact of that work (post, repo, case study)', "Public > private. Hiring managers Google.", '120 min', daysFromNow(20), 'write'),
      task('Have the artifact reviewed before publishing', 'First drafts read like first drafts. Get a pass.', '20 min', daysFromNow(25), 'review'),
    ]),
    upcoming('Reposition the narrative', 'Weeks 7–8', "Tell your story as if you've been heading here all along — because now you are.", [
      task('Rewrite your About + headline for the new role', "Lead with the destination, not the history.", '45 min', daysFromNow(42), 'write'),
      task('Have your repositioned LinkedIn reviewed', 'Repositioning is high-leverage; get a senior eye.', '20 min', daysFromNow(46), 'review'),
    ]),
    upcoming('First role in', 'Weeks 9–12', "A foot in the door — even if it's smaller than the dream role. Iterate from there.", [
      task('Target 5 companies that hire from your bridge profile', 'A great fit at one beats a poor fit at five.', '60 min', daysFromNow(60), 'research'),
      task('Send 10 personalised outreaches with the bridge artifact', undefined, '90 min', daysFromNow(65), 'outreach'),
    ]),
  ],
  'first-job': () => [
    p1('Make yourself legible', 'Weeks 1–2', 'A presence that the right hiring manager can find and trust.', [
      task('Pick one project to ship publicly that proves you can do the work', 'Resumes lose to proof.', '120 min', today(), 'write'),
      task("Write a one-paragraph 'why me' answer to the top question they'll ask", undefined, '30 min', today(), 'write'),
      task('Have your resume + LinkedIn reviewed', 'You see your own copy too gently. Get an honest score.', '30 min', daysFromNow(3), 'review'),
    ]),
    upcoming('Targeted outreach', 'Weeks 3–6', '20 warm-ish intros into companies actually a fit. Not 200 cold applies.', [
      task('Build a list of 20 companies you would genuinely want to work at', 'Volume hiring funnels reject volume applicants.', '60 min', daysFromNow(14), 'research'),
      task('Find one person at each (alum, LinkedIn 2nd-degree, etc)', 'Cold pitches lose. Warm intros win.', '90 min', daysFromNow(17), 'research'),
      task('Draft + send the first 10 outreaches', "Templates are scaffolding; personalisation is the win.", '120 min', daysFromNow(21), 'outreach'),
    ]),
    upcoming('Interview reps', 'Weeks 7–9', 'Drill the question patterns of your top 3 target companies.', [
      task('Identify the 5 most common question patterns at your top 3 targets', 'Patterns are public. Use Glassdoor + alumni.', '60 min', daysFromNow(45), 'research'),
      task('Run 3 mock interviews with someone honest', 'Mirror-mocks are easy. Real ones expose you.', '3 × 45 min', daysFromNow(52), 'outreach'),
    ]),
    upcoming('Close one', 'Weeks 10–12', 'First offer in hand — the next is much easier.', [
      task('Pre-write your decision criteria before any offer arrives', 'Decide in calm; choose in pressure.', '45 min', daysFromNow(65), 'reflect'),
      task('Draft the 24-hour "thank you, may I think" reply', 'Never accept on the call.', '15 min', daysFromNow(70), 'write'),
    ]),
  ],
  founder: () => [
    p1('Validate the itch', 'Weeks 1–3', 'Honest read on whether this is a hobby idea, a small business, or a real venture wedge.', [
      task('Write the one sentence customer + pain + why now', "If you can't, the idea isn't ready.", '45 min', today(), 'write'),
      task('Talk to 5 potential users — listen, don\'t pitch', "You're testing pain, not selling vision.", '5 × 30 min', daysFromNow(3), 'outreach'),
      task('Decide: kill it, shrink it, or commit harder', 'A decision beats a maybe.', '20 min', daysFromNow(14), 'reflect'),
    ]),
    upcoming('De-risk the bet', 'Weeks 4–6', 'Cut runway, set the kill ceiling, line up the version that survives founder burnout.', [
      task('Write your kill ceiling: months of runway, criteria to stop', 'Founders die of slow bleed, not fast death. Set the line.', '60 min', daysFromNow(21), 'write'),
      task('Cut three monthly expenses this week', 'Burn cut is the cheapest fundraise.', '45 min', daysFromNow(24), 'do'),
      task('Identify the smallest version of the bet that can ship in 4 weeks', "If it's bigger than that you're hiding from the market.", '30 min', daysFromNow(28), 'reflect'),
    ]),
    upcoming('Build the wedge', 'Weeks 7–10', "Ship the smallest thing one customer would pay for. Not the platform — the wedge.", [
      task('Spec the wedge in a one-page doc (what / for whom / not for whom)', 'Naming what you are NOT doing is the discipline.', '60 min', daysFromNow(42), 'write'),
      task('Show the spec to your three closest target users for honest cuts', 'Friends say yes. Honest users cut.', '3 × 30 min', daysFromNow(45), 'outreach'),
      task('Ship the smallest functioning version', 'Shipped > polished.', '5+ days', daysFromNow(56), 'do'),
    ]),
    upcoming('First sale or first hire', 'Weeks 11–14', 'A real signal: a paying customer, or your first believer joining you.', [
      task('Make the explicit ask: "Will you pay $X for this?"', 'Vague usage signal is not money. Money is signal.', '60 min', daysFromNow(70), 'outreach'),
      task('Write the pitch to the one person you want as employee #1', 'Recruiting starts before you have money to pay them.', '45 min', daysFromNow(80), 'write'),
    ]),
  ],
  'real-feedback': () => [
    p1('Self-audit (the unflinching version)', 'Week 1', 'A receipts-based read of your last 90 days — what shipped, what slipped, what you avoided.', [
      task('List every project you touched in the last 90 days + your honest contribution to each', "No softening. No 'we did X' — what did you do.", '60 min', today(), 'write'),
      task('Write the three things you suspect your manager would say if asked privately', "If you don't know, that's the first finding.", '30 min', today(), 'reflect'),
    ]),
    upcoming('Get the outside read', 'Week 2', 'Three people you trust, asked specifically — not vaguely — for their honest take.', [
      task('Draft the specific feedback request to send to three trusted people', 'Vague asks get vague answers. Be specific.', '30 min', daysFromNow(7), 'write'),
      task('Send the three requests', undefined, '15 min', daysFromNow(8), 'outreach'),
      task('Capture verbatim what each said — no editing', "Your filter softens. Capture raw.", '30 min', daysFromNow(11), 'reflect'),
    ]),
    upcoming('Map the gaps', 'Weeks 3–4', "Two or three patterns you can't argue with. The work is in those, not the long list.", [
      task('Pattern-match across the feedback — name 2–3 themes', "Themes beat individual data points.", '45 min', daysFromNow(15), 'reflect'),
      task('Pick the ONE theme you would most want to be different in 90 days', 'Focus beats breadth.', '20 min', daysFromNow(17), 'reflect'),
    ]),
    upcoming('First improvement sprint', 'Weeks 5–8', 'Focused work on the one gap with the most leverage. Re-test honestly at the end.', [
      task('Design a 4-week practice plan for the chosen gap', 'A plan beats a resolution.', '45 min', daysFromNow(28), 'write'),
      task('Re-test the gap with the same people in week 8', 'Closed-loop measurement is rare; do it.', '30 min', daysFromNow(56), 'outreach'),
    ]),
  ],
  'improve-areas': () => [
    p1('Find the lever', 'Week 1', 'The one or two areas where focused work would unlock the biggest jump.', [
      task('Pull your last three pieces of negative feedback — the ones that stung', "Stinging means there's usually truth in it.", '30 min', today(), 'reflect'),
      task("Pick the ONE area you'd most want to be 10× better at in 90 days", 'Focus is the multiplier.', '20 min', today(), 'reflect'),
    ]),
    upcoming('Block the time', 'Weeks 2–4', '3–5 hours/week, recurring, protected. Without this the rest is theatre.', [
      task('Block 3 hours/week on your calendar — recurring', 'Unscheduled improvement does not happen.', '15 min', daysFromNow(7), 'schedule'),
      task('Write the practice plan: drills, real work, review cadence', 'Random reps build random skill.', '60 min', daysFromNow(9), 'write'),
    ]),
    upcoming('Daily practice', 'Weeks 5–10', 'Specific drills, real work that exercises the weak muscle.', [
      task('Find or create three drills for the chosen area', 'Without drills you only get the easy work.', '45 min', daysFromNow(28), 'research'),
      task('Apply the skill in a real, visible piece of current work', 'Drills are scaffolding; real reps are the win.', '5+ hrs', daysFromNow(35), 'do'),
    ]),
    upcoming('Re-test honestly', 'Weeks 11–12', 'Same situations that used to trip you up — measure the actual change.', [
      task('Identify a real situation that previously tripped you', 'Lab tests do not count.', '20 min', daysFromNow(70), 'reflect'),
      task('Run it. Capture honestly what changed and what did not', 'Closed-loop measurement is the discipline.', '30 min', daysFromNow(77), 'reflect'),
    ]),
  ],
  'stay-valuable': () => [
    p1('Scan the field', 'Weeks 1–2', "What's shifting in your role + adjacent roles right now. Not just AI — every real force.", [
      task('Read the last 6 months of senior voices in your field — list the recurring themes', 'Patterns beat predictions.', '90 min', today(), 'research'),
      task('Identify three skills that DOUBLED in market value in the last 18 months', undefined, '45 min', today(), 'research'),
      task('Identify two skills that LOST value (so you stop investing there)', undefined, '30 min', daysFromNow(2), 'reflect'),
    ]),
    upcoming('Pick your bets', 'Weeks 3–4', 'Two skills to go deep on. Not five. Two.', [
      task('Pick the TWO skills you will bet on for 12 weeks', 'Five bets equals zero bets.', '30 min', daysFromNow(14), 'reflect'),
      task('Write a one-page case for each: why this, why now, what proves it', 'Force the reasoning to be legible.', '60 min', daysFromNow(17), 'write'),
    ]),
    upcoming('Learning sprint', 'Weeks 5–10', 'Focused study + real projects that build the muscle, not just the credential.', [
      task('Find a real project at work where the new skill is relevant', 'Courses without application decay in 60 days.', '45 min', daysFromNow(28), 'research'),
      task('Ship something using the new skill — even small', 'Shipped > studied.', '5+ hrs', daysFromNow(42), 'do'),
    ]),
    upcoming('Apply in real work', 'Weeks 11–12', 'Use the new skill on a visible piece of your current job. Make it count.', [
      task('Identify the one visible artifact where the new skill should show', "Make it legible to your manager and skip-level.", '30 min', daysFromNow(70), 'reflect'),
      task('Write a brief post or share-out about what you learned', "Public learning compounds; private learning evaporates.", '60 min', daysFromNow(77), 'write'),
    ]),
  ],
  'sense-next': () => [
    p1('Map where you actually are', 'Weeks 1–2', "Honest read on your current life, work, energy, money — not the polite version.", [
      task('Write a one-page state-of-things: work, money, energy, relationships, what you want different', 'The clarity comes from writing, not thinking.', '60 min', today(), 'write'),
      task("Name the three things you'd most want different in 12 months — concretely", undefined, '30 min', today(), 'reflect'),
    ]),
    upcoming('Generate options', 'Weeks 3–5', 'Three or four realistic paths forward. The point is to see them side-by-side.', [
      task('Write 4 honest paths forward — title + one paragraph each', 'Options-on-paper beat options-in-head.', '60 min', daysFromNow(14), 'write'),
      task('For each: name the one thing that has to be true for it to work', 'Surfaces what you are betting on.', '45 min', daysFromNow(17), 'reflect'),
      task('Talk to one person who has walked each path', 'Cheapest education in the world is asking.', '4 × 30 min', daysFromNow(21), 'outreach'),
    ]),
    upcoming('Pressure-test one', 'Weeks 6–9', "Pick the one you can't stop thinking about. Try it small before betting the year on it.", [
      task('Pick the path you keep returning to', 'Repetition is signal.', '20 min', daysFromNow(35), 'reflect'),
      task('Design a 4-week cheap test of that path', "A real test beats months of more thinking.", '60 min', daysFromNow(38), 'write'),
    ]),
    upcoming('Commit or release', 'Weeks 10–12', "Either go bigger on it, or honestly drop it and pick another. Decisive beats stuck.", [
      task('Write the decision: bigger, smaller, or stop', 'Indecision is the most expensive option.', '45 min', daysFromNow(70), 'write'),
      task('Tell one person the decision out loud', 'Said-out-loud beats written-and-shelved.', '20 min', daysFromNow(74), 'outreach'),
    ]),
  ],
  custom: () => [
    p1('Get specific', 'Weeks 1–2', 'Turn the goal from a feeling into a small set of things you can actually do this week.', [
      task('Write what "achieved" looks like in concrete terms', "If you can't see it, you can't aim at it.", '30 min', today(), 'write'),
      task('Identify the three biggest unknowns blocking you', undefined, '20 min', today(), 'reflect'),
    ]),
    upcoming('Test cheap assumptions', 'Weeks 3–5', 'Small experiments that resolve the biggest unknowns quickly.', [
      task('Design a 1-week test for the first unknown', 'Tests > theories.', '45 min', daysFromNow(14), 'write'),
      task('Run the test. Capture honestly what you learned', undefined, '5+ hrs', daysFromNow(21), 'do'),
    ]),
    upcoming('Commit to the path', 'Weeks 6–9', 'Based on what you learned, double down on the version that worked.', [
      task('Pick the version of the goal that survived the tests', 'Surviving > original.', '30 min', daysFromNow(35), 'reflect'),
      task('Write the 4-week plan to push it forward', undefined, '60 min', daysFromNow(38), 'write'),
    ]),
    upcoming('Land the result', 'Weeks 10–12', 'Closing work that gets you to the goal in its concrete form.', [
      task("Define what 'done' looks like, week by week", 'Vague endings drift.', '45 min', daysFromNow(60), 'write'),
      task('Ship the closing artifact (whatever proves the goal)', 'Done is done.', '5+ hrs', daysFromNow(77), 'do'),
    ]),
  ],
};

// Tiny helpers to keep the templates above readable.
let _pid = 0;
function pId() {
  _pid += 1;
  return `p_${_pid}_${Math.random().toString(36).slice(2, 7)}`;
}
function tId() {
  return `t_${Math.random().toString(36).slice(2, 9)}`;
}
function p1(title: string, meta: string, outcome: string, tasks: Task[]): Phase {
  return { id: pId(), title, meta, outcome, status: 'in_progress', tasks };
}
function upcoming(title: string, meta: string, outcome: string, tasks: Task[] = []): Phase {
  return { id: pId(), title, meta, outcome, status: 'upcoming', tasks };
}
function task(
  title: string,
  why: string | undefined,
  effort: string,
  dueOn: string,
  kind: TaskKind = 'do',
): Task {
  return { id: tId(), title, why, effort, status: 'todo', dueOn, kind };
}

/**
 * Real LLM seam — when a provider key is available, swap to a structured-
 * output call that returns Phase[] tailored to the goal + context + chosen
 * companion's persona. For now the HTTP adapter throws; this function
 * surfaces that and the caller falls back to the intent template above.
 *
 * Production prompt outline:
 *   system: "You are <companion.name>, a <companion.role>. Given a user's
 *            goal + situation, output a 4-phase Path (JSON: Phase[]) that
 *            is specific to this person, not generic. First phase
 *            includes 3 concrete first-week tasks."
 *   user:   "Goal: ...\nContext: ...\nHorizon: ..."
 *   call:   completeSafe(messages) → parse JSON → validate → return
 */
async function generatePathWithLLM(_input: {
  title: string;
  context: string;
  horizon: string;
}): Promise<Phase[] | null> {
  // Wiring the real call is straightforward once a key exists; deferred
  // until then to keep the loop runnable without credentials. See
  // `src/llm/provider.ts` for the seam.
  return null;
}

/**
 * Create a new goal with a path tailored to the user's intent.
 *
 * Order of preference:
 *   1) Real LLM (when wired) — produces a fully bespoke path
 *   2) Explicit `intent` from the template the user picked in /setup
 *   3) Keyword-inferred intent from the goal title
 *
 * Either way returns the same Goal shape; downstream screens don't care.
 */
export async function createGoal(input: {
  title: string;
  context?: string;
  horizon?: string;
  /** Optional template id from the setup walkthrough — short-circuits
   *  keyword inference. */
  intent?: GoalIntent;
}): Promise<Goal> {
  const horizon = input.horizon ?? '12 weeks';
  const context = input.context ?? '';

  const fromLLM = await generatePathWithLLM({
    title: input.title,
    context,
    horizon,
  }).catch(() => null);

  const intent: GoalIntent = input.intent ?? inferIntent(input.title);
  const phases = fromLLM ?? INTENT_TEMPLATES[intent]();

  // Enforce one-active-goal: archive whatever's currently active before
  // adding the new one. Past goals stay visible in the archived list.
  await archiveActiveGoal('replaced');

  const goal: Goal = {
    id: `g_${Math.random().toString(36).slice(2, 10)}`,
    title: input.title,
    framing: framingFor(intent, input.title),
    context,
    horizon,
    startedAt: new Date().toISOString().slice(0, 10),
    endedAt: null,
    status: 'active',
    phases,
  };
  _goals = [goal, ..._goals];
  // Sync — replaces our local random id with the cloud-generated UUID
  // when signed in, so subsequent updates reference the right row.
  const synced = await syncGoal(goal);
  if (synced.id !== goal.id) {
    goal.id = synced.id;
  }
  return goal;
}

// ---------------------------------------------------------------------------
// Agentic goal proposal — the agent ITSELF detects when a conversation has
// reached enough specificity to lock as a goal, and emits a structured
// block at the end of its reply. We parse + surface it as an inline chip.
//
// See playbook.ts for the prompt instruction and turn.ts for the parser.
// ---------------------------------------------------------------------------

export type ProposalFraming = 'create' | 'update' | 'replace';

export interface GoalProposal {
  title: string;
  intent: GoalIntent;
  context: string;
  horizon: string;
  framing: ProposalFraming;
}

// ---------------------------------------------------------------------------
// Path-update operations — agent-driven fine-grained mutations on the
// active goal's phases + tasks. The agent emits a `path-update` block
// with a list of operations + a rationale; user accepts via a chip;
// these functions apply them.
// ---------------------------------------------------------------------------

export type PathOp =
  | { kind: 'add-task'; phaseId: string; title: string; why?: string; effort?: string; dueOn?: string }
  | { kind: 'complete-task'; taskId: string }
  | { kind: 'skip-task'; taskId: string }
  | { kind: 'remove-task'; taskId: string }
  | { kind: 'reschedule-task'; taskId: string; dueOn: string }
  | { kind: 'rename-phase'; phaseId: string; title: string }
  | { kind: 'reorder-tasks'; phaseId: string; taskIds: string[] };

export interface PathUpdate {
  rationale: string;
  operations: PathOp[];
}

/** Apply a list of path operations to the active goal. Returns the
 *  updated goal (or null if no active goal). Each op is best-effort
 *  silent: if a target id doesn't exist, that op is skipped. */
export async function applyPathUpdate(update: PathUpdate): Promise<Goal | null> {
  await ensureLoaded();
  const active = _goals.find((g) => g.status === 'active');
  if (!active) return null;
  const today = new Date().toISOString().slice(0, 10);
  const findPhase = (pid: string) => active.phases.find((p) => p.id === pid);
  const findTaskAndPhase = (tid: string) => {
    for (const p of active.phases) {
      const t = p.tasks.find((x) => x.id === tid);
      if (t) return { phase: p, task: t };
    }
    return null;
  };

  for (const op of update.operations) {
    switch (op.kind) {
      case 'add-task': {
        const phase = findPhase(op.phaseId);
        if (!phase) break;
        phase.tasks.push({
          id: `t_${Math.random().toString(36).slice(2, 9)}`,
          title: op.title,
          why: op.why,
          effort: op.effort,
          status: 'todo',
          dueOn: op.dueOn ?? today,
        });
        break;
      }
      case 'complete-task': {
        const found = findTaskAndPhase(op.taskId);
        if (found) found.task.status = 'done';
        break;
      }
      case 'skip-task': {
        const found = findTaskAndPhase(op.taskId);
        if (found) found.task.status = 'skipped';
        break;
      }
      case 'remove-task': {
        for (const p of active.phases) {
          const idx = p.tasks.findIndex((t) => t.id === op.taskId);
          if (idx >= 0) {
            p.tasks.splice(idx, 1);
            break;
          }
        }
        break;
      }
      case 'reschedule-task': {
        const found = findTaskAndPhase(op.taskId);
        if (found) found.task.dueOn = op.dueOn;
        break;
      }
      case 'rename-phase': {
        const phase = findPhase(op.phaseId);
        if (phase) phase.title = op.title;
        break;
      }
      case 'reorder-tasks': {
        const phase = findPhase(op.phaseId);
        if (!phase) break;
        const reordered = op.taskIds
          .map((id) => phase.tasks.find((t) => t.id === id))
          .filter((t): t is Task => !!t);
        const remaining = phase.tasks.filter((t) => !op.taskIds.includes(t.id));
        phase.tasks = [...reordered, ...remaining];
        break;
      }
    }
  }

  // Re-derive each phase's status from its tasks, then activate the
  // next phase if the active one just wrapped (same UX guarantee as
  // setTaskStatus — never leave the user with no tasks today).
  for (let i = 0; i < active.phases.length; i++) {
    const phase = active.phases[i];
    const allResolved = phase.tasks.length > 0 && phase.tasks.every((t) => t.status !== 'todo');
    const anyDone = phase.tasks.some((t) => t.status === 'done');
    const prevStatus = phase.status;
    if (allResolved) phase.status = 'done';
    else if (anyDone) phase.status = 'in_progress';
    if (allResolved && prevStatus !== 'done') activateNextPhase(active, i);
  }

  await syncGoal(active);
  return active;
}

/** Apply a user-accepted goal proposal. Routes to create / update /
 *  replace based on the framing the agent picked. */
export async function acceptProposal(p: GoalProposal): Promise<Goal> {
  if (p.framing === 'update') {
    const updated = await updateActiveGoal({
      title: p.title,
      contextAppend: p.context,
      horizon: p.horizon,
      intent: p.intent,
    });
    if (updated) return updated;
    // Fallthrough: no active goal → create instead.
  }
  // 'create' (no active goal) and 'replace' (auto-archives via createGoal)
  // share the same implementation.
  return createGoal({
    title: p.title,
    context: p.context,
    horizon: p.horizon,
    intent: p.intent,
  });
}

/** Intent-specific reframings — sharper than the generic
 *  "position yourself to reach X" we had before. */
function framingFor(intent: GoalIntent, title: string): string {
  switch (intent) {
    case 'land-senior':
      return `Position yourself as the obvious senior hire for the right kind of company — within your horizon, not someday.`;
    case 'get-promo':
      return `Build the case for the next level using receipts, not aspiration — and run the politics that get it signed.`;
    case 'negotiate':
      return `Move from "their number" to "your number" with real benchmarks, real leverage, and scripts you've already rehearsed.`;
    case 'switch':
      return `Build the bridge into the new function — projects, narrative, network — until the move feels inevitable, not risky.`;
    case 'first-job':
      return `Get inside the door with proof + targeted intros, not the firehose-of-applications hope.`;
    case 'founder':
      return `Test the bet honestly, de-risk the burnout, ship the wedge customers actually pay for.`;
    case 'real-feedback':
      return `Stop guessing how you're doing. Audit the receipts, get the real read from people who'd actually tell you.`;
    case 'improve-areas':
      return `Find the one or two highest-leverage areas, block the time, and re-test honestly at the end.`;
    case 'stay-valuable':
      return `Read the shifts in your field, pick two skills to bet on, and build them through real work — not just courses.`;
    case 'sense-next':
      return `Map where you are honestly, generate real options side-by-side, and pressure-test the one you can't stop thinking about.`;
    case 'custom':
    default:
      return `Turn "${title}" from a feeling into a sequenced path you can actually walk — specific to your situation, not a template.`;
  }
}

/** Dev/screenshot helper — restores the hand-crafted demo goal. */
export async function seedDemoGoal(): Promise<void> {
  _goals = [mockGoal];
}

/** Wipe all goals (account-deletion flow). */
export async function clearGoals(): Promise<void> {
  _goals = [];
}

export async function todaysTasks(): Promise<{ goal: Goal; phase: Phase; task: Task }[]> {
  const out: { goal: Goal; phase: Phase; task: Task }[] = [];
  const t = today();
  for (const goal of _goals) {
    for (const phase of goal.phases) {
      for (const task of phase.tasks) {
        if (task.dueOn === t && task.status === 'todo') {
          out.push({ goal, phase, task });
        }
      }
    }
  }
  return out;
}

/** Find a task by id across all goals + phases. Returns the goal, phase,
 *  and task so the workspace can render with full context. */
export async function findTask(
  taskId: string,
): Promise<{ goal: Goal; phase: Phase; task: Task } | null> {
  await ensureLoaded();
  for (const goal of _goals) {
    for (const phase of goal.phases) {
      const t = phase.tasks.find((x) => x.id === taskId);
      if (t) return { goal, phase, task: t };
    }
  }
  return null;
}

export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  for (const goal of _goals) {
    for (let i = 0; i < goal.phases.length; i++) {
      const phase = goal.phases[i];
      for (const task of phase.tasks) {
        if (task.id === taskId) {
          task.status = status;
          const allResolved = phase.tasks.every((t) => t.status !== 'todo');
          const anyDone = phase.tasks.some((t) => t.status === 'done');
          phase.status = allResolved ? 'done' : anyDone ? 'in_progress' : phase.status;
          // When the active phase wraps, immediately activate the next
          // one so the user has tasks today — not "wait two weeks".
          if (allResolved) activateNextPhase(goal, i);
          await syncGoal(goal);
          return;
        }
      }
    }
  }
}

/** Promote the phase after `completedIdx` to in_progress and make sure
 *  it has tasks the user can act on today. Two repairs:
 *    1) If the phase has zero tasks (intent templates seed only phase 1),
 *       generate starter tasks from the phase title + outcome.
 *    2) If existing todos are dated weeks out, pull them to today so
 *       they show up in Today's tasks immediately. */
function activateNextPhase(goal: Goal, completedIdx: number): void {
  const next = goal.phases[completedIdx + 1];
  if (!next) return;
  if (next.status === 'done') return;
  next.status = 'in_progress';
  const todayStr = today();
  if (next.tasks.length === 0) {
    next.tasks = starterTasksFor(next);
  } else {
    for (const t of next.tasks) {
      if (t.status === 'todo' && t.dueOn > todayStr) t.dueOn = todayStr;
    }
  }
}

/** Generic starter tasks for an unseeded phase — uses the phase's own
 *  outcome statement so they read tailored, not generic. The agent
 *  replaces these with real tasks on the next chat turn. */
function starterTasksFor(phase: Phase): Task[] {
  return [
    task(
      `Read the outcome for "${phase.title}" — write what it would look like for you`,
      `Each phase has a stated outcome. Naming it in your own words is the first step.`,
      '15 min',
      today(),
      'reflect',
    ),
    task(
      `Identify the one thing that has to be true by the end of ${phase.meta.toLowerCase()}`,
      `Phases drift without a clear finish line.`,
      '10 min',
      today(),
      'reflect',
    ),
    task(
      `Open chat and ask your agent to break this phase into concrete tasks`,
      undefined,
      '5 min',
      today(),
      'do',
    ),
  ];
}

export function progress(goal: Goal): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;
  for (const phase of goal.phases) {
    for (const task of phase.tasks) {
      total += 1;
      if (task.status === 'done') done += 1;
    }
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
