-- Make Operations Studio shift assignments visible to the assigned team member.
-- Older live schemas did not have the direct-assignee columns the UI writes.
alter table public.wm_shift_assignments
  add column if not exists role_type text not null default 'team_member',
  add column if not exists responsibility text not null default '',
  add column if not exists station text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists is_supervisor boolean not null default false,
  add column if not exists assignee_name text not null default '',
  add column if not exists assignee_email text not null default '',
  add column if not exists member_id uuid;

alter table public.wm_shift_assignments alter column person_id drop not null;

create or replace function wm_private.can_manage_shift_assignment(p_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, wm_private
as $$
  select exists (
    select 1 from public.wm_shifts s
    where s.id = p_shift_id
      and (wm_private.is_super_admin() or wm_private.can_manage_operational_department(s.department, s.section))
  );
$$;

grant execute on function wm_private.can_manage_shift_assignment(uuid) to authenticated;

drop policy if exists wm_shift_assignments_select on public.wm_shift_assignments;
create policy wm_shift_assignments_select
  on public.wm_shift_assignments for select to authenticated
  using (
    wm_private.is_super_admin()
    or wm_private.can_manage_shift_assignment(shift_id)
    or lower(coalesce(assignee_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (
      select 1 from public.wm_people pe
      where pe.id = wm_shift_assignments.person_id and pe.auth_user_id = auth.uid()
    )
  );

drop policy if exists wm_shifts_select on public.wm_shifts;
create policy wm_shifts_select
  on public.wm_shifts for select to authenticated
  using (
    wm_private.can_manage_operational_department(department, section)
    or exists (
      select 1 from public.wm_shift_assignments a
      where a.shift_id = wm_shifts.id
        and (
          lower(coalesce(a.assignee_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
          or exists (
            select 1 from public.wm_people pe
            where pe.id = a.person_id and pe.auth_user_id = auth.uid()
          )
        )
    )
  );
