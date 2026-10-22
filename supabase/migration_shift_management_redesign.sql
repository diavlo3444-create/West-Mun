-- =====================================================================
-- WEST MUN 2027 — Shift Management Redesign Migration
--
-- Adds enhanced columns to public.wm_shifts and public.wm_shift_assignments,
-- creates compatibility views (wm_eb_shifts, wm_eb_shift_assignments, wm_eb_tasks),
-- and updates Row Level Security (RLS) policies so Department Heads
-- can manage shifts and assignments for their assigned department and section.
-- =====================================================================

-- 1. Extend public.wm_shifts
alter table public.wm_shifts
  add column if not exists description text not null default '';

-- Ensure status supports draft, open, published, completed, closed
alter table public.wm_shifts
  drop constraint if exists wm_shifts_status_check;

alter table public.wm_shifts
  add constraint wm_shifts_status_check
  check (status in ('draft', 'open', 'published', 'completed', 'closed'));

-- 2. Extend public.wm_shift_assignments
alter table public.wm_shift_assignments
  add column if not exists role_type text not null default 'team_member',
  add column if not exists responsibility text not null default '',
  add column if not exists station text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists is_supervisor boolean not null default false,
  add column if not exists assignee_name text not null default '',
  add column if not exists assignee_email text not null default '',
  add column if not exists member_id uuid;

-- Allow person_id to be nullable so co-heads or team members can be assigned directly
alter table public.wm_shift_assignments
  alter column person_id drop not null;

-- Ensure role_type check
alter table public.wm_shift_assignments
  drop constraint if exists wm_shift_assignments_role_type_check;

alter table public.wm_shift_assignments
  add constraint wm_shift_assignments_role_type_check
  check (role_type in ('co_head', 'team_member', 'supervisor', 'staff'));

-- Ensure status check
alter table public.wm_shift_assignments
  drop constraint if exists wm_shift_assignments_status_check;

alter table public.wm_shift_assignments
  add constraint wm_shift_assignments_status_check
  check (status in ('assigned', 'confirmed', 'completed', 'no_show', 'cancelled'));

-- Indices for fast lookups
create index if not exists wm_shifts_dept_starts_idx
  on public.wm_shifts (department, starts_at);

create index if not exists wm_shift_assignments_shift_id_idx
  on public.wm_shift_assignments (shift_id);

create index if not exists wm_shift_assignments_member_id_idx
  on public.wm_shift_assignments (member_id);

-- 3. Compatibility Views
create or replace view public.wm_eb_shifts as
  select * from public.wm_shifts;

create or replace view public.wm_eb_shift_assignments as
  select * from public.wm_shift_assignments;

create or replace view public.wm_eb_tasks as
  select * from public.wm_project_tasks;

-- 4. RLS for wm_shift_assignments
alter table public.wm_shift_assignments enable row level security;

drop policy if exists "heads_manage_wm_shift_assignments" on public.wm_shift_assignments;
create policy "heads_manage_wm_shift_assignments" on public.wm_shift_assignments
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.wm_shifts s
      where s.id = wm_shift_assignments.shift_id
      and s.department = public.head_department()
      and (s.section is null or public.head_section() is null or s.section = public.head_section())
    )
  );

-- 5. RLS for department_heads so heads can view Co-Heads in their department
drop policy if exists "heads read own and coheads" on public.department_heads;
create policy "heads read own and coheads" on public.department_heads
  for select to authenticated
  using (
    auth.uid() = id
    or public.is_admin()
    or (
      department = public.head_department()
      and (section is null or public.head_section() is null or section = public.head_section())
    )
  );
