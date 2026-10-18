-- =====================================================================
-- WEST MUN 2027 — Department Heads schema repair (SAFE / ADDITIVE)
--
-- Why this exists
-- ---------------
-- The repository contains three historical migrations that disagree:
--   * migration_department_heads.sql          -> primary key `id`, columns email/active
--   * migration_gender_separated_heads.sql    -> adds head_name/section (still `id`)
--   * migration_head_authorization_fix.sql    -> assumes primary key `user_id`
--
-- Depending on which files were run, the live table can be missing `user_id`,
-- `active`, `head_name`, `section`, `email` or `updated_at`. The application
-- writes and reads `user_id`, so PostgREST reports:
--   "Could not find the 'active' column of 'department_heads' in the schema cache"
-- (or the same error for whichever column is actually missing).
--
-- This script only ADDS missing columns, backfills them from data that already
-- exists, and recreates RLS policies. It does NOT drop the table, delete rows,
-- change Auth users/passwords, or disable RLS.
--
-- Run the whole file in Supabase > SQL Editor > New query.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. DIAGNOSTICS — read-only. Inspect the output before/after running.
-- ---------------------------------------------------------------------
-- 0a. Actual columns that the Data API can see right now.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'department_heads'
order by ordinal_position;

-- 0b. Existing rows (uses to_jsonb so it works even if columns are missing).
select to_jsonb(dh) as current_row
from public.department_heads dh
order by 1
limit 100;

-- 0c. The affected Auth user and any partial assignment.
select id, email, created_at
from auth.users
where id = '897ba3ff-a3d3-4761-846b-5aa87696f3eb';

select to_jsonb(dh) as affected_assignment
from public.department_heads dh
where to_jsonb(dh)->>'user_id' = '897ba3ff-a3d3-4761-846b-5aa87696f3eb'
   or to_jsonb(dh)->>'id' = '897ba3ff-a3d3-4761-846b-5aa87696f3eb';

-- ---------------------------------------------------------------------
-- 1. Canonical table if it does not exist yet.
--    (No-op when the table already exists.)
-- ---------------------------------------------------------------------
create table if not exists public.department_heads (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  id          uuid,
  email       text,
  head_name   text not null default '',
  department  text not null check (department in (
    'design', 'marketing', 'media_press', 'security', 'volunteers',
    'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc'
  )),
  section     text check (section in ('male', 'female') or section is null),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Add every column the application uses, if missing.
-- ---------------------------------------------------------------------
alter table public.department_heads add column if not exists user_id    uuid;
alter table public.department_heads add column if not exists id         uuid;
alter table public.department_heads add column if not exists email      text;
alter table public.department_heads add column if not exists head_name  text not null default '';
alter table public.department_heads add column if not exists section    text;
alter table public.department_heads add column if not exists active     boolean not null default true;
alter table public.department_heads add column if not exists created_at timestamptz not null default now();
alter table public.department_heads add column if not exists updated_at timestamptz not null default now();

-- `department` is required by every historical version, but guard anyway.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'department_heads'
      and column_name = 'department'
  ) then
    alter table public.department_heads add column department text;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Backfill the two identity columns and display fields.
--    user_id is the Auth UUID the application keys on; id is kept in sync
--    for compatibility with the original `id`-based schema.
-- ---------------------------------------------------------------------
update public.department_heads
set user_id = id
where user_id is null and id is not null;

update public.department_heads
set id = user_id
where id is null and user_id is not null;

-- Email from auth.users when the row has none.
update public.department_heads dh
set email = lower(btrim(u.email))
from auth.users u
where u.id = dh.user_id
  and (dh.email is null or btrim(dh.email) = '');

-- Display name from Auth metadata when the row has none.
update public.department_heads dh
set head_name = coalesce(u.raw_user_meta_data->>'full_name', '')
from auth.users u
where u.id = dh.user_id
  and (dh.head_name is null or btrim(dh.head_name) = '');

