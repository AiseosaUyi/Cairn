/**
 * Profile/session. Identifier tier → encrypted at rest on native
 * (expo-secure-store); plain localStorage on web (secure-store has no
 * web implementation and silently failed before, losing companion choice
 * across navigations — fixed 2026-05-26).
 *
 * Holds consent + age gate (store-review requirements), the optional
 * default-none coach name per mode, and the selected agent character.
 */
import { Platform } from 'react-native';
import type { Mode } from '@/design/tokens';

export type ExperienceLevel =
  | 'entry'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'executive';

export const EXPERIENCE_LEVELS: { id: ExperienceLevel; label: string; hint: string }[] = [
  { id: 'entry', label: 'Entry', hint: '0–2 yrs' },
  { id: 'mid', label: 'Mid', hint: '3–5 yrs' },
  { id: 'senior', label: 'Senior', hint: '6–9 yrs' },
  { id: 'lead', label: 'Lead', hint: '10+ yrs, IC' },
  { id: 'executive', label: 'Executive', hint: 'Director, VP, C-suite' },
];

export interface Profile {
  /** Short name / first name — what the companion calls you. */
  name: string | null;
  /** Full legal/professional name — used on portfolio outputs, CV
   *  drafts, intro email scripts, etc. */
  fullName: string | null;
  /** Current job title (free text) — "Product Manager", "Senior Engineer",
   *  "Career switcher / unemployed". Used as agent context. */
  role: string | null;
  /** Career stage — bands the agent uses to calibrate advice. */
  experienceLevel: ExperienceLevel | null;
  /** User-uploaded photo (data URL on web, file URI on native). Optional.
   *  When set, overrides the chosen-companion avatar on profile surfaces. */
  avatarUri: string | null;
  region: 'NG' | 'US' | 'unknown';
  lastMode: Mode | null;
  /** Optional, user-chosen companion name per mode. Default: none. */
  coachNames: { career: string | null; health: string | null };
  /** Selected agent character id (see src/companion/characters.ts).
   *  null = no character chosen yet (default mascot used). */
  companionId: string | null;
  /** Store-review: 17+ self-attestation. */
  ageConfirmed: boolean;
  /** ISO timestamp the user accepted Terms + Privacy + not-therapy notice. */
  consentAcceptedAt: string | null;
  onboarded: boolean;
}

const KEY = 'cairn.profile.v2';
const empty: Profile = {
  name: null,
  fullName: null,
  role: null,
  experienceLevel: null,
  avatarUri: null,
  region: 'unknown',
  lastMode: null,
  coachNames: { career: null, health: null },
  companionId: null,
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

async function readRaw(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  }
  const ss = await secure();
  if (!ss) return null;
  try {
    return await ss.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function writeRaw(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    return;
  }
  const ss = await secure();
  if (!ss) return;
  try {
    await ss.setItemAsync(KEY, value);
  } catch {
    /* best-effort */
  }
}

async function deleteRaw(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  const ss = await secure();
  if (!ss) return;
  try {
    await ss.deleteItemAsync(KEY);
  } catch {
    /* ignore */
  }
}

let cache: Profile | null = null;

export async function getProfile(): Promise<Profile> {
  if (cache) return cache;
  let loaded: Profile;
  try {
    const raw = await readRaw();
    const parsed = raw ? JSON.parse(raw) : null;
    loaded = parsed
      ? {
          ...empty,
          ...parsed,
          coachNames: { ...empty.coachNames, ...(parsed.coachNames ?? {}) },
        }
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
  await writeRaw(JSON.stringify(next));
  return next;
}

/** Account/data deletion (Apple 5.1.1(v) / Play data-deletion). Irreversible. */
export async function wipeProfile(): Promise<void> {
  cache = null;
  await deleteRaw();
}

export function resolveCoachName(p: Profile, mode: Mode): string | null {
  return p.coachNames[mode]?.trim() || null;
}

/** Display label: the chosen name, or a warm neutral fallback. */
export function coachLabel(p: Profile, mode: Mode): string {
  return resolveCoachName(p, mode) ?? 'your companion';
}
