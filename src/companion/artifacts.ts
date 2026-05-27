/**
 * Artifacts — the things the user actually MAKES while working a path.
 *
 * The product shift the founder named: Cairn isn't a checklist, it's an OS
 * that helps you DO the work. The unit of work-done isn't "tick a box" —
 * it's a draft, a review, a score, a template the agent filled in for you.
 * Those things are Artifacts, persisted alongside the task that produced
 * them, so the path becomes a portfolio of actual artifacts over time.
 *
 * Storage: in-memory keyed by uid (same dual-mode pattern as goals.ts).
 * Cloud sync happens via the same /data/sync layer when signed in;
 * stays local-only for guests. Memory store is for chat/observations —
 * artifacts are heavier (multi-paragraph) and tied to a task, so a
 * separate concern.
 */

export type ArtifactKind =
  | 'draft' // user's draft of the task's output (JD, STAR story, etc)
  | 'template' // agent-generated starter template, pre-filled with context
  | 'review' // agent's review of a draft or a URL
  | 'examples' // 3-5 web-sourced examples with one-line "why this works"
  | 'score' // structured rubric scoring
  | 'note'; // free-form note the user attached to the task

export interface ArtifactScore {
  /** Overall 1-100 score the agent gave. */
  overall: number;
  /** Per-dimension breakdown — the rubric varies per task kind. */
  dimensions: Array<{
    label: string;
    score: number; // 1-5
    saw: string; // what the agent saw in the user's work
    push: string; // the specific delta to chase
  }>;
  /** One concrete next action the user can take to push the score. */
  nextAction: string;
}

export interface ArtifactReview {
  /** What the agent could see / had access to. Honesty layer. */
  whatISaw: string;
  /** What was inaccessible / had to be assumed. NEVER omit if relevant. */
  whatIMissed: string;
  /** Overall narrative review — 2-4 paragraphs. */
  body: string;
  /** Optional embedded score block. */
  score?: ArtifactScore;
}

export interface ArtifactExample {
  title: string;
  url?: string;
  oneLineWhy: string;
  source?: string;
}

export interface Artifact {
  id: string;
  /** The task this artifact is anchored to. */
  taskId: string;
  /** Goal id — denormalized for fast scoping. */
  goalId: string;
  kind: ArtifactKind;
  /** Display title. */
  title: string;
  /** ISO timestamp of creation. */
  createdAt: string;
  /** For 'draft' and 'template' and 'note' artifacts. */
  body?: string;
  /** For 'review' artifacts. */
  review?: ArtifactReview;
  /** For 'score' artifacts. */
  score?: ArtifactScore;
  /** For 'examples' artifacts. */
  examples?: ArtifactExample[];
  /** Optional URL the artifact references (portfolio review, etc). */
  sourceUrl?: string;
}

let _artifacts: Artifact[] = [];
let _uid: string | 'guest' | null = null;

const GUEST_KEY = 'cairn.guest.artifacts.v1';

function readGuest(): Artifact[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Artifact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuest(arr: Artifact[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(arr));
  } catch {
    /* quota / private mode / SSR — silently ignore */
  }
}

function persistGuestIfNeeded(): void {
  if (_uid === 'guest') writeGuest(_artifacts);
}

async function ensureLoaded(): Promise<void> {
  const { currentUserId, cloudListArtifacts } = await import('@/data/sync');
  const uid = (await currentUserId()) ?? 'guest';
  if (_uid === uid) return;
  if (uid === 'guest') {
    // Guest: drop any cloud rows from a prior signed-in session, then
    // rehydrate from localStorage so a refresh doesn't wipe drafts and
    // reviews.
    if (_uid !== null && _uid !== 'guest') _artifacts = [];
    if (_artifacts.length === 0) _artifacts = readGuest();
  } else {
    // Signed in: pull every artifact row for this user. The artifact
    // count per user stays bounded (one row per draft/review/etc) so a
    // full fetch is fine for v1; switch to per-task fetch if it grows.
    _artifacts = await cloudListArtifacts(uid);
  }
  _uid = uid;
}

function newId(): string {
  return `a_${Math.random().toString(36).slice(2, 10)}`;
}

export async function listArtifacts(filter?: {
  taskId?: string;
  goalId?: string;
  kind?: ArtifactKind;
}): Promise<Artifact[]> {
  await ensureLoaded();
  return _artifacts.filter((a) => {
    if (filter?.taskId && a.taskId !== filter.taskId) return false;
    if (filter?.goalId && a.goalId !== filter.goalId) return false;
    if (filter?.kind && a.kind !== filter.kind) return false;
    return true;
  });
}

export async function saveArtifact(input: Omit<Artifact, 'id' | 'createdAt'>): Promise<Artifact> {
  await ensureLoaded();
  let a: Artifact = {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  // Push to cloud first (so we have the canonical UUID), then mirror
  // locally. If sync fails / guest, keep the local id.
  const { currentUserId, cloudInsertArtifact } = await import('@/data/sync');
  const uid = await currentUserId();
  if (uid) {
    const saved = await cloudInsertArtifact(uid, a);
    if (saved) a = saved;
  }
  _artifacts = [a, ..._artifacts];
  persistGuestIfNeeded();
  return a;
}

export async function deleteArtifact(id: string): Promise<void> {
  await ensureLoaded();
  _artifacts = _artifacts.filter((a) => a.id !== id);
  const { currentUserId, cloudDeleteArtifact } = await import('@/data/sync');
  const uid = await currentUserId();
  if (uid) await cloudDeleteArtifact(uid, id);
  persistGuestIfNeeded();
}

export async function clearArtifacts(): Promise<void> {
  _artifacts = [];
  _uid = null;
}
