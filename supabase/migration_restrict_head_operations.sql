-- WEST MUN: limit operational head tools to Volunteers, Security, and Media & Press.
-- Apply after migration_operations_studio.sql and migration_team_groups.sql.

create or replace function wm_private.can_manage_operational_department(
  p_department text,
  p_section text default null
) returns boolean
language sql stable security definer
set search_path = 'pg_catalog', 'public', 'auth', 'wm_private'
as $function$
  select wm_private.is_super_admin() or (
    wm_private.normalize_department(p_department) in ('volunteers', 'security', 'media_press')
    and exists (
      select 1 from public.department_heads dh
      where dh.user_id = auth.uid()
        and coalesce(dh.active, true)
        and wm_private.normalize_department(dh.department) = wm_private.normalize_department(p_department)
        and (p_section is null or dh.section is null or lower(trim(dh.section)) = lower(trim(p_section)))
    )
  );
$function$;

-- Custom team groups and membership
drop policy if exists "admins_manage_wm_team_groups" on public.wm_team_groups;
drop policy if exists "heads_manage_wm_team_groups" on public.wm_team_groups;
drop policy if exists "operational_heads_manage_wm_team_groups" on public.wm_team_groups;
create policy "operational_heads_manage_wm_team_groups" on public.wm_team_groups
  for all using (wm_private.can_manage_operational_department(department, section))
  with check (wm_private.can_manage_operational_department(department, section));

drop policy if exists "admins_manage_wm_team_group_members" on public.wm_team_group_members;
drop policy if exists "heads_manage_wm_team_group_members" on public.wm_team_group_members;
drop policy if exists "operational_heads_manage_wm_team_group_members" on public.wm_team_group_members;
create policy "operational_heads_manage_wm_team_group_members" on public.wm_team_group_members
  for all using (exists (
    select 1 from public.wm_team_groups g
    where g.id = wm_team_group_members.group_id
      and wm_private.can_manage_operational_department(g.department, g.section)
  ))
  with check (exists (
    select 1 from public.wm_team_groups g
    where g.id = wm_team_group_members.group_id
      and wm_private.can_manage_operational_department(g.department, g.section)
  ));

-- Team people management
drop policy if exists "wm_people_delete" on public.wm_people;
create policy "wm_people_delete" on public.wm_people for delete
  using (wm_private.can_manage_operational_department(department, section));
drop policy if exists "wm_people_insert" on public.wm_people;
create policy "wm_people_insert" on public.wm_people for insert
  with check (wm_private.can_manage_operational_department(department, section));
drop policy if exists "wm_people_update" on public.wm_people;
create policy "wm_people_update" on public.wm_people for update
  using (wm_private.can_manage_operational_department(department, section))
  with check (wm_private.can_manage_operational_department(department, section));
drop policy if exists "wm_people_select" on public.wm_people;
create policy "wm_people_select" on public.wm_people for select
  using (
    wm_private.is_super_admin()
    or auth_user_id = auth.uid()
    or wm_private.can_manage_operational_department(department, section)
  );

-- Shifts and roster
drop policy if exists "wm_shifts_delete" on public.wm_shifts;
create policy "wm_shifts_delete" on public.wm_shifts for delete
  using (wm_private.can_manage_operational_department(department, section));
drop policy if exists "wm_shifts_insert" on public.wm_shifts;
create policy "wm_shifts_insert" on public.wm_shifts for insert
  with check (wm_private.can_manage_operational_department(department, section));
drop policy if exists "wm_shifts_update" on public.wm_shifts;
create policy "wm_shifts_update" on public.wm_shifts for update
  using (wm_private.can_manage_operational_department(department, section))
  with check (wm_private.can_manage_operational_department(department, section));
drop policy if exists "wm_shifts_select" on public.wm_shifts;
create policy "wm_shifts_select" on public.wm_shifts for select
  using (
    wm_private.can_manage_operational_department(department, section)
    or exists (
      select 1 from public.wm_shift_assignments a
      join public.wm_people pe on pe.id = a.person_id
      where a.shift_id = wm_shifts.id and pe.auth_user_id = auth.uid()
    )
  );

-- Shift assignments inherit authorization from the parent shift.
drop policy if exists "wm_shift_assignments_delete" on public.wm_shift_assignments;
create policy "wm_shift_assignments_delete" on public.wm_shift_assignments for delete
  using (exists (
    select 1 from public.wm_shifts s
    where s.id = wm_shift_assignments.shift_id
      and wm_private.can_manage_operational_department(s.department, s.section)
  ));
drop policy if exists "wm_shift_assignments_insert" on public.wm_shift_assignments;
create policy "wm_shift_assignments_insert" on public.wm_shift_assignments for insert
  with check (exists (
    select 1 from public.wm_shifts s
    where s.id = wm_shift_assignments.shift_id
      and wm_private.can_manage_operational_department(s.department, s.section)
  ));
drop policy if exists "wm_shift_assignments_update" on public.wm_shift_assignments;
create policy "wm_shift_assignments_update" on public.wm_shift_assignments for update
  using (exists (
    select 1 from public.wm_shifts s
    where s.id = wm_shift_assignments.shift_id
      and wm_private.can_manage_operational_department(s.department, s.section)
  ))
  with check (exists (
    select 1 from public.wm_shifts s
    where s.id = wm_shift_assignments.shift_id
      and wm_private.can_manage_operational_department(s.department, s.section)
  ));
drop policy if exists "wm_shift_assignments_select" on public.wm_shift_assignments;
create policy "wm_shift_assignments_select" on public.wm_shift_assignments for select
  using (
    wm_private.is_super_admin()
    or exists (
      select 1 from public.wm_shifts s
      where s.id = wm_shift_assignments.shift_id
        and wm_private.can_manage_operational_department(s.department, s.section)
    )
    or exists (
      select 1 from public.wm_people pe
      where pe.id = wm_shift_assignments.person_id and pe.auth_user_id = auth.uid()
    )
  );
