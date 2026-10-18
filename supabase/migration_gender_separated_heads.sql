-- =====================================================================
-- WEST MUN 2027 — Department Heads Migration: Gender Division Architecture
--
-- Implements separate Male and Female Department Head roles for:
--   - Security & Protocol (Male: Yusef Saad / Female: Najla Rami)
--   - Media & Press       (Male: Fahad Al Kendi / Female: Selena)
--   - Volunteers          (Male: Saad Usman / Female: Maram Ali)
--
-- Shared Department Dashboards for:
--   - Design              (Mallak Abbas)
--   - Marketing           (Naya Barakat)
--   - Public Relations    (Mazen Alada & Dana Alnajjar)
--   - Human Resources     (Hoorain & Seif Ayman)
--   - Logistics           (Ahmed El Amir)
--   - IT & Infrastructure (Mohamed Magdi & Saleh)
--   - Ceremonies          (Sultana)
--   - DCC                 (Majd)
--
-- Enforces Row Level Security (RLS) so that male heads can NEVER query
-- female registrations (and vice versa), even via direct Supabase API requests.
--
-- Run this in Supabase > SQL Editor > New query.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extend public.team_registrations with section column
-- ---------------------------------------------------------------------
alter table public.team_registrations
  add column if not exists section text check (section in ('male', 'female') or section is null);

create index if not exists team_registrations_team_section_idx
  on public.team_registrations (team, section);

-- Grant insert permissions to public/anon including the new section column
grant insert (
  full_name,
  email,
  phone,
  institution,
  team,
  section,
  experience,
  statement,
  age_confirmed,
  consent_version
) on public.team_registrations to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Create or extend public.department_heads table
-- ---------------------------------------------------------------------
create table if not exists public.department_heads (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null check (char_length(email) between 5 and 120 and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$'),
  head_name   text not null default '',
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

-- Ensure columns exist if table was previously created
alter table public.department_heads
  add column if not exists head_name text not null default '',
  add column if not exists section text check (section in ('male', 'female') or section is null);

-- Database-level check constraint: gender-separated departments MUST specify 'male' or 'female'.
-- All other departments MUST have a null section.
alter table public.department_heads drop constraint if exists department_heads_section_check;
alter table public.department_heads add constraint department_heads_section_check check (
  (department in ('media_press', 'security', 'volunteers') and section in ('male', 'female'))
  or
  (department not in ('media_press', 'security', 'volunteers') and section is null)
);

-- Unique constraint for gender-separated departments: prevents duplicate heads for the same division
create unique index if not exists department_heads_dept_section_unique
  on public.department_heads (department, section)
  where department in ('media_press', 'security', 'volunteers');

-- ---------------------------------------------------------------------
-- 3. Security Helper Functions
-- ---------------------------------------------------------------------
create or replace function public.head_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select dh.department from public.department_heads dh
  where dh.id = auth.uid() and dh.active = true
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
  where dh.id = auth.uid() and dh.active = true
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- 4. Row Level Security for department_heads
-- ---------------------------------------------------------------------
alter table public.department_heads enable row level security;

-- Each head can only view their own assignment
drop policy if exists "heads read own record" on public.department_heads;
create policy "heads read own record" on public.department_heads
  for select to authenticated
  using (auth.uid() = id);

-- Administrators have full management rights
drop policy if exists "admin full access department_heads" on public.department_heads;
create policy "admin full access department_heads" on public.department_heads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.department_heads to authenticated;

-- ---------------------------------------------------------------------
-- 5. Row Level Security for team_registrations
-- ---------------------------------------------------------------------
alter table public.team_registrations enable row level security;

-- Head Read Policy: Department heads only see their exact department and exact section
drop policy if exists "department head read team" on public.team_registrations;
create policy "department head read team" on public.team_registrations
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.head_department() is not null
      and (
        team = public.head_department()
        or (public.head_department() = 'media_press' and team in ('media', 'media_press'))
      )
      and (
        case
          when public.head_section() is not null then section = public.head_section()
          else true
        end
      )
    )
  );

