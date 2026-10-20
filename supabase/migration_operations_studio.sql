-- =====================================================================
-- WEST MUN 2027 — Operations Studio (Custom Roles, Staffing, Projects, Shifts & Windows)
--
-- This migration is additive and idempotent. It creates the tables and RLS
-- policies supporting the Operations Studio workflow for department heads
-- and administrative oversight.
--
-- Tables created:
-- 1. public.wm_people: Department custom operational roles, staffing & personnel
-- 2. public.wm_projects: Department production projects, media, and design campaigns
-- 3. public.wm_project_stages: Workflow stages for production projects
-- 4. public.wm_project_members: Team assignments to projects
-- 5. public.wm_project_tasks: Actionable tasks & deliverables within projects
-- 6. public.wm_shifts: Department operational shifts & coverage slots
-- 7. public.wm_shift_assignments: Individual shift roster assignments & status
-- 8. public.wm_registration_windows: Department registration window controls
-- =====================================================================

-- 1. WM_PEOPLE
create table if not exists public.wm_people (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text,
  phone text,
  auth_user_id uuid references auth.users(id) on delete set null,
  source_type text not null default 'manual',
  source_record_id text,
  department text not null,
  section text,
  role_title text not null,
  status text not null default 'active',
  private_notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. WM_PROJECTS
create table if not exists public.wm_projects (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  section text,
  title text not null,
  brief text not null default '',
  status text not null default 'planning',
  due_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. WM_PROJECT_STAGES
create table if not exists public.wm_project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wm_projects(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  status text not null default 'todo',
  created_at timestamptz not null default now()
);

-- 4. WM_PROJECT_MEMBERS
create table if not exists public.wm_project_members (
  project_id uuid not null references public.wm_projects(id) on delete cascade,
  person_id uuid not null references public.wm_people(id) on delete cascade,
  project_role text not null default '',
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, person_id)
);

-- 5. WM_PROJECT_TASKS
create table if not exists public.wm_project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wm_projects(id) on delete cascade,
  stage_id uuid references public.wm_project_stages(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium',
  assigned_person_id uuid references public.wm_people(id) on delete set null,
  due_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. WM_SHIFTS
create table if not exists public.wm_shifts (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  section text,
  title text not null,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null default 4,
  status text not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. WM_SHIFT_ASSIGNMENTS
create table if not exists public.wm_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.wm_shifts(id) on delete cascade,
  person_id uuid not null references public.wm_people(id) on delete cascade,
  status text not null default 'assigned',
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, person_id)
);

-- 8. WM_REGISTRATION_WINDOWS
create table if not exists public.wm_registration_windows (
  team text primary key,
  is_open boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Seed default registration windows if empty
insert into public.wm_registration_windows (team, is_open)
values
  ('volunteers', true),
  ('security', true),
  ('media_press', true),
  ('design', true),
  ('pr_sponsorship', true),
  ('hr', true)
on conflict (team) do nothing;

-- Enable Row Level Security (RLS) on all operations tables
alter table public.wm_people enable row level security;
alter table public.wm_projects enable row level security;
alter table public.wm_project_stages enable row level security;
alter table public.wm_project_members enable row level security;
alter table public.wm_project_tasks enable row level security;
alter table public.wm_shifts enable row level security;
alter table public.wm_shift_assignments enable row level security;
alter table public.wm_registration_windows enable row level security;

-- Administrators have full access
drop policy if exists "admins_manage_wm_people" on public.wm_people;
create policy "admins_manage_wm_people" on public.wm_people
  for all using (public.is_admin());

drop policy if exists "admins_manage_wm_projects" on public.wm_projects;
create policy "admins_manage_wm_projects" on public.wm_projects
  for all using (public.is_admin());

drop policy if exists "admins_manage_wm_project_stages" on public.wm_project_stages;
create policy "admins_manage_wm_project_stages" on public.wm_project_stages
  for all using (public.is_admin());

drop policy if exists "admins_manage_wm_project_members" on public.wm_project_members;
create policy "admins_manage_wm_project_members" on public.wm_project_members
  for all using (public.is_admin());

drop policy if exists "admins_manage_wm_project_tasks" on public.wm_project_tasks;
create policy "admins_manage_wm_project_tasks" on public.wm_project_tasks
  for all using (public.is_admin());

drop policy if exists "admins_manage_wm_shifts" on public.wm_shifts;
create policy "admins_manage_wm_shifts" on public.wm_shifts
  for all using (public.is_admin());

drop policy if exists "admins_manage_wm_shift_assignments" on public.wm_shift_assignments;
create policy "admins_manage_wm_shift_assignments" on public.wm_shift_assignments
  for all using (public.is_admin());

drop policy if exists "admins_manage_wm_registration_windows" on public.wm_registration_windows;
create policy "admins_manage_wm_registration_windows" on public.wm_registration_windows
  for all using (public.is_admin());

-- Department heads access their department records
drop policy if exists "heads_manage_wm_people" on public.wm_people;
create policy "heads_manage_wm_people" on public.wm_people
  for all using (
    department = public.head_department() and
    (section is null or public.head_section() is null or section = public.head_section())
  );

drop policy if exists "heads_manage_wm_projects" on public.wm_projects;
create policy "heads_manage_wm_projects" on public.wm_projects
  for all using (
    department = public.head_department() and
    (section is null or public.head_section() is null or section = public.head_section())
  );

drop policy if exists "heads_manage_wm_shifts" on public.wm_shifts;
create policy "heads_manage_wm_shifts" on public.wm_shifts
  for all using (
    department = public.head_department() and
    (section is null or public.head_section() is null or section = public.head_section())
  );

drop policy if exists "public_read_registration_windows" on public.wm_registration_windows;
create policy "public_read_registration_windows" on public.wm_registration_windows
  for select using (true);
