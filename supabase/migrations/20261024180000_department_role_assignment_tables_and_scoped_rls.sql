-- Persistent role/position and task assignments for department heads.
-- member_id intentionally supports either team_registrations.id or auth.users.id
-- so heads can assign roles to approved team members and co-head accounts.

create table if not exists public.department_positions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  department text not null,
  section text,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '',
  parent_position_id uuid references public.department_positions(id) on delete set null,
  member_id uuid,
  sort_order integer not null default 0
);

create table if not exists public.department_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  department text not null,
  section text,
  position_id uuid references public.department_positions(id) on delete set null,
  member_id uuid not null,
  supervisor_member_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '',
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  deadline timestamptz,
  location text not null default '',
  notes text not null default ''
);

create index if not exists department_positions_scope_idx on public.department_positions (department, section, sort_order);
create index if not exists department_positions_parent_idx on public.department_positions (parent_position_id);
create index if not exists department_positions_member_idx on public.department_positions (member_id);
create index if not exists department_tasks_scope_idx on public.department_tasks (department, section, status);
create index if not exists department_tasks_member_idx on public.department_tasks (member_id);
create index if not exists department_tasks_position_idx on public.department_tasks (position_id);

alter table public.department_positions enable row level security;
alter table public.department_tasks enable row level security;

grant select, insert, update, delete on public.department_positions to authenticated;
grant select, insert, update, delete on public.department_tasks to authenticated;

drop policy if exists "Heads manage scoped department positions" on public.department_positions;
create policy "Heads manage scoped department positions" on public.department_positions
for all to authenticated
using (exists (
  select 1 from public.department_heads h
  where h.user_id = (select auth.uid())
    and h.active = true
    and h.department = department_positions.department
    and (h.section is null or h.section is not distinct from department_positions.section)
))
with check (exists (
  select 1 from public.department_heads h
  where h.user_id = (select auth.uid())
    and h.active = true
    and h.department = department_positions.department
    and (h.section is null or h.section is not distinct from department_positions.section)
));

drop policy if exists "Heads manage scoped department tasks" on public.department_tasks;
create policy "Heads manage scoped department tasks" on public.department_tasks
for all to authenticated
using (exists (
  select 1 from public.department_heads h
  where h.user_id = (select auth.uid())
    and h.active = true
    and h.department = department_tasks.department
    and (h.section is null or h.section is not distinct from department_tasks.section)
))
with check (exists (
  select 1 from public.department_heads h
  where h.user_id = (select auth.uid())
    and h.active = true
    and h.department = department_tasks.department
    and (h.section is null or h.section is not distinct from department_tasks.section)
));
