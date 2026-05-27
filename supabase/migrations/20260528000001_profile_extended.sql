-- =============================================================================
-- Cairn v1.1 — extend profiles for the new sign-up + profile-setup flow
-- =============================================================================
-- Adds the columns the post-sign-up profile-setup screen collects, plus a
-- `profile_setup_complete` flag the router uses to decide whether to send a
-- signed-in user to /profile-setup or straight to /companion-picker.
--
-- All ADD COLUMN statements use IF NOT EXISTS so re-running is safe.
-- =============================================================================

alter table public.profiles
  add column if not exists employment_status text
    check (employment_status in ('full_time','part_time','self_employed','unemployed','student')),
  add column if not exists company text,
  add column if not exists tenure_months int check (tenure_months >= 0),
  add column if not exists years_experience int check (years_experience >= 0),
  add column if not exists country text,
  add column if not exists profile_setup_complete boolean default false;
