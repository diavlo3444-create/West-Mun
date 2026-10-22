-- WEST MUN QR scanner permissions.
-- Security heads/co-heads and admins can search active passes and record check-ins.
-- Regular users can only read their own pass. Privileged pass fields stay server-managed.

drop policy if exists "wm_qr_passes_read_own_or_security_scanner" on public.wm_qr_passes;
create policy "wm_qr_passes_read_own_or_security_scanner"
on public.wm_qr_passes for select to authenticated
using (user_id = auth.uid() or public.is_security_scanner_authorized());

drop policy if exists "wm_qr_passes_scanner_update_presence" on public.wm_qr_passes;
create policy "wm_qr_passes_scanner_update_presence"
on public.wm_qr_passes for update to authenticated
using (public.is_security_scanner_authorized())
with check (public.is_security_scanner_authorized());

revoke update on public.wm_qr_passes from anon, authenticated;
grant update (inside, last_scanned_at, updated_at) on public.wm_qr_passes to authenticated;
grant select on public.wm_qr_passes to authenticated;

drop policy if exists "wm_qr_scan_logs_security_insert" on public.wm_qr_scan_logs;
create policy "wm_qr_scan_logs_security_insert"
on public.wm_qr_scan_logs for insert to authenticated
with check (scanner_user_id = auth.uid() and public.is_security_scanner_authorized());

drop policy if exists "wm_qr_scan_logs_security_read" on public.wm_qr_scan_logs;
create policy "wm_qr_scan_logs_security_read"
on public.wm_qr_scan_logs for select to authenticated
using (public.is_security_scanner_authorized());

grant select, insert on public.wm_qr_scan_logs to authenticated;
