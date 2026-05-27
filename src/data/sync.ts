/**
 * Sync layer — bridges local (localStorage / secure-store) data with
 * the user's Supabase rows when they're signed in.
 *
 * Architecture: dual-mode, auth-aware.
 *   - When NOT signed in: getProfile/getActiveGoal/etc read+write local.
 *   - When signed in: they read+write Supabase, with a small in-memory
 *     cache keyed by user id so cache invalidates on sign-in/out.
 *   - First read after sign-in does a one-shot migration: if cloud is
 *     empty and local has data, push local up before returning.
 *
 * Modules that hold their own caches (profile.ts, goals.ts) include
 * the user id in their cache key — so signing in/out naturally drops
 * the wrong-source cache without needing subscriptions.
 */
import { supabase, supabaseEnabled } from './supabase';
import type { Profile } from '@/profile';
import type { Goal, GoalStatus, Phase } from '@/companion/goals';

/** "guest" sentinel keeps cache keys typed nicely. */
export type AuthIdent = string | 'guest';

/** Synchronously stash the latest session user id from Supabase's own
 *  in-memory store. Avoid an async call per read — Supabase exposes the
 *  session synchronously via getSession() but the first call is async;
 *  subsequent calls are fast. */
export async function currentUserId(): Promise<string | null> {
  if (!supabaseEnabled()) return null;
  try {
    const { data } = await supabase().auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Profile <-> DB row mapping
// ---------------------------------------------------------------------------
interface ProfileRow {
  id: string;
  name: string | null;
  full_name: string | null;
  role: string | null;
  experience_level: Profile['experienceLevel'];
  avatar_uri: string | null;
  region: Profile['region'];
  last_mode: Profile['lastMode'];
  coach_names: { career: string | null; health: string | null };
  companion_id: string | null;
  age_confirmed: boolean;
  consent_accepted_at: string | null;
  onboarded: boolean;
}

export function rowToProfile(row: ProfileRow): Profile {
  return {
    name: row.name,
    fullName: row.full_name,
    role: row.role,
    experienceLevel: row.experience_level,
    avatarUri: row.avatar_uri,
    region: row.region ?? 'unknown',
    lastMode: row.last_mode ?? null,
    coachNames: row.coach_names ?? { career: null, health: null },
    companionId: row.companion_id,
    ageConfirmed: row.age_confirmed,
    consentAcceptedAt: row.consent_accepted_at,
    onboarded: row.onboarded,
  };
}

function profileToRow(p: Profile): Omit<ProfileRow, 'id'> {
  return {
    name: p.name,
    full_name: p.fullName,
    role: p.role,
    experience_level: p.experienceLevel,
    avatar_uri: p.avatarUri,
    region: p.region,
    last_mode: p.lastMode,
    coach_names: p.coachNames,
    companion_id: p.companionId,
    age_confirmed: p.ageConfirmed,
    consent_accepted_at: p.consentAcceptedAt,
    onboarded: p.onboarded,
  };
}

/** Is this profile "effectively empty" — i.e. just the auto-created row
 *  with no real user data, safe to overwrite with a local migration? */
function isProfileEmpty(p: Profile): boolean {
  return (
    !p.name && !p.fullName && !p.role && !p.experienceLevel &&
    !p.avatarUri && !p.companionId && !p.onboarded
  );
}

/** Fetch the signed-in user's profile from Supabase. If the row is the
 *  empty auto-created one AND the caller has a non-empty local profile,
 *  push local up first (one-shot migration) and return that. */
export async function cloudGetProfile(
  uid: string,
  localProfile: Profile | null,
): Promise<Profile | null> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  if (error || !data) return null;
  const remote = rowToProfile(data as ProfileRow);

  // Migration: cloud empty + local has real data → push local up.
  if (isProfileEmpty(remote) && localProfile && !isProfileEmpty(localProfile)) {
    await cloudSaveProfile(uid, localProfile);
    return localProfile;
  }
  return remote;
}

export async function cloudSaveProfile(uid: string, p: Profile): Promise<void> {
  const row = { id: uid, ...profileToRow(p) };
  await supabase()
    .from('profiles')
    .upsert(row, { onConflict: 'id' });
}

// ---------------------------------------------------------------------------
// Goal <-> DB row mapping (phases stored as JSONB on the goal row)
// ---------------------------------------------------------------------------
interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  framing: string | null;
  context: string | null;
  horizon: string | null;
  intent: string | null;
  status: GoalStatus;
  started_at: string;
  ended_at: string | null;
  phases: Phase[];
}

export function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    framing: row.framing ?? '',
    context: row.context ?? '',
    horizon: row.horizon ?? '12 weeks',
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
    phases: row.phases ?? [],
  };
}

function goalToRow(g: Goal, uid: string): Omit<GoalRow, 'id'> & { id?: string } {
  const out: Omit<GoalRow, 'id'> & { id?: string } = {
    user_id: uid,
    title: g.title,
    framing: g.framing,
    context: g.context,
    horizon: g.horizon,
    // Intent isn't stored on the Goal type post-creation — leave null;
    // re-derived in code from title keywords if needed.
    intent: null,
    status: g.status,
    started_at: g.startedAt,
    ended_at: g.endedAt,
    phases: g.phases,
  };
  // Only include id if it's already a UUID (cloud-generated). Local
  // ids are `g_xxx` and will be re-issued by Postgres on insert.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(g.id)) {
    out.id = g.id;
  }
  return out;
}

/** All goals for the signed-in user. If cloud is empty AND localGoals
 *  has at least one, migrate local → cloud first, then re-fetch. */
export async function cloudListGoals(
  uid: string,
  localGoals: Goal[],
): Promise<Goal[]> {
  const { data, error } = await supabase()
    .from('goals')
    .select('*')
    .eq('user_id', uid)
    .order('started_at', { ascending: false });
  if (error) return [];
  const remote = (data ?? []).map((r) => rowToGoal(r as GoalRow));

  if (remote.length === 0 && localGoals.length > 0) {
    // First sign-in migration: push every local goal up.
    for (const g of localGoals) {
      await cloudUpsertGoal(uid, g);
    }
    // Re-fetch to get the cloud-generated ids.
    const { data: after } = await supabase()
      .from('goals')
      .select('*')
      .eq('user_id', uid)
      .order('started_at', { ascending: false });
    return (after ?? []).map((r) => rowToGoal(r as GoalRow));
  }
  return remote;
}

/** Insert or update one goal. Returns the goal as stored (with its
 *  possibly-rewritten id if Postgres generated a new UUID). */
export async function cloudUpsertGoal(uid: string, g: Goal): Promise<Goal | null> {
  const row = goalToRow(g, uid);
  // If row.id is set (already a UUID), upsert; otherwise insert and let
  // Postgres assign.
  if (row.id) {
    const { data, error } = await supabase()
      .from('goals')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error || !data) return null;
    return rowToGoal(data as GoalRow);
  }
  const { data, error } = await supabase()
    .from('goals')
    .insert(row)
    .select()
    .single();
  if (error || !data) return null;
  return rowToGoal(data as GoalRow);
}

export async function cloudDeleteGoal(_uid: string, goalId: string): Promise<void> {
  await supabase().from('goals').delete().eq('id', goalId);
}
