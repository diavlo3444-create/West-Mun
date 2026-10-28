-- HR can read accepted team applications across departments for applicant communications.
-- This is read-only access; department decision/update permissions are unchanged.
drop policy if exists "HR can view accepted team registrations" on public.team_registrations;
create policy "HR can view accepted team registrations"
on public.team_registrations
for select
to authenticated
using (
  status = 'accepted'
  and exists (
    select 1
    from public.department_heads h
    where h.user_id = (select auth.uid())
      and h.department = 'hr'
      and h.active = true
  )
);
