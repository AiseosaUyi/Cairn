/**
 * Auth state hook + helpers.
 *
 * Wraps Supabase auth into one ergonomic React surface. Components use
 * `useAuth()` to read the current session; `sendMagicLink()` and
 * `signOut()` to mutate it. Auth state changes (sign-in, sign-out,
 * token refresh) are subscribed to once and broadcast.
 *
 * Guest mode is always valid — when not signed in, the rest of the
 * app keeps using local storage as before. No part of the product is
 * gated behind auth; sign-in is purely for cross-device backup.
 */
import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '@/data/supabase';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True iff Supabase is configured at all. False → app is local-only. */
  enabled: boolean;
}

export function useAuth(): AuthState {
  const enabled = supabaseEnabled();
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: enabled,
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    const sb = supabase();

    // Initial session load (after web magic-link redirect this resolves
    // with the newly-created session).
    sb.auth.getSession().then(({ data }) => {
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
        enabled: true,
      });
    });

    // Subscribe to future changes (sign-in, sign-out, refresh).
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
        enabled: true,
      });
    });
    return () => sub.subscription.unsubscribe();
  }, [enabled]);

  return state;
}

/**
 * Send a magic-link sign-in email. The link redirects back to
 * `/sign-in` (which auto-detects the session via Supabase's
 * `detectSessionInUrl` flag). On success returns ok=true; on failure
 * the error message is safe to show in the UI.
 */
export async function sendMagicLink(
  email: string,
  redirectTo?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseEnabled()) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const sb = supabase();
  const target =
    redirectTo ??
    (typeof window !== 'undefined' ? `${window.location.origin}/sign-in` : undefined);
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: target },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Sign out the current user. Local storage is preserved so the user
 *  drops back into guest mode with their last-known local state. */
export async function signOut(): Promise<void> {
  if (!supabaseEnabled()) return;
  try {
    await supabase().auth.signOut();
  } catch {
    /* ignore — UI will react to the auth state change either way */
  }
}
