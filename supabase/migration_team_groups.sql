-- =====================================================================
-- WEST MUN 2027 — Custom Team Groups & Bulk Shift Assignment Migration
--
-- Adds tables and Row Level Security (RLS) for department Heads to
-- create custom groups of team members and assign them to shifts in bulk.
--
-- Tables:
-- 1. public.wm_team_groups: Custom groups created by department heads
-- 2. public.wm_team_group_members: Membership linking members to groups
-- =====================================================================

-- 1. Create wm_team_groups table
create table if not exists public.wm_team_groups (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  section text,
  name text not null check (char_length(trim(name)) >= 1),
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wm_team_groups_dept_sec_idx
  on public.wm_team_groups (department, section);

-- 2. Create wm_team_group_members table
create table if not exists public.wm_team_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.wm_team_groups(id) on delete cascade,
  member_id uuid,
  person_id uuid references public.wm_people(id) on delete set null,
  member_name text not null default '',
  member_email text not null default '',
  role_title text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists wm_team_group_members_group_idx
  on public.wm_team_group_members (group_id);

create unique index if not exists wm_team_group_members_uniq_idx
  on public.wm_team_group_members (group_id, member_email);

-- 3. Automatic updated_at trigger for wm_team_groups
drop trigger if exists wm_team_groups_updated_at on public.wm_team_groups;
create trigger wm_team_groups_updated_at
  before update on public.wm_team_groups
  for each row execute function public.set_updated_at();

-- 4. Enable Row Level Security (RLS)
alter table public.wm_team_groups enable row level security;
alter table public.wm_team_group_members enable row level security;

-- Administrators have full management rights
drop policy if exists "admins_manage_wm_team_groups" on public.wm_team_groups;
create policy "admins_manage_wm_team_groups" on public.wm_team_groups
  for all using (public.is_admin());

drop policy if exists "admins_manage_wm_team_group_members" on public.wm_team_group_members;
create policy "admins_manage_wm_team_group_members" on public.wm_team_group_members
  for all using (public.is_admin());

-- Department heads access their department records only
drop policy if exists "heads_manage_wm_team_groups" on public.wm_team_groups;
create policy "heads_manage_wm_team_groups" on public.wm_team_groups
  for all using (
    public.is_admin()
    or (
      department = public.head_department()
      and (section is null or public.head_section() is null or section = public.head_section())
    )
  );

drop policy if exists "heads_manage_wm_team_group_members" on public.wm_team_group_members;
create policy "heads_manage_wm_team_group_members" on public.wm_team_group_members
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.wm_team_groups g
      where g.id = wm_team_group_members.group_id
      and g.department = public.head_department()
      and (g.section is null or public.head_section() is null or g.section = public.head_section())
    )
  );
