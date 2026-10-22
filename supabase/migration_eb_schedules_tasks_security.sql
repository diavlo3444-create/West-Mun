-- Core tables are created first so this migration works on a clean project.
-- Additive and idempotent: existing rows are preserved.
create table if not exists public.wm_eb_tasks (
 id text primary key, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 department text not null, section text, assigned_to_user_id uuid references auth.users(id) on delete set null,
 assigned_to_name text not null default '', assigned_by_name text not null default '', title text not null,
 description text not null default '', priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 status text not null default 'not_started' check(status in ('not_started','in_progress','blocked','completed')),
 deadline timestamptz, station_name text not null default '', checklist jsonb not null default '[]'::jsonb,
 completion_note text not null default '', blocker_reason text not null default '', reference_links jsonb not null default '[]'::jsonb,
 completed_at timestamptz
);
create index if not exists idx_wm_eb_tasks_assignee on public.wm_eb_tasks(assigned_to_user_id);
create index if not exists idx_wm_eb_tasks_department_status on public.wm_eb_tasks(department,status);

create table if not exists public.wm_eb_shifts (
 id text primary key, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 department text not null, section text, station_id text, station_name text not null default '', location text not null default '',
 shift_date date not null, starts_at timestamptz not null, ends_at timestamptz not null,
 supervisor_name text not null default '', supervisor_id uuid references auth.users(id) on delete set null,
 responsibilities text not null default '', handover_notes text not null default '', break_schedule text not null default '',
 checklist jsonb not null default '[]'::jsonb, capacity integer not null default 1 check(capacity>0),
 status text not null default 'scheduled' check(status in ('scheduled','active','completed','modified','cancelled')),
 is_published boolean not null default false, check(ends_at>starts_at)
);
create index if not exists idx_wm_eb_shifts_dept_starts on public.wm_eb_shifts(department,starts_at);

create table if not exists public.wm_eb_shift_assignments (
 id text primary key, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 shift_id text not null references public.wm_eb_shifts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, member_name text not null default '',
 member_email text not null default '', role_title text not null default '', department text not null, section text,
 status text not null default 'confirmed' check(status in ('confirmed','checked_in','completed','swap_requested','absent')),
 notes text not null default '', unique(shift_id,user_id)
);
create index if not exists idx_wm_eb_shift_assignments_user on public.wm_eb_shift_assignments(user_id);

-- =====================================================================
-- WEST MUN 2027 — EB Accounts, Scheduling, Tasks & Security QR Permissions
-- Migration: Enhanced Scheduling, Task Checklists, and Co-Head Permissions
-- =====================================================================

-- 1. Ensure columns exist on public.wm_eb_shifts
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'wm_eb_shifts') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wm_eb_shifts' and column_name = 'is_published') then
      alter table public.wm_eb_shifts add column is_published boolean not null default false;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wm_eb_shifts' and column_name = 'break_schedule') then
      alter table public.wm_eb_shifts add column break_schedule text not null default '';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wm_eb_shifts' and column_name = 'checklist') then
      alter table public.wm_eb_shifts add column checklist jsonb not null default '[]'::jsonb;
    end if;
  end if;
end $$;

-- 2. Create Reusable Templates Table (public.wm_eb_templates)
create table if not exists public.wm_eb_templates (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  department    text not null,
  template_type text not null check (template_type in ('task', 'shift_checklist', 'station_checklist')),
  title         text not null check (char_length(btrim(title)) >= 2),
  description   text not null default '',
  checklist     jsonb not null default '[]'::jsonb,
  created_by    uuid references auth.users (id) on delete set null
);

create index if not exists idx_wm_eb_templates_dept
  on public.wm_eb_templates (department, template_type);

-- 3. Security Helper Functions for Directorate Management
create or replace function public.is_eb_department_manager(target_dept text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  ) or exists (
    select 1 from public.department_heads
    where user_id = auth.uid()
      and active = true
      and (
        lower(btrim(department)) = lower(btrim(target_dept))
        or (lower(btrim(department)) = 'media_press' and lower(btrim(target_dept)) in ('media', 'media_press'))
      )
  ) or exists (
    select 1 from public.wm_qr_passes
    where user_id = auth.uid()
      and active = true
      and lower(btrim(account_role)) = 'co_head'
      and (
        lower(btrim(team)) = lower(btrim(target_dept))
        or (lower(btrim(team)) = 'media_press' and lower(btrim(target_dept)) in ('media', 'media_press'))
      )
  );
$$;