-- Head Update Policy: Heads can adjudicate status and notes for their division's candidates only
drop policy if exists "department head update team" on public.team_registrations;
create policy "department head update team" on public.team_registrations
  for update to authenticated
  using (
    public.is_admin()
    or (
      public.head_department() is not null
      and (
        team = public.head_department()
        or (public.head_department() = 'media_press' and team in ('media', 'media_press'))
      )
      and (
        case
          when public.head_section() is not null then section = public.head_section()
          else true
        end
      )
    )
  )
  with check (
    public.is_admin()
    or (
      public.head_department() is not null
      and (
        team = public.head_department()
        or (public.head_department() = 'media_press' and team in ('media', 'media_press'))
      )
      and (
        case
          when public.head_section() is not null then section = public.head_section()
          else true
        end
      )
    )
  );

grant select, update on public.team_registrations to authenticated;

-- ---------------------------------------------------------------------
-- 6. Safe Department Head Assignment Procedure
-- ---------------------------------------------------------------------
create or replace function public.assign_department_head(
  p_user_email text,
  p_head_name  text,
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
  -- Only administrators can assign department heads
  if not public.is_admin() then
    raise exception 'access_denied: only organizers can assign department heads' using errcode = '42501';
  end if;

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
  insert into public.department_heads (id, email, head_name, department, section, active, updated_at)
  values (v_user_id, lower(btrim(p_user_email)), btrim(p_head_name), p_department, p_section, true, now())
  on conflict (id) do update
    set head_name   = excluded.head_name,
        department  = excluded.department,
        section     = excluded.section,
        active      = true,
        updated_at  = now();

  return jsonb_build_object(
    'status', 'success',
    'user_id', v_user_id,
    'email', lower(btrim(p_user_email)),
    'head_name', btrim(p_head_name),
    'department', p_department,
    'section', p_section
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 7. SQL Assignment Templates for Future Account Provisioning
-- ---------------------------------------------------------------------
/*
-- Run these queries after creating the head accounts in Supabase Auth:

-- DESIGN (Mallak Abbas)
select public.assign_department_head('mallak@westmun.org', 'Mallak Abbas', 'design');

-- MARKETING (Naya Barakat)
select public.assign_department_head('naya@westmun.org', 'Naya Barakat', 'marketing');

-- MEDIA & PRESS (Separate Male & Female)
select public.assign_department_head('fahad@westmun.org', 'Fahad Al Kendi', 'media_press', 'male');
select public.assign_department_head('selena@westmun.org', 'Selena', 'media_press', 'female');

-- SECURITY & PROTOCOL (Separate Male & Female)
select public.assign_department_head('yusef@westmun.org', 'Yusef Saad', 'security', 'male');
select public.assign_department_head('najla@westmun.org', 'Najla Rami', 'security', 'female');

-- VOLUNTEERS (Separate Male & Female)
select public.assign_department_head('saad@westmun.org', 'Saad Usman', 'volunteers', 'male');
select public.assign_department_head('maram@westmun.org', 'Maram Ali', 'volunteers', 'female');

-- PUBLIC RELATIONS (Mazen Alada & Dana Alnajjar)
select public.assign_department_head('mazen@westmun.org', 'Mazen Alada', 'pr');
select public.assign_department_head('dana@westmun.org', 'Dana Alnajjar', 'pr');

-- HUMAN RESOURCES (Hoorain & Seif Ayman)
select public.assign_department_head('hoorain@westmun.org', 'Hoorain', 'hr');
select public.assign_department_head('seif@westmun.org', 'Seif Ayman', 'hr');

-- LOGISTICS (Ahmed El Amir)
select public.assign_department_head('ahmed@westmun.org', 'Ahmed El Amir', 'logistics');

-- IT & INFRASTRUCTURE (Mohamed Magdi & Saleh)
select public.assign_department_head('magdi@westmun.org', 'Mohamed Magdi', 'it');
select public.assign_department_head('saleh@westmun.org', 'Saleh', 'it');

-- CEREMONIES (Sultana)
select public.assign_department_head('sultana@westmun.org', 'Sultana', 'ceremonies');

-- DCC (Majd)
select public.assign_department_head('majd@westmun.org', 'Majd', 'dcc');
*/
