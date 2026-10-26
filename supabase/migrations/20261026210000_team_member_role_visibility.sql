-- Let a signed-in team member read only their own operational group roster entries.
-- The matching group policy lets them resolve the role/group label without exposing other teams.
drop policy if exists team_members_read_own_group_membership on public.wm_team_group_members;
create policy team_members_read_own_group_membership
on public.wm_team_group_members
for select to authenticated
using (lower(member_email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists team_members_read_own_groups on public.wm_team_groups;
create policy team_members_read_own_groups
on public.wm_team_groups
for select to authenticated
using (
  exists (
    select 1
    from public.wm_team_group_members m
    where m.group_id = wm_team_groups.id
      and lower(m.member_email) = lower((select auth.jwt() ->> 'email'))
  )
);
