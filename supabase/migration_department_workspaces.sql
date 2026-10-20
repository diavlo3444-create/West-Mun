-- =====================================================================
-- WEST MUN 2027 — Department Workspaces & Strict Registration Access
--
-- STATUS: NOT YET APPLIED to the production project
--         (tpflkxmnwuxyldhchtdl). Verified by probing the live REST API:
--         public.department_records and public.head_department() do not
--         exist yet. Run this file once in Supabase > SQL Editor.
--
-- This migration is additive and idempotent. It is safe to run more than
-- once, and it never drops, renames, or rewrites existing rows.
--
-- What it does
-- 1. Recreates the trusted helper functions used by RLS:
--      public.head_department(), public.head_section()
--    and adds public.is_registration_head().
-- 2. Creates public.department_records: the single shared table behind every
--    department workspace (tasks, campaigns, coverage, incidents, rosters,
--    shifts, sponsor tasks, venue plans, run-of-show, DCC directives, ...).
-- 3. Enforces department + section isolation with RLS for select/insert/
--    update/delete, plus intentional read-only sharing of venue, equipment,
--    run_of_show, and speaker records.
-- 4. Restricts public.team_registrations to Media/Press, Security, and
--    Volunteers heads only — at the database level, not just in the UI.
--
-- It intentionally does NOT:
--   * delete or rename any registration rows or tables
--   * grant regular IT heads Super IT privileges
--   * grant HR or PR any permissions beyond their existing modules
--   * insert sample/demo data
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Trusted identity helpers (database is the source of truth)
-- ---------------------------------------------------------------------
create or replace function public.head_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select dh.department
  from public.department_heads dh
  where (dh.id = auth.uid() or dh.user_id = auth.uid())
    and coalesce(dh.active, true) = true
  limit 1;
$$;

create or replace function public.head_section()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select dh.section
  from public.department_heads dh
  where (dh.id = auth.uid() or dh.user_id = auth.uid())
    and coalesce(dh.active, true) = true
  limit 1;
$$;

create or replace function public.is_registration_head()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.department_heads dh
    where (dh.id = auth.uid() or dh.user_id = auth.uid())
      and coalesce(dh.active, true) = true
      and lower(btrim(dh.department)) in ('media_press', 'security', 'volunteers')
  );
$$;

revoke all on function public.head_department() from public;
revoke all on function public.head_section() from public;
revoke all on function public.is_registration_head() from public;
grant execute on function public.head_department() to authenticated;
grant execute on function public.head_section() to authenticated;
grant execute on function public.is_registration_head() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Shared department_records table
-- ---------------------------------------------------------------------
create table if not exists public.department_records (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  department  text not null check (department in (
    'design',
    'marketing',
    'media_press',
    'security',
    'volunteers',
    'pr',
    'hr',
    'logistics',
    'it',
    'ceremonies',
    'dcc'
  )),
  section     text check (section in ('male', 'female') or section is null),
  category    text not null check (char_length(category) between 1 and 60),
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  status      text not null default 'pending' check (char_length(status) <= 60),
  priority    text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  data        jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users (id) on delete set null
);

-- Bring an older/partial table up to date without touching existing rows.
alter table public.department_records add column if not exists created_at timestamptz not null default now();
alter table public.department_records add column if not exists updated_at timestamptz not null default now();
alter table public.department_records add column if not exists section text;
alter table public.department_records add column if not exists category text;
alter table public.department_records add column if not exists title text;
alter table public.department_records add column if not exists status text default 'pending';
alter table public.department_records add column if not exists priority text default 'medium';
alter table public.department_records add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.department_records add column if not exists created_by uuid references auth.users (id) on delete set null;

-- Default the audit column to the authenticated caller.
alter table public.department_records alter column created_by set default auth.uid();

create index if not exists department_records_dept_cat_idx
  on public.department_records (department, category);
create index if not exists department_records_dept_section_idx
  on public.department_records (department, section);
create index if not exists department_records_updated_idx
  on public.department_records (updated_at desc);
create index if not exists department_records_created_idx
  on public.department_records (created_at desc);

-- Keep updated_at truthful even if a client forgets to send it.
create or replace function public.touch_department_records()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists department_records_touch on public.department_records;
create trigger department_records_touch
  before update on public.department_records
  for each row execute function public.touch_department_records();

-- ---------------------------------------------------------------------
-- 3. Row Level Security for department_records
-- ---------------------------------------------------------------------
alter table public.department_records enable row level security;

