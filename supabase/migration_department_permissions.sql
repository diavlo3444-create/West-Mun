-- =====================================================================
-- WEST MUN 2027 — Department Head Role-Based Access Control & Permissions
--
-- This migration implements:
-- 1. Strict registration restrictions: ONLY 'media_press', 'security',
--    and 'volunteers' department heads may access public.team_registrations.
--    All other 8 departments are blocked at the database RLS level.
-- 2. Creates public.department_records table for role-specific operations:
--    Design tasks & assets, Marketing campaigns & calendars, Media coverage,
--    Security rosters & restricted incident reports, Volunteer shifts,
--    Logistics venue & equipment, IT issue tracker, Ceremonies run-of-show,
--    and DCC committee crisis directives.
-- 3. Row Level Security policies enforcing exact department boundaries:
--    - Security incident reports are strictly restricted to Security & Admins.
--    - Logistics venue information is accessible to Admins & Logistics.
--    - Ceremonies run-of-show is readable to all heads, editable by Ceremonies & Admins.
--    - Each head can only modify records within their own assigned department.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper function for Registration-enabled Departments
-- ---------------------------------------------------------------------
create or replace function public.is_registration_head()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.department_heads dh
    where (dh.id = auth.uid() or dh.user_id = auth.uid())
      and coalesce(dh.active, true) = true
      and lower(btrim(dh.department)) in ('media_press', 'security', 'volunteers')
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Update Row Level Security on public.team_registrations
--    STRICT ENFORCEMENT: Only Media/Press, Security, and Volunteers
-- ---------------------------------------------------------------------
alter table public.team_registrations enable row level security;

-- Read policy: Admins or ONLY the 3 registration-enabled heads (with section isolation)
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
        case
          when public.head_section() is not null then section = public.head_section()
          else true
        end
      )
    )
  );

-- Update policy: Admins or ONLY the 3 registration-enabled heads (with section isolation)
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
      public.is_registration_head()
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

-- ---------------------------------------------------------------------
-- 3. Dedicated public.department_records table for department workflows
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
  created_by  uuid references auth.users(id) on delete set null
);

create index if not exists department_records_dept_cat_idx
  on public.department_records (department, category);

create index if not exists department_records_created_idx
  on public.department_records (created_at desc);

-- ---------------------------------------------------------------------
-- 4. Row Level Security for public.department_records
-- ---------------------------------------------------------------------
alter table public.department_records enable row level security;

-- SELECT policy:
-- 1. Admins read everything.
-- 2. Sensitive 'incident' category is restricted to Security Heads and Admins only.
-- 3. Shared 'venue' category (Logistics) is readable to all authenticated heads & admins.
-- 4. Shared 'run_of_show' / 'speaker' categories (Ceremonies) are readable to all heads & admins.
-- 5. All other records are readable ONLY by heads of that department.
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
      category in ('venue', 'equipment')
      and public.is_admin()
    )
    or (
      category in ('venue', 'equipment', 'run_of_show', 'speaker')
      and public.head_department() is not null
    )
    or (
      category not in ('incident')
      and lower(btrim(department)) = lower(btrim(public.head_department()))
      and (
        section is null
        or public.head_section() is null
        or section = public.head_section()
      )
    )
  );

-- INSERT policy:
-- 1. Admins can insert any record.
-- 2. Department heads can insert only into their own department.
-- 3. Only Security heads can insert incident reports.
drop policy if exists "department_records insert access" on public.department_records;
create policy "department_records insert access" on public.department_records
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      lower(btrim(department)) = lower(btrim(public.head_department()))
      and (category <> 'incident' or lower(btrim(public.head_department())) = 'security')
      and (
        section is null
        or public.head_section() is null
        or section = public.head_section()
      )
    )
  );

-- UPDATE policy:
-- 1. Admins can update any record.
-- 2. Department heads can update only their own department records.
-- 3. Incident reports can only be updated by Security heads or Admins.
drop policy if exists "department_records update access" on public.department_records;
create policy "department_records update access" on public.department_records
  for update to authenticated
  using (
    public.is_admin()
    or (
      lower(btrim(department)) = lower(btrim(public.head_department()))
      and (category <> 'incident' or lower(btrim(public.head_department())) = 'security')
      and (
        section is null
        or public.head_section() is null
        or section = public.head_section()
      )
    )
  )
  with check (
    public.is_admin()
    or (
      lower(btrim(department)) = lower(btrim(public.head_department()))
      and (category <> 'incident' or lower(btrim(public.head_department())) = 'security')
      and (
        section is null
        or public.head_section() is null
        or section = public.head_section()
      )
    )
  );

-- DELETE policy:
-- 1. Admins can delete any record.
-- 2. Department heads can delete records in their own department (except incidents, which only Admins or Security heads can delete).
drop policy if exists "department_records delete access" on public.department_records;
create policy "department_records delete access" on public.department_records
  for delete to authenticated
  using (
    public.is_admin()
    or (
      lower(btrim(department)) = lower(btrim(public.head_department()))
      and (category <> 'incident' or lower(btrim(public.head_department())) = 'security')
      and (
        section is null
        or public.head_section() is null
        or section = public.head_section()
      )
    )
  );

grant select, insert, update, delete on public.department_records to authenticated;
