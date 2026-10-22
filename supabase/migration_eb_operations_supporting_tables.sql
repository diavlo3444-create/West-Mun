-- WEST MUN EB operations supporting schema.
-- Applied to Supabase project tpflkxmnwuxyldhchtdl on 2026-10-22.
-- Idempotent supplemental migration for station records, comments, swaps,
-- announcements, hierarchy, and incidents used by ebOperationsService.ts.

create table if not exists public.wm_eb_stations (
 id text primary key, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 department text not null, section text, name text not null, location text not null default '', purpose text not null default '',
 supervisor_name text not null default '', supervisor_contact text not null default '',
 duties jsonb not null default '[]'::jsonb, equipment jsonb not null default '[]'::jsonb,
 opening_checklist jsonb not null default '[]'::jsonb, closing_checklist jsonb not null default '[]'::jsonb,
 emergency_contacts jsonb not null default '[]'::jsonb
);
create table if not exists public.wm_eb_task_comments (
 id text primary key, task_id text not null references public.wm_eb_tasks(id) on delete cascade,
 author_user_id uuid not null references auth.users(id) on delete cascade,
 author_name text not null default '', author_role text not null default '', comment text not null,
 created_at timestamptz not null default now()
);
create index if not exists idx_wm_eb_task_comments_task on public.wm_eb_task_comments(task_id,created_at);
create table if not exists public.wm_eb_shift_swaps (
 id text primary key, assignment_id text not null references public.wm_eb_shift_assignments(id) on delete cascade,
 requester_user_id uuid not null references auth.users(id) on delete cascade,
 requester_name text not null default '', target_shift_id text references public.wm_eb_shifts(id) on delete set null,
 reason text not null, status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 reviewed_by uuid references auth.users(id) on delete set null, review_notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.wm_eb_announcements (
 id text primary key, department text not null, section text, title text not null, body text not null,
 priority text not null default 'normal' check(priority in ('normal','urgent','critical')),
 requires_acknowledgement boolean not null default false, author_name text not null default '',
 pinned boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.wm_eb_announcement_acks (
 announcement_id text not null references public.wm_eb_announcements(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(),
 primary key(announcement_id,user_id)
);
create table if not exists public.wm_eb_hierarchy_nodes (
 id text primary key, department text not null, section text, role_title text not null,
 rank_level integer not null default 4 check(rank_level between 1 and 10),
 parent_node_id text references public.wm_eb_hierarchy_nodes(id) on delete set null,
 assigned_name text not null default '', assigned_email text not null default '', responsibilities text not null default '',
 contact_email text not null default '', contact_phone text not null default '', sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.wm_eb_incidents (
 id text primary key, department text not null, section text, reporter_name text not null default '', reporter_role text not null default '',
 category text not null check(category in ('medical','security','decorum','logistics','it_tech','protocol','other')),
 location text not null default '', description text not null,
 severity text not null check(severity in ('low','medium','high','critical')),
 status text not null default 'open' check(status in ('open','responding','resolved')),
 resolution_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.wm_eb_stations enable row level security;
alter table public.wm_eb_task_comments enable row level security;
alter table public.wm_eb_shift_swaps enable row level security;
alter table public.wm_eb_announcements enable row level security;
alter table public.wm_eb_announcement_acks enable row level security;
alter table public.wm_eb_hierarchy_nodes enable row level security;
alter table public.wm_eb_incidents enable row level security;

drop policy if exists "eb_members_read_stations" on public.wm_eb_stations;
create policy "eb_members_read_stations" on public.wm_eb_stations for select to authenticated using (
 public.is_admin() or public.is_eb_department_manager(department)
 or exists(select 1 from public.wm_qr_passes p where p.user_id=auth.uid() and p.active=true and (p.team=department or department='all'))
);
drop policy if exists "eb_managers_manage_stations" on public.wm_eb_stations;
create policy "eb_managers_manage_stations" on public.wm_eb_stations for all to authenticated using(public.is_admin() or public.is_eb_department_manager(department)) with check(public.is_admin() or public.is_eb_department_manager(department));

drop policy if exists "task_comment_read_scope" on public.wm_eb_task_comments;
create policy "task_comment_read_scope" on public.wm_eb_task_comments for select to authenticated using (
 author_user_id=auth.uid() or exists(select 1 from public.wm_eb_tasks t where t.id=task_id and (t.assigned_to_user_id=auth.uid() or public.is_admin() or public.is_eb_department_manager(t.department)))
);
drop policy if exists "task_comment_insert_scope" on public.wm_eb_task_comments;
create policy "task_comment_insert_scope" on public.wm_eb_task_comments for insert to authenticated with check (
 author_user_id=auth.uid() and exists(select 1 from public.wm_eb_tasks t where t.id=task_id and (t.assigned_to_user_id=auth.uid() or public.is_admin() or public.is_eb_department_manager(t.department)))
);

drop policy if exists "shift_swap_read_scope" on public.wm_eb_shift_swaps;
create policy "shift_swap_read_scope" on public.wm_eb_shift_swaps for select to authenticated using (
 requester_user_id=auth.uid() or public.is_admin() or exists(select 1 from public.wm_eb_shift_assignments a where a.id=assignment_id and public.is_eb_department_manager(a.department))
);
drop policy if exists "shift_swap_create_own" on public.wm_eb_shift_swaps;
create policy "shift_swap_create_own" on public.wm_eb_shift_swaps for insert to authenticated with check(requester_user_id=auth.uid());
drop policy if exists "shift_swap_review_scope" on public.wm_eb_shift_swaps;
create policy "shift_swap_review_scope" on public.wm_eb_shift_swaps for update to authenticated
using(public.is_admin() or exists(select 1 from public.wm_eb_shift_assignments a where a.id=assignment_id and public.is_eb_department_manager(a.department)))
with check(public.is_admin() or exists(select 1 from public.wm_eb_shift_assignments a where a.id=assignment_id and public.is_eb_department_manager(a.department)));

drop policy if exists "eb_members_read_announcements" on public.wm_eb_announcements;
create policy "eb_members_read_announcements" on public.wm_eb_announcements for select to authenticated using(
 public.is_admin() or public.is_eb_department_manager(department)
 or exists(select 1 from public.wm_qr_passes p where p.user_id=auth.uid() and p.active=true and (p.team=department or department='all'))
);
drop policy if exists "eb_managers_manage_announcements" on public.wm_eb_announcements;
create policy "eb_managers_manage_announcements" on public.wm_eb_announcements for all to authenticated using(public.is_admin() or public.is_eb_department_manager(department)) with check(public.is_admin() or public.is_eb_department_manager(department));

drop policy if exists "users_read_own_announcement_acks" on public.wm_eb_announcement_acks;
create policy "users_read_own_announcement_acks" on public.wm_eb_announcement_acks for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "users_ack_own_announcements" on public.wm_eb_announcement_acks;
create policy "users_ack_own_announcements" on public.wm_eb_announcement_acks for insert to authenticated with check(user_id=auth.uid());

drop policy if exists "eb_members_read_hierarchy" on public.wm_eb_hierarchy_nodes;
create policy "eb_members_read_hierarchy" on public.wm_eb_hierarchy_nodes for select to authenticated using(
 public.is_admin() or public.is_eb_department_manager(department)
 or exists(select 1 from public.wm_qr_passes p where p.user_id=auth.uid() and p.active=true and (p.team=department or department='all'))
);
drop policy if exists "eb_managers_manage_hierarchy" on public.wm_eb_hierarchy_nodes;
create policy "eb_managers_manage_hierarchy" on public.wm_eb_hierarchy_nodes for all to authenticated using(public.is_admin() or public.is_eb_department_manager(department)) with check(public.is_admin() or public.is_eb_department_manager(department));

drop policy if exists "eb_members_read_incidents" on public.wm_eb_incidents;
create policy "eb_members_read_incidents" on public.wm_eb_incidents for select to authenticated using(
 public.is_admin() or public.is_eb_department_manager(department)
 or exists(select 1 from public.wm_qr_passes p where p.user_id=auth.uid() and p.active=true and p.team=department)
);
drop policy if exists "eb_members_report_incidents" on public.wm_eb_incidents;
create policy "eb_members_report_incidents" on public.wm_eb_incidents for insert to authenticated with check(
 public.is_admin() or public.is_eb_department_manager(department)
 or exists(select 1 from public.wm_qr_passes p where p.user_id=auth.uid() and p.active=true and p.team=department)
);
drop policy if exists "eb_managers_resolve_incidents" on public.wm_eb_incidents;
create policy "eb_managers_resolve_incidents" on public.wm_eb_incidents for update to authenticated using(public.is_admin() or public.is_eb_department_manager(department)) with check(public.is_admin() or public.is_eb_department_manager(department));

grant select, insert, update, delete on public.wm_eb_stations, public.wm_eb_tasks, public.wm_eb_shifts, public.wm_eb_shift_assignments, public.wm_eb_templates, public.wm_eb_task_comments, public.wm_eb_shift_swaps, public.wm_eb_announcements, public.wm_eb_announcement_acks, public.wm_eb_hierarchy_nodes, public.wm_eb_incidents to authenticated;