create or replace function public.is_security_scanner_authorized()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  ) or exists (
    select 1 from public.department_heads
    where user_id = auth.uid()
      and active = true
      and lower(btrim(department)) in ('security', 'security & protocol')
  ) or exists (
    select 1 from public.wm_qr_passes
    where user_id = auth.uid()
      and active = true
      and lower(btrim(team)) in ('security', 'security & protocol')
      and lower(btrim(account_role)) in ('co_head', 'security', 'security_officer', 'head')
  );
$$;

-- 4. Row Level Security for wm_eb_tasks
alter table public.wm_eb_tasks enable row level security;

drop policy if exists "members_view_own_or_dept_tasks" on public.wm_eb_tasks;
create policy "members_view_own_or_dept_tasks" on public.wm_eb_tasks
  for select to authenticated
  using (
    assigned_to_user_id = auth.uid()
    or public.is_admin()
    or public.is_eb_department_manager(department)
    or (assigned_to_user_id is null and (
      department in (select team from public.wm_qr_passes where user_id = auth.uid() and active = true)
      or department = 'all'
    ))
  );

drop policy if exists "managers_insert_dept_tasks" on public.wm_eb_tasks;
create policy "managers_insert_dept_tasks" on public.wm_eb_tasks
  for insert to authenticated
  with check (
    public.is_admin()
    or public.is_eb_department_manager(department)
  );

drop policy if exists "managers_and_assignees_update_tasks" on public.wm_eb_tasks;
create policy "managers_and_assignees_update_tasks" on public.wm_eb_tasks
  for update to authenticated
  using (
    assigned_to_user_id = auth.uid()
    or public.is_admin()
    or public.is_eb_department_manager(department)
  )
  with check (
    assigned_to_user_id = auth.uid()
    or public.is_admin()
    or public.is_eb_department_manager(department)
  );

drop policy if exists "managers_delete_tasks" on public.wm_eb_tasks;
create policy "managers_delete_tasks" on public.wm_eb_tasks
  for delete to authenticated
  using (
    public.is_admin()
    or public.is_eb_department_manager(department)
  );

-- 5. Row Level Security for wm_eb_shifts
alter table public.wm_eb_shifts enable row level security;

drop policy if exists "members_view_published_or_assigned_shifts" on public.wm_eb_shifts;
create policy "members_view_published_or_assigned_shifts" on public.wm_eb_shifts
  for select to authenticated
  using (
    public.is_admin()
    or public.is_eb_department_manager(department)
    or is_published = true
    or id in (select shift_id from public.wm_eb_shift_assignments where user_id = auth.uid())
  );

drop policy if exists "managers_insert_shifts" on public.wm_eb_shifts;
create policy "managers_insert_shifts" on public.wm_eb_shifts
  for insert to authenticated
  with check (
    public.is_admin()
    or public.is_eb_department_manager(department)
  );

drop policy if exists "managers_update_shifts" on public.wm_eb_shifts;
create policy "managers_update_shifts" on public.wm_eb_shifts
  for update to authenticated
  using (
    public.is_admin()
    or public.is_eb_department_manager(department)
  )
  with check (
    public.is_admin()
    or public.is_eb_department_manager(department)
  );

drop policy if exists "managers_delete_shifts" on public.wm_eb_shifts;
create policy "managers_delete_shifts" on public.wm_eb_shifts
  for delete to authenticated
  using (
    public.is_admin()
    or public.is_eb_department_manager(department)
  );

-- 6. Row Level Security for wm_eb_shift_assignments
alter table public.wm_eb_shift_assignments enable row level security;

drop policy if exists "members_view_shift_assignments" on public.wm_eb_shift_assignments;
create policy "members_view_shift_assignments" on public.wm_eb_shift_assignments
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or public.is_eb_department_manager(department)
  );

drop policy if exists "managers_manage_shift_assignments" on public.wm_eb_shift_assignments;
create policy "managers_manage_shift_assignments" on public.wm_eb_shift_assignments
  for all to authenticated
  using (
    public.is_admin()
    or public.is_eb_department_manager(department)
  )
  with check (
    public.is_admin()
    or public.is_eb_department_manager(department)
  );

-- 7. Row Level Security for wm_eb_templates
alter table public.wm_eb_templates enable row level security;

drop policy if exists "members_read_templates" on public.wm_eb_templates;
create policy "members_read_templates" on public.wm_eb_templates
  for select to authenticated
  using (true);

drop policy if exists "managers_manage_templates" on public.wm_eb_templates;
create policy "managers_manage_templates" on public.wm_eb_templates
  for all to authenticated
  using (
    public.is_admin()
    or public.is_eb_department_manager(department)
  )
  with check (
    public.is_admin()
    or public.is_eb_department_manager(department)
  );
