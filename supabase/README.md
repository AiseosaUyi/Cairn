# Supabase

This directory holds Cairn's database schema. Two ways to apply it:

## Option A — paste into the SQL Editor (no CLI, fastest)

1. Open your Supabase dashboard → **SQL Editor** → **New query**
2. Open `migrations/20260527000001_init_cairn_v1.sql` from this folder
3. Copy all of it, paste into the editor, click **Run**
4. Expect "Success. No rows returned."
5. Verify: **Database** → **Tables** — you should see `profiles`, `goals`,
   `episodic_entries`, `moods` each with a 🔒 (= Row-Level Security on)

The migration is idempotent — every `create` uses `if not exists` and every
policy is dropped + re-created. Safe to re-run.

## Option B — Supabase CLI (when you want migrations versioned in CI)

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

The CLI reads `supabase/migrations/*.sql` in alphabetical order. New
migrations: `supabase migration new <name>` creates a new file with a
sequential timestamp.

## After migrating

1. Confirm RLS is on: Database → Tables → 🔒 icon on each
2. Configure auth redirects: Authentication → URL Configuration
   - Site URL: `http://localhost:8081`
   - Redirect URLs: `http://localhost:8081/sign-in`, your prod URL/sign-in
3. Optional: Authentication → Providers → toggle "Enable Email Confirmations"
   off for friction-free dev; turn back on before real users

## The 3 env vars (paste into `.env.local`)

From Project Settings → API:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...   # safe — RLS is the security
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...        # NEVER prefix with EXPO_PUBLIC_
```
