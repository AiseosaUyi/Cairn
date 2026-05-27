-- =============================================================================
-- Cairn v1.2 — artifacts
-- =============================================================================
-- The user's actual MADE WORK lives here: template starters, drafts, reviews,
-- rubric scores, examples lists. Anchored to a task (and goal) so the path
-- becomes a real portfolio of artifacts over time, not just a checklist.
--
-- Columns we keep loose:
--   - body          → markdown / plain text for 'draft', 'template', 'note'
--   - review        → jsonb { whatISaw, whatIMissed, body, score? }
--   - score         → jsonb { overall, dimensions[], nextAction }
--   - examples      → jsonb [{ title, oneLineWhy, url?, source? }]
--   - source_url    → optional URL the artifact references (portfolio review)
--
-- This shape lets each artifact kind use the columns relevant to it without
-- a 5-table polymorphism scheme. The shapes are stable and small.
-- =============================================================================

create table if not exists public.artifacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  goal_id     uuid not null,
  task_id     text not null,
  kind        text not null
              check (kind in ('draft','template','review','examples','score','note')),
  title       text not null,
  body        text,
  review      jsonb,
  score       jsonb,
  examples    jsonb,
  source_url  text,
  created_at  timestamptz default now()
);

-- Fast lookup of a task's artifacts (the workspace queries this every open).
create index if not exists artifacts_task_recent
  on public.artifacts (user_id, task_id, created_at desc);

-- Goal-scoped listing for the "everything I made on this goal" view.
create index if not exists artifacts_goal_recent
  on public.artifacts (user_id, goal_id, created_at desc);

-- Row-Level Security — same self-only policy as goals.
alter table public.artifacts enable row level security;

drop policy if exists "artifacts_self_all" on public.artifacts;
create policy "artifacts_self_all" on public.artifacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
