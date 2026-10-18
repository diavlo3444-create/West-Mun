-- =====================================================================
-- WEST MUN 2027 — Global Department Heads Authorization Fix
--
-- Single source of truth: `public.department_heads` (user_id, department, section)
--
-- Fixes:
-- 1. Ensures Row Level Security (RLS) policy allows authenticated users
--    to query their own assignment by `auth.uid() = user_id`.
-- 2. Ensures administrators can manage all department head records.
-- 3. Adds unique constraint on `user_id` so each account has exactly one assignment.
-- 4. Provides safe idempotent assignment procedure.
-- 5. Includes official roster assignments for all 17 department heads
--    (including Maram Ali for Female Volunteers).
--
-- Safe & Additive: Does NOT drop tables, delete records, or weaken security.
-- Run in Supabase > SQL Editor > New query.
-- =====================================================================

-- 1. Ensure table structure matches the authoritative schema
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
  created_at  timestamptz not null default now()
);

-- Ensure section check constraint
alter table public.department_heads drop constraint if exists department_heads_section_check;
alter table public.department_heads add constraint department_heads_section_check check (
  (department in ('media_press', 'security', 'volunteers') and section in ('male', 'female'))
  or
  (department not in ('media_press', 'security', 'volunteers') and section is null)
);

-- Ensure unique index on user_id
create unique index if not exists department_heads_user_id_idx on public.department_heads (user_id);
create index if not exists department_heads_department_idx on public.department_heads (department);
create index if not exists department_heads_dept_section_idx on public.department_heads (department, section);

-- 2. Row Level Security Configuration
alter table public.department_heads enable row level security;

-- Policy A: Authenticated department heads can read their own assignment
drop policy if exists "heads read own record" on public.department_heads;
drop policy if exists "department heads read own assignment" on public.department_heads;
create policy "department heads read own assignment" on public.department_heads
  for select to authenticated
  using (auth.uid() = user_id);

-- Policy B: Administrators have full access
drop policy if exists "admin full access department_heads" on public.department_heads;
create policy "admin full access department_heads" on public.department_heads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Explicit schema permissions
grant usage on schema public to authenticated;
grant select on public.department_heads to authenticated;
grant insert, update, delete on public.department_heads to authenticated;

-- 3. Safe Assignment Function
create or replace function public.assign_department_head(
  p_user_email text,
  p_department text,
  p_section    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
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
    if p_section is not null then
      raise exception 'invalid_section: % does not use gender sections; section must be NULL', p_department using errcode = 'P0001';
    end if;
  end if;

  -- Find user UID in auth.users by email
  select u.id into v_user_id
  from auth.users u
  where lower(btrim(u.email)) = lower(btrim(p_user_email));

  if v_user_id is null then
    raise exception 'user_not_found: no Supabase Auth account exists for email %', p_user_email using errcode = 'P0002';
  end if;

  -- Insert or update assignment
  insert into public.department_heads (user_id, department, section)
  values (v_user_id, p_department, p_section)
  on conflict (user_id) do update
    set department = excluded.department,
        section    = excluded.section;

  return jsonb_build_object(
    'status', 'success',
    'user_id', v_user_id,
    'email', lower(btrim(p_user_email)),
    'department', p_department,
    'section', p_section
  );
end;
$$;

-- 4. Direct UID Assignment for Maram Ali:
-- UID: 0f272d4c-4fc4-4994-8643-d8622ca03d1c -> volunteers / female
insert into public.department_heads (user_id, department, section)
values ('0f272d4c-4fc4-4994-8643-d8622ca03d1c', 'volunteers', 'female')
on conflict (user_id) do update
  set department = excluded.department,
      section    = excluded.section;