-- ---------------------------------------------------------------------
-- 4. Uniqueness used by the API's upsert(onConflict: 'user_id').
--    If this statement fails, the SELECT below lists the duplicate rows;
--    resolve them before retrying (this script never deletes data).
-- ---------------------------------------------------------------------
select user_id, count(*) as rows
from public.department_heads
where user_id is not null
group by user_id
having count(*) > 1;

create unique index if not exists department_heads_user_id_key
  on public.department_heads (user_id);

create index if not exists department_heads_department_idx
  on public.department_heads (department);

-- Gender-division departments may only have one head per division.
-- Existing installs may already have this index; this is a no-op then.
-- If legacy duplicate rows exist, report them instead of aborting the repair.
do $$
begin
  begin
    create unique index if not exists department_heads_dept_section_unique
      on public.department_heads (department, section)
      where department in ('media_press', 'security', 'volunteers');
  exception when unique_violation then
    raise notice 'department_heads_dept_section_unique was not created: duplicate department/section rows already exist. Review them manually; no rows were deleted.';
  end;
end $$;

-- ---------------------------------------------------------------------
-- 5. Section rule. Added NOT VALID so legacy rows are never deleted or
--    rewritten; it still applies to every INSERT/UPDATE from now on.
-- ---------------------------------------------------------------------
alter table public.department_heads drop constraint if exists department_heads_section_check;
alter table public.department_heads add constraint department_heads_section_check check (
  (department in ('media_press', 'security', 'volunteers') and section in ('male', 'female'))
  or
  (department not in ('media_press', 'security', 'volunteers') and section is null)
) not valid;

-- ---------------------------------------------------------------------
-- 6. updated_at trigger (function already exists in schema.sql).
-- ---------------------------------------------------------------------
drop trigger if exists department_heads_updated_at on public.department_heads;
create trigger department_heads_updated_at
  before update on public.department_heads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. Row Level Security — keep it ENABLED, rebuild the two policies the
--    app depends on. A head can only read their own row; organisers in
--    public.admins can manage all rows.
-- ---------------------------------------------------------------------
alter table public.department_heads enable row level security;

drop policy if exists "heads read own record" on public.department_heads;
drop policy if exists "department heads read own assignment" on public.department_heads;
create policy "department heads read own assignment" on public.department_heads
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "admin full access department_heads" on public.department_heads;
create policy "admin full access department_heads" on public.department_heads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Keep the super-admin policy from migration_super_admin.sql if present; it is
-- not dropped here. (is_admin() already covers every organiser row.)

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.department_heads to authenticated;

-- ---------------------------------------------------------------------
-- 8. Ask PostgREST to refresh its schema cache immediately.
--    If it still reports a missing column, open
--    Supabase Dashboard > Project Settings > API and click
--    "Reload schema cache" (or wait ~1 minute).
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 9. POST-RUN CHECK — both ids must match for every row, and the
--    affected user should show either no row (assignment never created)
--    or exactly one row with the correct user_id.
-- ---------------------------------------------------------------------
select user_id, id, email, head_name, department, section, active
from public.department_heads
where user_id is distinct from id
   or user_id = '897ba3ff-a3d3-4761-846b-5aa87696f3eb';

-- After this migration, use the website's "Retry department assignment"
-- button for UID 897ba3ff-a3d3-4761-846b-5aa87696f3eb. Do NOT create the
-- Auth user again. If you prefer SQL, fill in the department/division:
--
-- select public.assign_department_head(
--   (select email from auth.users where id = '897ba3ff-a3d3-4761-846b-5aa87696f3eb'),
--   (select coalesce(raw_user_meta_data->>'full_name', email) from auth.users where id = '897ba3ff-a3d3-4761-846b-5aa87696f3eb'),
--   'volunteers',   -- one of: design, marketing, media_press, security,
--                   -- volunteers, pr, hr, logistics, it, ceremonies, dcc
--   'male'          -- required for media_press / security / volunteers,
--                   -- must be NULL for every other department
-- );
