-- =====================================================================
-- WEST MUN 2027 — Department Roles & Organizational Hierarchy Migration
--
-- This migration creates the tables, functions, triggers, and RLS policies
-- supporting the Roles and Organizational Hierarchy Management system for
-- the Media, Volunteer, and Security departments.
--
-- Tables:
-- 1. public.department_positions:
--    Organizational positions, hierarchy reporting tree, and member assignments.
-- 2. public.department_tasks:
--    Actionable roles, responsibilities, tasks, priorities, and deadlines.
-- 3. public.department_task_logs:
--    Audit trail for task creation, status updates, and reassignments.
--
-- Enforces:
-- - Department and section isolation via Supabase RLS.
-- - Only approved candidates (status = 'accepted') from team_registrations can be assigned.
-- - Circular hierarchy prevention trigger (a position cannot report to itself or its descendants).
-- - Cascade-safe deletion (removing a position does not delete member records or break tasks).
-- - Prepared for the future member portal (authenticated members can read their assigned tasks).
--
-- Safe to run in Supabase > SQL Editor > New query.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Create public.department_positions
-- ---------------------------------------------------------------------
create table if not exists public.department_positions (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  department          text not null check (department in ('media_press', 'security', 'volunteers', 'design', 'marketing', 'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc')),
  section             text check (section in ('male', 'female') or section is null),
  title               text not null check (char_length(btrim(title)) between 2 and 150),
  description         text not null default '' check (char_length(description) <= 3000),
  parent_position_id  uuid references public.department_positions (id) on delete set null,
  member_id           uuid references public.team_registrations (id) on delete set null,
  sort_order          integer not null default 0,
  created_by          uuid references auth.users (id) on delete set null,
  constraint department_positions_no_self_parent check (parent_position_id is null or parent_position_id <> id)
);

create index if not exists idx_department_positions_dept_sec
  on public.department_positions (department, section);

create index if not exists idx_department_positions_parent
  on public.department_positions (parent_position_id);

create index if not exists idx_department_positions_member
  on public.department_positions (member_id);

-- ---------------------------------------------------------------------
-- 2. Create public.department_tasks
-- ---------------------------------------------------------------------
create table if not exists public.department_tasks (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  department            text not null check (department in ('media_press', 'security', 'volunteers', 'design', 'marketing', 'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc')),
  section               text check (section in ('male', 'female') or section is null),
  position_id           uuid references public.department_positions (id) on delete set null,
  member_id             uuid not null references public.team_registrations (id) on delete cascade,
  supervisor_member_id  uuid references public.team_registrations (id) on delete set null,
  title                 text not null check (char_length(btrim(title)) between 2 and 180),
  description           text not null default '' check (char_length(description) <= 5000),
  priority              text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status                text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  deadline              timestamptz,
  location              text not null default '' check (char_length(location) <= 150),
  notes                 text not null default '' check (char_length(notes) <= 3000),
  created_by            uuid references auth.users (id) on delete set null
);

create index if not exists idx_department_tasks_dept_sec
  on public.department_tasks (department, section);

create index if not exists idx_department_tasks_member
  on public.department_tasks (member_id);

create index if not exists idx_department_tasks_supervisor
  on public.department_tasks (supervisor_member_id);

create index if not exists idx_department_tasks_status
  on public.department_tasks (status);

-- ---------------------------------------------------------------------
-- 3. Create public.department_task_logs (Audit Trail)
-- ---------------------------------------------------------------------
create table if not exists public.department_task_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  task_id     uuid not null references public.department_tasks (id) on delete cascade,
  changed_by  uuid references auth.users (id) on delete set null,
  action      text not null check (action in ('created', 'status_changed', 'reassigned', 'updated', 'deleted')),
  details     jsonb not null default '{}'::jsonb
);

