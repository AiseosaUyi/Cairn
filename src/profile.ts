/**
 * Profile/session. Identifier tier → encrypted at rest (expo-secure-store).
 * Holds consent + age gate (store-review requirements) and the optional,
 * default-none coach name per mode.
 */
import type { Mode } from '@/design/tokens';

export interface Profile {
  name: string | null;
  region: 'NG' | 'US' | 'unknown';
  lastMode: Mode | null;
  /** Optional, user-chosen companion name per mode. Default: none. */
  coachNames: { career: string | null; health: string | null };
  /** Store-review: 17+ self-attestation. */
  ageConfirmed: boolean;
  /** ISO timestamp the user accepted Terms + Privacy + not-therapy notice. */
  consentAcceptedAt: string | null;
  onboarded: boolean;
}

const KEY = 'trueself.profile.v2';
const empty: Profile = {
  name: null,
  region: 'unknown',
  lastMode: null,
  coachNames: { career: null, health: null },
  ageConfirmed: false,
  consentAcceptedAt: null,
  onboarded: false,
};

async function secure() {
  try {
    return await import('expo-secure-store');
  } catch {
    return null;
  }
}

let cache: Profile | null = null;

export async function getProfile(): Promise<Profile> {
  if (cache) return cache;
  const ss = await secure();
  let loaded: Profile;
  try {
    const raw = ss ? await ss.getItemAsync(KEY) : null;
    loaded = raw
      ? { ...empty, ...JSON.parse(raw), coachNames: { ...empty.coachNames, ...(JSON.parse(raw).coachNames ?? {}) } }
      : { ...empty };
  } catch {
    loaded = { ...empty };
  }
  cache = loaded;
  return loaded;
}

export async function setProfile(patch: Partial<Profile>): Promise<Profile> {
  const next = { ...(await getProfile()), ...patch };
  cache = next;
  const ss = await secure();
  try {
    if (ss) await ss.setItemAsync(KEY, JSON.stringify(next));
  } catch {
    /* best-effort */
  }
  return next;
}

/** Account/data deletion (Apple 5.1.1(v) / Play data-deletion). Irreversible. */
export async function wipeProfile(): Promise<void> {
  cache = null;
  const ss = await secure();
  try {
    if (ss) await ss.deleteItemAsync(KEY);
  } catch {
    /* ignore */
  }
}

export function resolveCoachName(p: Profile, mode: Mode): string | null {
  return p.coachNames[mode]?.trim() || null;
}

/** Display label: the chosen name, or a warm neutral fallback. */
export function coachLabel(p: Profile, mode: Mode): string {
  return resolveCoachName(p, mode) ?? 'your companion';
}
