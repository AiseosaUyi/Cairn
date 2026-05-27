/**
 * Supabase client — web + native compatible singleton.
 *
 * URL + anon key are bundled to the client (safe — Row-Level Security
 * in the DB itself enforces data isolation, not the client). The
 * service role key NEVER lives here; only Vercel Functions read it
 * server-side from process.env.SUPABASE_SERVICE_ROLE_KEY.
 *
 * If env vars are missing, supabaseEnabled() returns false and the
 * rest of the app falls back to guest-only local storage cleanly.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (_client) return _client;
  if (!URL || !ANON_KEY) {
    // Return a stub client that throws on use — should never be called
    // when supabaseEnabled() is false, but defensive.
    throw new Error(
      '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  }
  _client = createClient(URL, ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // Web: read the auth code from the URL after magic-link redirect.
      detectSessionInUrl: Platform.OS === 'web',
      // Allow the redirect URL to use a query param `?code=` instead of
      // a fragment `#`, which works better through Vercel + PWA.
      flowType: 'pkce',
    },
  });
  return _client;
}

/** True iff env vars are configured. Callers use this to decide whether
 *  to attempt cloud sync at all. App stays fully functional when false. */
export function supabaseEnabled(): boolean {
  return URL.length > 0 && ANON_KEY.length > 0;
}
