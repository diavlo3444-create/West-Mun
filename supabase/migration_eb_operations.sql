-- =====================================================================
-- WEST MUN 2027 — Executive Board (EB) Operations Portal Migration
--
-- Tables:
-- 1. public.wm_eb_stations: Official venue stations, operating procedures, and checklists
-- 2. public.wm_eb_shifts: Operational shift rosters, locations, timings, and supervisor links
-- 3. public.wm_eb_shift_assignments: Member shift assignments, attendance, and check-ins
-- 4. public.wm_eb_shift_swaps: Supervisor-approved shift-swap request workflow
-- 5. public.wm_eb_tasks: Actionable tasks, checklists, blocker alerts, and completion notes
-- 6. public.wm_eb_task_comments: Internal task context discussion threads
-- 7. public.wm_eb_announcements: General and department-specific operational broadcasts
-- 8. public.wm_eb_announcement_acks: Member acknowledgement records for critical alerts
-- 9. public.wm_eb_incidents: Event-day incident reporting, escalation, and resolution logs
-- 10. public.wm_eb_hierarchy_nodes: Configurable department organizational chart
--
-- Safe to run in Supabase > SQL Editor > New query.
-- Idempotent (IF NOT EXISTS) and non-destructive.
-- =====================================================================

-- 1. STATIONS
create table if not exists public.wm_eb_stations (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  department          text not null check (department in ('media_press', 'security', 'volunteers', 'design', 'marketing', 'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc', 'all')),
  section             text check (section in ('male', 'female') or section is null),
  name                text not null check (char_length(btrim(name)) between 2 and 150),
  location            text not null check (char_length(btrim(location)) between 2 and 150),
  purpose             text not null default '',
  supervisor_name     text not null default '',
  supervisor_contact  text not null default '',
  duties              text[] not null default '{}',
  equipment           text[] not null default '{}',
  opening_checklist   jsonb not null default '[]'::jsonb,
  closing_checklist   jsonb not null default '[]'::jsonb,
  emergency_contacts  jsonb not null default '[]'::jsonb,
  created_by          uuid references auth.users (id) on delete set null
);

create index if not exists idx_wm_eb_stations_dept
  on public.wm_eb_stations (department, section);

-- 2. SHIFTS
create table if not exists public.wm_eb_shifts (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  department          text not null check (department in ('media_press', 'security', 'volunteers', 'design', 'marketing', 'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc')),
  section             text check (section in ('male', 'female') or section is null),
  station_id          uuid references public.wm_eb_stations (id) on delete set null,
  station_name        text not null check (char_length(btrim(station_name)) >= 2),
  location            text not null check (char_length(btrim(location)) >= 2),
  shift_date          date not null,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  supervisor_name     text not null default '',
  supervisor_id       uuid references auth.users (id) on delete set null,
  responsibilities    text not null default '',
  handover_notes      text not null default '',
  capacity            integer not null default 4,
  status              text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'modified', 'cancelled')),
  created_by          uuid references auth.users (id) on delete set null,
  constraint check_shift_time check (ends_at > starts_at)
);

create index if not exists idx_wm_eb_shifts_dept_date
  on public.wm_eb_shifts (department, shift_date);

