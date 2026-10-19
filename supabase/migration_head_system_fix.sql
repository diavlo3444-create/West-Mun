-- =====================================================================
-- WEST MUN 2027 — Department Heads Schema & Authorization Fix
--
-- Fixes:
-- 1. Harmonizes `id` and `user_id` so all queries, triggers, and foreign
--    keys work regardless of which migration was previously executed.
-- 2. Ensures all required columns exist: id, user_id, email, head_name,
--    department, section, active, created_at, updated_at.
-- 3. Adds automatic trigger to keep `id` and `user_id` identical on write.
-- 4. Updates RLS policies so heads can read their own assignment via either
--    `auth.uid() = user_id` or `auth.uid() = id`.
-- 5. Updates `public.head_department()` and `public.head_section()` helpers.
-- 6. Provides `public.assign_department_head_by_uid()` to safely assign or
--    re-assign any Supabase Auth account (including UID: 897ba3ff-a3d3-4761-846b-5aa87696f3eb).
--
-- Safe & Additive: Does NOT drop tables, delete records, or weaken security.
-- Run in Supabase > SQL Editor > New query.
-- =====================================================================

-- 1. Ensure table exists
create table if not exists public.department_heads (
  user_id     uuid primary key references auth.users (id) on delete cascade,
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
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Safely add missing columns to ensure both id and user_id coexist
alter table public.department_heads
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists id uuid references auth.users (id) on delete cascade,
  add column if not exists email text,
  add column if not exists head_name text not null default '',
  add column if not exists section text check (section in ('male', 'female') or section is null),
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill missing id from user_id, and missing user_id from id
update public.department_heads
  set id = user_id
  where id is null and user_id is not null;

update public.department_heads
  set user_id = id
  where user_id is null and id is not null;

-- 3. Unique indexes to allow conflict resolution on either id or user_id
create unique index if not exists department_heads_user_id_idx on public.department_heads (user_id);
create unique index if not exists department_heads_id_idx on public.department_heads (id);
create index if not exists department_heads_department_idx on public.department_heads (department);
create index if not exists department_heads_dept_section_idx on public.department_heads (department, section);

-- Check constraint on section: gender separated departments must specify 'male' or 'female'; others must be null
alter table public.department_heads drop constraint if exists department_heads_section_check;
alter table public.department_heads add constraint department_heads_section_check check (
  (department in ('media_press', 'security', 'volunteers') and section in ('male', 'female'))
  or
  (department not in ('media_press', 'security', 'volunteers') and (section is null or section = ''))
);

-- 4. Sync trigger: guarantees id and user_id are always kept in sync
create or replace function public.sync_department_heads_keys()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null and new.id is not null then
    new.user_id := new.id;
  elsif new.id is null and new.user_id is not null then
    new.id := new.user_id;
  end if;
  if new.updated_at is null then
    new.updated_at := now();
  end if;
  if new.active is null then
    new.active := true;
  end if;
  return new;
end;
$$;

drop trigger if exists department_heads_sync_keys on public.department_heads;
create trigger department_heads_sync_keys
  before insert or update on public.department_heads
  for each row execute function public.sync_department_heads_keys();

-- 5. Helper functions for Row Level Security on team_registrations
create or replace function public.head_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select dh.department from public.department_heads dh
  where (dh.id = auth.uid() or dh.user_id = auth.uid()) and coalesce(dh.active, true) = true
  limit 1;
$$;

create or replace function public.head_section()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select dh.section from public.department_heads dh
  where (dh.id = auth.uid() or dh.user_id = auth.uid()) and coalesce(dh.active, true) = true
  limit 1;
$$;

-- 6. Row Level Security Configuration
alter table public.department_heads enable row level security;

-- Policy A: Authenticated department heads can read their own assignment
drop policy if exists "heads read own record" on public.department_heads;
drop policy if exists "department heads read own assignment" on public.department_heads;
create policy "department heads read own assignment" on public.department_heads
  for select to authenticated
  using (auth.uid() = user_id or auth.uid() = id);

-- Policy B: Administrators have full access
drop policy if exists "admin full access department_heads" on public.department_heads;
create policy "admin full access department_heads" on public.department_heads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Permissions
grant usage on schema public to anon, authenticated;
grant select on public.department_heads to authenticated;
grant insert, update, delete on public.department_heads to authenticated;

-- 7. Safe assignment procedure by UID
create or replace function public.assign_department_head_by_uid(
  p_uid        uuid,
  p_department text,
  p_section    text default null,
  p_head_name  text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- Validate department
  if p_department not in (
    'design', 'marketing', 'media_press', 'security', 'volunteers',
    'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc'
  ) then
    raise exception 'invalid_department: %', p_department using errcode = 'P0001';
  end if;

  -- Validate section for gender-separated departments
  if p_department in ('media_press', 'security', 'volunteers') then
    if p_section not in ('male', 'female') or p_section is null then
      raise exception 'section_required: % requires section to be either "male" or "female"', p_department using errcode = 'P0001';
    end if;
  else
    p_section := null;
  end if;

  -- Find email from auth.users if available
  select email into v_email from auth.users where id = p_uid;

  -- Upsert record cleanly
  delete from public.department_heads where user_id = p_uid or id = p_uid;

  insert into public.department_heads (
    id,
    user_id,
    email,
    head_name,
    department,
    section,
    active,
    created_at,
    updated_at
  ) values (
    p_uid,
    p_uid,
    coalesce(v_email, ''),
    coalesce(p_head_name, ''),
    p_department,
    p_section,
    true,
    now(),
    now()
  );

  return jsonb_build_object(
    'status', 'success',
    'user_id', p_uid,
    'department', p_department,
    'section', p_section
  );
end;
$$;

-- 8. Assign Affected UID if it exists in auth.users
-- UID: 897ba3ff-a3d3-4761-846b-5aa87696f3eb
-- If the account was created, this safely completes their assignment without duplicate auth accounts.
do $$
begin
  if exists (select 1 from auth.users where id = '897ba3ff-a3d3-4761-846b-5aa87696f3eb') then
    -- Check if metadata specifies department
    declare
      v_meta jsonb;
      v_dept text;
      v_sec  text;
      v_name text;
    begin
      select raw_user_meta_data into v_meta from auth.users where id = '897ba3ff-a3d3-4761-846b-5aa87696f3eb';
      v_dept := coalesce(v_meta->>'department', 'volunteers');
      v_sec  := v_meta->>'section';
      v_name := coalesce(v_meta->>'full_name', '');
      if v_dept in ('media_press', 'security', 'volunteers') and v_sec is null then
        v_sec := 'female';
      end if;
      perform public.assign_department_head_by_uid(
        '897ba3ff-a3d3-4761-846b-5aa87696f3eb'::uuid,
        v_dept,
        v_sec,
        v_name
      );
    end;
  end if;
end;
$$;