-- SELECT
--   * admins see everything
--   * incident reports are visible only to Security heads and admins
--   * venue / equipment / run-of-show / speaker records are shared read-only
--     with every head for cross-department coordination
--   * every other record is private to its own department and section
drop policy if exists "department_records select access" on public.department_records;
create policy "department_records select access" on public.department_records
  for select to authenticated
  using (
    public.is_admin()
    or (
      category = 'incident'
      and lower(btrim(public.head_department())) = 'security'
    )
    or (
      category in ('venue', 'equipment', 'run_of_show', 'speaker')
      and public.head_department() is not null
    )
    or (
      category not in ('incident', 'venue', 'equipment', 'run_of_show', 'speaker')
      and lower(btrim(department)) = lower(btrim(public.head_department()))
      and (
        section is null
        or public.head_section() is null
        or section = public.head_section()
      )
    )
  );

-- INSERT: a head may only create rows for their own department. Heads with an
-- assigned section must stamp that section, so male/female divisions cannot
-- write into each other's workspace. Incident rows are Security-only.
drop policy if exists "department_records insert access" on public.department_records;
create policy "department_records insert access" on public.department_records
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      lower(btrim(department)) = lower(btrim(public.head_department()))
      and (category <> 'incident' or lower(btrim(public.head_department())) = 'security')
      and (public.head_section() is null or section = public.head_section())
    )
  );

-- UPDATE: same scope as INSERT, applied to both the existing row and the new one.
drop policy if exists "department_records update access" on public.department_records;
create policy "department_records update access" on public.department_records
  for update to authenticated
  using (
    public.is_admin()
    or (
      lower(btrim(department)) = lower(btrim(public.head_department()))
      and (category <> 'incident' or lower(btrim(public.head_department())) = 'security')
      and (public.head_section() is null or section = public.head_section())
    )
  )
  with check (
    public.is_admin()
    or (
      lower(btrim(department)) = lower(btrim(public.head_department()))
      and (category <> 'incident' or lower(btrim(public.head_department())) = 'security')
      and (public.head_section() is null or section = public.head_section())
    )
  );

-- DELETE: heads may delete only their own department's records; incidents stay
-- restricted to Security heads and admins.
drop policy if exists "department_records delete access" on public.department_records;
create policy "department_records delete access" on public.department_records
  for delete to authenticated
  using (
    public.is_admin()
    or (
      lower(btrim(department)) = lower(btrim(public.head_department()))
      and (category <> 'incident' or lower(btrim(public.head_department())) = 'security')
      and (public.head_section() is null or section = public.head_section())
    )
  );

grant select, insert, update, delete on public.department_records to authenticated;

-- ---------------------------------------------------------------------
-- 4. Strict registration access: Media/Press, Security, Volunteers only
-- ---------------------------------------------------------------------
alter table public.team_registrations enable row level security;

-- Remove any earlier head-scoped registration policies so no legacy policy
-- keeps granting access to the other eight departments. Admin and public
-- submission policies are untouched because their names never contain "head".
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'team_registrations'
      and (policyname ilike '%head%' or policyname ilike '%department%')
  loop
    execute format('drop policy if exists %I on public.team_registrations', pol.policyname);
  end loop;
end
$$;

drop policy if exists "department head read team" on public.team_registrations;
create policy "department head read team" on public.team_registrations
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_registration_head()
      and (
        team = public.head_department()
        or (public.head_department() = 'media_press' and team in ('media', 'media_press'))
      )
      and (
        public.head_section() is null
        or section = public.head_section()
      )
    )
  );

drop policy if exists "department head update team" on public.team_registrations;
create policy "department head update team" on public.team_registrations
  for update to authenticated
  using (
    public.is_admin()
    or (
      public.is_registration_head()
      and (
        team = public.head_department()
        or (public.head_department() = 'media_press' and team in ('media', 'media_press'))
      )
      and (
        public.head_section() is null
        or section = public.head_section()
      )
    )
  )
  with check (
    public.is_admin()
    or (
      public.is_registration_head()
      and (
        team = public.head_department()
        or (public.head_department() = 'media_press' and team in ('media', 'media_press'))
      )
      and (
        public.head_section() is null
        or section = public.head_section()
      )
    )
  );

-- ---------------------------------------------------------------------
-- 5. Verification (shows up in the SQL Editor output pane)
-- ---------------------------------------------------------------------
do $$
declare
  table_exists boolean;
  policy_count integer;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'department_records'
  ) into table_exists;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'department_records';

  raise notice 'department_records exists: %', table_exists;
  raise notice 'department_records RLS policies: %', policy_count;
  raise notice 'Registration heads restricted to: media_press, security, volunteers';
end
$$;
