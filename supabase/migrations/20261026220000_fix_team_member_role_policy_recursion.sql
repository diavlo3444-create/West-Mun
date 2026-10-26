-- Avoid recursive SELECT policy evaluation on team group membership.
-- The previous ALL policy also applied to SELECT and queried wm_team_groups,
-- while the groups' own-member policy queried wm_team_group_members.
drop policy if exists operational_heads_manage_wm_team_group_members
  on public.wm_team_group_members;

create policy operational_heads_insert_wm_team_group_members
  on public.wm_team_group_members
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.wm_team_groups g
      where g.id = group_id
        and wm_private.can_manage_operational_department(g.department, g.section)
    )
  );

create policy operational_heads_update_wm_team_group_members
  on public.wm_team_group_members
  for update to authenticated
  using (
    exists (
      select 1
      from public.wm_team_groups g
      where g.id = group_id
        and wm_private.can_manage_operational_department(g.department, g.section)
    )
  )
  with check (
    exists (
      select 1
      from public.wm_team_groups g
      where g.id = group_id
        and wm_private.can_manage_operational_department(g.department, g.section)
    )
  );

create policy operational_heads_delete_wm_team_group_members
  on public.wm_team_group_members
  for delete to authenticated
  using (
    exists (
      select 1
      from public.wm_team_groups g
      where g.id = group_id
        and wm_private.can_manage_operational_department(g.department, g.section)
    )
  );
