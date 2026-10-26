-- Allow authenticated WEST MUN admins to read head recommendations in the Secretariat review panel.
-- Heads continue to use the existing scoped policies for their own department/section.
grant select on table public.wm_staffing_decisions to authenticated;

drop policy if exists "Admins can read staffing decisions" on public.wm_staffing_decisions;
create policy "Admins can read staffing decisions"
  on public.wm_staffing_decisions
  for select
  to authenticated
  using (public.is_admin());