create index if not exists idx_department_task_logs_task
  on public.department_task_logs (task_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4. Circular Hierarchy Prevention Trigger
-- ---------------------------------------------------------------------
create or replace function public.check_position_hierarchy_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_parent uuid;
  v_depth integer := 0;
  v_max_depth integer := 100;
begin
  if new.parent_position_id is null then
    return new;
  end if;

  if new.parent_position_id = new.id then
    raise exception 'circular_hierarchy_detected: A position cannot be its own parent.' using errcode = 'P0001';
  end if;

  v_current_parent := new.parent_position_id;

  while v_current_parent is not null loop
    v_depth := v_depth + 1;
    if v_depth > v_max_depth then
      raise exception 'circular_hierarchy_detected: Hierarchy depth limit exceeded (max 100 levels).' using errcode = 'P0001';
    end if;

    if v_current_parent = new.id then
      raise exception 'circular_hierarchy_detected: A position cannot report to itself or any of its descendants.' using errcode = 'P0001';
    end if;

    select p.parent_position_id into v_current_parent
    from public.department_positions p
    where p.id = v_current_parent;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_prevent_position_cycle on public.department_positions;
create trigger trg_prevent_position_cycle
  before insert or update of parent_position_id on public.department_positions
  for each row
  execute function public.check_position_hierarchy_cycle();

-- ---------------------------------------------------------------------
-- 5. Approved Member Validation Trigger
-- Ensures only accepted/approved members of the matching department and
-- section can be assigned to positions and tasks.
-- ---------------------------------------------------------------------
create or replace function public.validate_position_member_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_team text;
  v_sec text;
begin
  if new.member_id is not null then
    select tr.status, tr.team, tr.section
    into v_status, v_team, v_sec
    from public.team_registrations tr
    where tr.id = new.member_id;

    if not found then
      raise exception 'invalid_member: Member record does not exist.' using errcode = 'P0001';
    end if;

    if v_status <> 'accepted' then
      raise exception 'unapproved_member_assignment: Only approved members (status: accepted) may be assigned to roles or positions. Current status: %', v_status using errcode = 'P0001';
    end if;

    -- Department match (allowing 'media' / 'media_press' equivalence)
    if not (
      v_team = new.department
      or (new.department = 'media_press' and v_team in ('media', 'media_press'))
    ) then
      raise exception 'department_mismatch: Member belongs to department %, but position is in %.', v_team, new.department using errcode = 'P0001';
    end if;

    -- Section match (if gender-separated)
    if new.section is not null and v_sec is not null and lower(new.section) <> lower(v_sec) then
      raise exception 'section_mismatch: Member belongs to % section, but position is in % section.', v_sec, new.section using errcode = 'P0001';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_validate_position_member on public.department_positions;
create trigger trg_validate_position_member
  before insert or update on public.department_positions
  for each row
  execute function public.validate_position_member_assignment();

create or replace function public.validate_task_member_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_team text;
  v_sec text;
begin
  -- Validate assigned member
  select tr.status, tr.team, tr.section
  into v_status, v_team, v_sec
  from public.team_registrations tr
  where tr.id = new.member_id;

  if not found then
    raise exception 'invalid_member: Assigned member record does not exist.' using errcode = 'P0001';
  end if;

  if v_status <> 'accepted' then
    raise exception 'unapproved_member_assignment: Only approved members (status: accepted) may be assigned tasks. Current status: %', v_status using errcode = 'P0001';
  end if;

  if not (
    v_team = new.department
    or (new.department = 'media_press' and v_team in ('media', 'media_press'))
  ) then
    raise exception 'department_mismatch: Member belongs to department %, but task is in %.', v_team, new.department using errcode = 'P0001';
  end if;

  if new.section is not null and v_sec is not null and lower(new.section) <> lower(v_sec) then
    raise exception 'section_mismatch: Member belongs to % section, but task is in % section.', v_sec, new.section using errcode = 'P0001';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_validate_task_member on public.department_tasks;
create trigger trg_validate_task_member
  before insert or update on public.department_tasks
  for each row
  execute function public.validate_task_member_assignment();

-- ---------------------------------------------------------------------
-- 6. Row Level Security Policies
-- ---------------------------------------------------------------------
alter table public.department_positions enable row level security;
alter table public.department_tasks enable row level security;
alter table public.department_task_logs enable row level security;

-- Positions RLS:
-- 1. Admins have full access
drop policy if exists "admin full access department_positions" on public.department_positions;
create policy "admin full access department_positions" on public.department_positions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Department heads can manage positions in their own department & section
drop policy if exists "head manage own department_positions" on public.department_positions;
create policy "head manage own department_positions" on public.department_positions
  for all to authenticated
  using (
    public.head_department() is not null
    and (
      department = public.head_department()
      or (public.head_department() = 'media_press' and department in ('media', 'media_press'))
    )
    and (
      case
        when public.head_section() is not null then section = public.head_section()
        else true
      end
    )
  )
  with check (
    public.head_department() is not null
    and (
      department = public.head_department()
      or (public.head_department() = 'media_press' and department in ('media', 'media_press'))
    )
    and (
      case
        when public.head_section() is not null then section = public.head_section()
        else true
      end
    )
  );

-- 3. Future Member Portal: Authenticated team members can view positions in their department & section
drop policy if exists "members read department_positions" on public.department_positions;
create policy "members read department_positions" on public.department_positions
  for select to authenticated
  using (
    department in (
      select tr.team from public.team_registrations tr
      where lower(tr.email) = lower(auth.jwt() ->> 'email')
        and tr.status = 'accepted'
    )
  );

-- Tasks RLS:
-- 1. Admins have full access
drop policy if exists "admin full access department_tasks" on public.department_tasks;
create policy "admin full access department_tasks" on public.department_tasks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Department heads can manage tasks in their own department & section
drop policy if exists "head manage own department_tasks" on public.department_tasks;
create policy "head manage own department_tasks" on public.department_tasks
  for all to authenticated
  using (
    public.head_department() is not null
    and (
      department = public.head_department()
      or (public.head_department() = 'media_press' and department in ('media', 'media_press'))
    )
    and (
      case
        when public.head_section() is not null then section = public.head_section()
        else true
      end
    )
  )
  with check (
    public.head_department() is not null
    and (
      department = public.head_department()
      or (public.head_department() = 'media_press' and department in ('media', 'media_press'))
    )
    and (
      case
        when public.head_section() is not null then section = public.head_section()
        else true
      end
    )
  );

-- 3. Future Member Portal: Authenticated team members can read their assigned tasks
drop policy if exists "members read assigned department_tasks" on public.department_tasks;
create policy "members read assigned department_tasks" on public.department_tasks
  for select to authenticated
  using (
    member_id in (
      select tr.id from public.team_registrations tr
      where lower(tr.email) = lower(auth.jwt() ->> 'email')
        and tr.status = 'accepted'
    )
  );

-- Task Logs RLS:
drop policy if exists "head and admin view task_logs" on public.department_task_logs;
create policy "head and admin view task_logs" on public.department_task_logs
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.department_tasks t
      where t.id = task_id
        and t.department = public.head_department()
        and (case when public.head_section() is not null then t.section = public.head_section() else true end)
    )
  );

drop policy if exists "head and admin insert task_logs" on public.department_task_logs;
create policy "head and admin insert task_logs" on public.department_task_logs
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.department_tasks t
      where t.id = task_id
        and t.department = public.head_department()
        and (case when public.head_section() is not null then t.section = public.head_section() else true end)
    )
  );

-- ---------------------------------------------------------------------
-- 7. Grant Permissions
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.department_positions to authenticated;
grant select, insert, update, delete on public.department_tasks to authenticated;
grant select, insert on public.department_task_logs to authenticated;