-- 3. SHIFT ASSIGNMENTS
create table if not exists public.wm_eb_shift_assignments (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  shift_id            uuid not null references public.wm_eb_shifts (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  member_name         text not null check (char_length(btrim(member_name)) >= 2),
  member_email        text not null check (char_length(btrim(member_email)) >= 5),
  role_title          text not null default 'EB Member',
  department          text not null,
  section             text,
  status              text not null default 'confirmed' check (status in ('confirmed', 'checked_in', 'completed', 'swap_requested', 'absent')),
  notes               text not null default '',
  assigned_by         uuid references auth.users (id) on delete set null,
  constraint wm_eb_shift_unique_user_shift unique (shift_id, user_id)
);

create index if not exists idx_wm_eb_shift_assignments_user
  on public.wm_eb_shift_assignments (user_id);

-- 4. SHIFT SWAP REQUESTS
create table if not exists public.wm_eb_shift_swaps (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  assignment_id       uuid not null references public.wm_eb_shift_assignments (id) on delete cascade,
  requester_user_id   uuid not null references auth.users (id) on delete cascade,
  requester_name      text not null,
  target_shift_id     uuid references public.wm_eb_shifts (id) on delete set null,
  target_user_id      uuid references auth.users (id) on delete set null,
  reason              text not null check (char_length(btrim(reason)) >= 5),
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by         uuid references auth.users (id) on delete set null,
  review_notes        text not null default ''
);

create index if not exists idx_wm_eb_shift_swaps_requester
  on public.wm_eb_shift_swaps (requester_user_id, status);

-- 5. TASKS
create table if not exists public.wm_eb_tasks (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  department          text not null check (department in ('media_press', 'security', 'volunteers', 'design', 'marketing', 'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc', 'all')),
  section             text check (section in ('male', 'female') or section is null),
  assigned_to_user_id uuid references auth.users (id) on delete set null,
  assigned_to_name    text not null default '',
  assigned_by_user_id uuid references auth.users (id) on delete set null,
  assigned_by_name    text not null default 'Department Head',
  title               text not null check (char_length(btrim(title)) between 2 and 200),
  description         text not null default '',
  priority            text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status              text not null default 'not_started' check (status in ('not_started', 'in_progress', 'blocked', 'completed')),
  deadline            timestamptz,
  station_name        text not null default '',
  shift_id            uuid references public.wm_eb_shifts (id) on delete set null,
  checklist           jsonb not null default '[]'::jsonb,
  completion_note     text not null default '',
  blocker_reason      text not null default '',
  reference_links     jsonb not null default '[]'::jsonb,
  completed_at        timestamptz
);

create index if not exists idx_wm_eb_tasks_user
  on public.wm_eb_tasks (assigned_to_user_id, status);

create index if not exists idx_wm_eb_tasks_dept
  on public.wm_eb_tasks (department, status);

-- 6. TASK COMMENTS
create table if not exists public.wm_eb_task_comments (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  task_id             uuid not null references public.wm_eb_tasks (id) on delete cascade,
  author_user_id      uuid not null references auth.users (id) on delete cascade,
  author_name         text not null,
  author_role         text not null default '',
  comment             text not null check (char_length(btrim(comment)) >= 1)
);

create index if not exists idx_wm_eb_task_comments_task
  on public.wm_eb_task_comments (task_id, created_at asc);

-- 7. ANNOUNCEMENTS
create table if not exists public.wm_eb_announcements (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  department              text not null default 'all',
  section                 text,
  title                   text not null check (char_length(btrim(title)) >= 2),
  body                    text not null check (char_length(btrim(body)) >= 2),
  priority                text not null default 'normal' check (priority in ('normal', 'urgent', 'critical')),
  requires_acknowledgement boolean not null default false,
  author_user_id          uuid references auth.users (id) on delete set null,
  author_name             text not null default 'Secretariat',
  pinned                  boolean not null default false
);

create index if not exists idx_wm_eb_announcements_dept
  on public.wm_eb_announcements (department, pinned, created_at desc);

-- 8. ANNOUNCEMENT ACKNOWLEDGEMENTS
create table if not exists public.wm_eb_announcement_acks (
  id                  uuid primary key default gen_random_uuid(),
  announcement_id     uuid not null references public.wm_eb_announcements (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  acknowledged_at     timestamptz not null default now(),
  constraint wm_eb_ack_unique unique (announcement_id, user_id)
);

create index if not exists idx_wm_eb_acks_user
  on public.wm_eb_announcement_acks (user_id);

-- 9. INCIDENTS (Event-Day Mode)
create table if not exists public.wm_eb_incidents (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  department          text not null,
  section             text,
  reported_by_user_id uuid references auth.users (id) on delete set null,
  reporter_name       text not null,
  reporter_role       text not null default 'EB Member',
  category            text not null check (category in ('medical', 'security', 'decorum', 'logistics', 'it_tech', 'protocol', 'other')),
  location            text not null,
  description         text not null check (char_length(btrim(description)) >= 5),
  severity            text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status              text not null default 'open' check (status in ('open', 'responding', 'resolved')),
  resolved_by         uuid references auth.users (id) on delete set null,
  resolution_notes    text not null default ''
);

create index if not exists idx_wm_eb_incidents_dept
  on public.wm_eb_incidents (department, status, created_at desc);

-- 10. HIERARCHY NODES (Organizational Chart)
create table if not exists public.wm_eb_hierarchy_nodes (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  department          text not null check (department in ('media_press', 'security', 'volunteers', 'design', 'marketing', 'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc')),
  section             text check (section in ('male', 'female') or section is null),
  role_title          text not null check (char_length(btrim(role_title)) >= 2),
  rank_level          integer not null default 1, -- 1=Head, 2=Deputy/Co-Head, 3=Supervisor/Lead, 4=Member
  parent_node_id      uuid references public.wm_eb_hierarchy_nodes (id) on delete set null,
  assigned_user_id    uuid references auth.users (id) on delete set null,
  assigned_name       text not null default '',
  assigned_email      text not null default '',
  responsibilities    text not null default '',
  contact_email       text not null default '',
  contact_phone       text not null default '',
  sort_order          integer not null default 0
);

create index if not exists idx_wm_eb_hierarchy_dept
  on public.wm_eb_hierarchy_nodes (department, section, rank_level);

-- ---------------------------------------------------------------------
-- Row Level Security (RLS) Configuration
-- ---------------------------------------------------------------------
alter table public.wm_eb_stations enable row level security;
alter table public.wm_eb_shifts enable row level security;
alter table public.wm_eb_shift_assignments enable row level security;
alter table public.wm_eb_shift_swaps enable row level security;
alter table public.wm_eb_tasks enable row level security;
alter table public.wm_eb_task_comments enable row level security;
alter table public.wm_eb_announcements enable row level security;
alter table public.wm_eb_announcement_acks enable row level security;
alter table public.wm_eb_incidents enable row level security;
alter table public.wm_eb_hierarchy_nodes enable row level security;

-- Authenticated Read Policies
drop policy if exists "eb_read_stations" on public.wm_eb_stations;
create policy "eb_read_stations" on public.wm_eb_stations
  for select to authenticated using (true);

drop policy if exists "eb_read_shifts" on public.wm_eb_shifts;
create policy "eb_read_shifts" on public.wm_eb_shifts
  for select to authenticated using (true);

drop policy if exists "eb_read_assignments" on public.wm_eb_shift_assignments;
create policy "eb_read_assignments" on public.wm_eb_shift_assignments
  for select to authenticated using (true);

drop policy if exists "eb_read_swaps" on public.wm_eb_shift_swaps;
create policy "eb_read_swaps" on public.wm_eb_shift_swaps
  for select to authenticated using (true);

drop policy if exists "eb_read_tasks" on public.wm_eb_tasks;
create policy "eb_read_tasks" on public.wm_eb_tasks
  for select to authenticated using (true);

drop policy if exists "eb_read_task_comments" on public.wm_eb_task_comments;
create policy "eb_read_task_comments" on public.wm_eb_task_comments
  for select to authenticated using (true);

drop policy if exists "eb_read_announcements" on public.wm_eb_announcements;
create policy "eb_read_announcements" on public.wm_eb_announcements
  for select to authenticated using (true);

drop policy if exists "eb_read_acks" on public.wm_eb_announcement_acks;
create policy "eb_read_acks" on public.wm_eb_announcement_acks
  for select to authenticated using (true);

drop policy if exists "eb_read_incidents" on public.wm_eb_incidents;
create policy "eb_read_incidents" on public.wm_eb_incidents
  for select to authenticated using (true);

drop policy if exists "eb_read_hierarchy" on public.wm_eb_hierarchy_nodes;
create policy "eb_read_hierarchy" on public.wm_eb_hierarchy_nodes
  for select to authenticated using (true);

-- Authenticated Write / Modification Policies
drop policy if exists "eb_insert_swaps" on public.wm_eb_shift_swaps;
create policy "eb_insert_swaps" on public.wm_eb_shift_swaps
  for insert to authenticated with check (requester_user_id = auth.uid());

drop policy if exists "eb_update_own_tasks" on public.wm_eb_tasks;
create policy "eb_update_own_tasks" on public.wm_eb_tasks
  for update to authenticated using (assigned_to_user_id = auth.uid() or public.is_admin());

drop policy if exists "eb_insert_task_comments" on public.wm_eb_task_comments;
create policy "eb_insert_task_comments" on public.wm_eb_task_comments
  for insert to authenticated with check (author_user_id = auth.uid());

drop policy if exists "eb_insert_acks" on public.wm_eb_announcement_acks;
create policy "eb_insert_acks" on public.wm_eb_announcement_acks
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "eb_insert_incidents" on public.wm_eb_incidents;
create policy "eb_insert_incidents" on public.wm_eb_incidents
  for insert to authenticated with check (true);

-- Admin Full Access Policies
drop policy if exists "admins_manage_eb_stations" on public.wm_eb_stations;
create policy "admins_manage_eb_stations" on public.wm_eb_stations
  for all using (public.is_admin());

drop policy if exists "admins_manage_eb_shifts" on public.wm_eb_shifts;
create policy "admins_manage_eb_shifts" on public.wm_eb_shifts
  for all using (public.is_admin());

drop policy if exists "admins_manage_eb_assignments" on public.wm_eb_shift_assignments;
create policy "admins_manage_eb_assignments" on public.wm_eb_shift_assignments
  for all using (public.is_admin());

drop policy if exists "admins_manage_eb_tasks" on public.wm_eb_tasks;
create policy "admins_manage_eb_tasks" on public.wm_eb_tasks
  for all using (public.is_admin());

drop policy if exists "admins_manage_eb_announcements" on public.wm_eb_announcements;
create policy "admins_manage_eb_announcements" on public.wm_eb_announcements
  for all using (public.is_admin());

drop policy if exists "admins_manage_eb_hierarchy" on public.wm_eb_hierarchy_nodes;
create policy "admins_manage_eb_hierarchy" on public.wm_eb_hierarchy_nodes
  for all using (public.is_admin());
