-- Allow members to read only shift assignments linked to their signed-in account
-- or to the same verified email address.
drop policy if exists members_view_shift_assignments on public.wm_eb_shift_assignments;
create policy members_view_shift_assignments
  on public.wm_eb_shift_assignments
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(coalesce(member_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or is_admin()
    or is_eb_department_manager(department)
  );
