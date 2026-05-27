/**
 * Auth state hook + email/password helpers.
 *
 * Wraps Supabase auth into one ergonomic React surface. Components use
 * `useAuth()` for session state; the `signUp / signIn / requestPasswordReset
 * / signOut` helpers mutate it.
 *
 * Guest mode is always valid — when not signed in, the rest of the app
 * keeps using local storage. No part of the product is gated behind auth;
 * sign-in is for cross-device backup and the post-sign-up profile capture.
 *
 * Password redirects (reset / confirm) go through `siteUrl()` rather than
 * `window.location.origin`, so a magic link clicked from a different
 * device still routes to the canonical Vercel URL — not whatever localhost
 * the email was opened from.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '@/data/supabase';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True iff Supabase is configured at all. False → app is local-only. */
  enabled: boolean;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

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

    sb.auth.getSession().then(({ data }) => {
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
        enabled: true,
      });
    });

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
 * Canonical public site URL for email-link redirects.
 *
 * Priority:
 *   1. EXPO_PUBLIC_SITE_URL  — what you set in Vercel env (e.g.
 *      https://cairn.app or https://cairn-lac.vercel.app).
 *   2. window.location.origin — runtime origin, only used when the env
 *      isn't set. On native this is undefined and we return null (the
 *      Supabase SDK then falls back to the project's default redirect).
 *
 * Why this matters: if a user requests a password reset from their
 * laptop's localhost dev server and we pass that as the redirect, the
 * email link is literally `http://localhost:8081/reset-password` —
 * unusable on their phone. EXPO_PUBLIC_SITE_URL fixes that.
 */
export function siteUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return null;
}

/** Build an absolute URL for one of our internal routes. */
export function siteRoute(path: string): string | undefined {
  const base = siteUrl();
  if (!base) return undefined;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

// ---------------------------------------------------------------------------
// Email + password auth
// ---------------------------------------------------------------------------

/**
 * Create a new account with email + password.
 *
 * `fullName` is stored as `user_metadata.full_name` and also copied to
 * the profile row on first sign-in by the post-sign-up profile-setup
 * step. Supabase auto-creates the profile row via the
 * `on_auth_user_created` trigger.
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult> {
  if (!supabaseEnabled()) return { ok: false, error: 'Sign-in is not configured on this build.' };
  const { error } = await supabase().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: siteRoute('/sign-in'),
    },
  });
  if (error) return { ok: false, error: humanize(error.message) };
  return { ok: true };
}

/** Sign in with email + password. */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!supabaseEnabled()) return { ok: false, error: 'Sign-in is not configured on this build.' };
  const { error } = await supabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, error: humanize(error.message) };
  return { ok: true };
}

/** Send a password-reset link. Lands on /reset-password with a recovery
 *  token in the URL fragment for the SDK to consume. */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!supabaseEnabled()) return { ok: false, error: 'Sign-in is not configured on this build.' };
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: siteRoute('/reset-password'),
  });
  if (error) return { ok: false, error: humanize(error.message) };
  return { ok: true };
}

/** Complete a password reset — call from the /reset-password screen
 *  after the recovery session has been detected. */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!supabaseEnabled()) return { ok: false, error: 'Sign-in is not configured on this build.' };
  const { error } = await supabase().auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: humanize(error.message) };
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

/** Map raw Supabase error messages to friendlier copy. Keep the fallback
 *  generic — every untrusted error string from auth is safe to surface,
 *  but the wording is often technical. */
function humanize(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }
  if (m.includes('email not confirmed')) {
    return "Confirm your email first — check your inbox for the link we just sent.";
  }
  if (m.includes('already registered') || m.includes('already exists')) {
    return 'That email already has an account. Sign in instead.';
  }
  if (m.includes('password') && m.includes('characters')) {
    return 'Password must be at least 6 characters.';
  }
  if (m.includes('rate limit')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return msg;
}
