-- =============================================================================
-- Cairn v1 — initial schema
-- =============================================================================
-- Run this in your Supabase project's SQL Editor (or via `supabase db push`
-- if you set up the CLI later). It's idempotent — every CREATE uses
-- IF NOT EXISTS / OR REPLACE, so re-running is safe.
--
-- What this creates:
--   tables          profiles, goals, episodic_entries, moods
--   triggers        auto-create profile on signup, touch updated_at
--   constraints     check enums + one-active-goal-per-user invariant
--   RLS policies    users can only read/write their own rows
-- =============================================================================


-- 1. Profiles (1:1 with auth.users — created automatically on signup) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  full_name text,
  role text,
  experience_level text check (experience_level in ('entry','mid','senior','lead','executive')),
  avatar_uri text,
  region text default 'unknown',
  last_mode text default 'career',
  coach_names jsonb default '{"career":null,"health":null}'::jsonb,
  companion_id text,
  age_confirmed boolean default false,
  consent_accepted_at timestamptz,
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- 2. Goals (one active per user — enforced by partial unique index) ------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  framing text,
  context text,
  horizon text,
  intent text,
  status text not null default 'active' check (status in ('active','archived','completed')),
  started_at date default current_date,
  ended_at date,
  phases jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists goals_one_active_per_user
  on public.goals (user_id) where status = 'active';
create index if not exists goals_user_status
  on public.goals (user_id, status);


-- 3. Episodic memory — chat history (companion + user turns) -------------------
create table if not exists public.episodic_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('career','health')),
  role text not null check (role in ('user','companion')),
  text text not null,
  created_at timestamptz default now()
);
create index if not exists episodic_user_recent
  on public.episodic_entries (user_id, mode, created_at desc);


-- 4. Mood check-ins (kept for future, low-volume) ------------------------------
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  mood int not null check (mood between 1 and 5),
  energy int not null check (energy between 1 and 5),
  note text,
  created_at timestamptz default now()
);
create index if not exists moods_user_recent
  on public.moods (user_id, created_at desc);


-- 5. updated_at auto-touch trigger ---------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at before update on public.goals
  for each row execute function public.touch_updated_at();


-- 6. Auto-create profile row on user signup ------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 7. Row-Level Security — users can only see / mutate their own rows ----------
alter table public.profiles          enable row level security;
alter table public.goals             enable row level security;
alter table public.episodic_entries  enable row level security;
alter table public.moods             enable row level security;

drop policy if exists "profiles_self_read"   on public.profiles;
drop policy if exists "profiles_self_write"  on public.profiles;
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_write"  on public.profiles for update using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "goals_self_all" on public.goals;
create policy "goals_self_all" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "episodic_self_all" on public.episodic_entries;
create policy "episodic_self_all" on public.episodic_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "moods_self_all" on public.moods;
create policy "moods_self_all" on public.moods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
