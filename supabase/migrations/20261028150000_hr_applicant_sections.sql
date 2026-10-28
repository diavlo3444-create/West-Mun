-- HR can review applicant contact details across the three HR sidebar sections.
-- Access is read-only and restricted to active HR department heads.
drop policy if exists "HR can view accepted team registrations" on public.team_registrations;
drop policy if exists "HR can view team registrations" on public.team_registrations;
create policy "HR can view team registrations"
on public.team_registrations for select to authenticated
using (
  exists (
    select 1 from public.department_heads h
    where h.user_id = (select auth.uid())
      and h.department = 'hr'
      and h.active = true
  )
);

drop policy if exists "HR can view delegate applications" on public.delegates;
create policy "HR can view delegate applications"
on public.delegates for select to authenticated
using (
  exists (
    select 1 from public.department_heads h
    where h.user_id = (select auth.uid())
      and h.department = 'hr'
      and h.active = true
  )
);

drop policy if exists "HR can view chair applications" on public.wm_chair_applications;
create policy "HR can view chair applications"
on public.wm_chair_applications for select to authenticated
using (
  exists (
    select 1 from public.department_heads h
    where h.user_id = (select auth.uid())
      and h.department = 'hr'
      and h.active = true
  )
);
