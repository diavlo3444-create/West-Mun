-- WEST MUN 2027: DCC-scoped committee and delegate-management permissions.
-- Only active DCC head assignments receive these additional privileges.
create or replace function public.is_active_dcc_head()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.department_heads dh
    where dh.user_id = auth.uid()
      and lower(btrim(dh.department)) = 'dcc'
      and coalesce(dh.active, true) = true
  );
$$;
revoke all on function public.is_active_dcc_head() from public;
grant execute on function public.is_active_dcc_head() to authenticated;

drop policy if exists "dcc read all committees" on public.committees;
create policy "dcc read all committees" on public.committees for select to authenticated using (public.is_active_dcc_head());
drop policy if exists "dcc insert committees" on public.committees;
create policy "dcc insert committees" on public.committees for insert to authenticated with check (public.is_active_dcc_head());
drop policy if exists "dcc update committees" on public.committees;
create policy "dcc update committees" on public.committees for update to authenticated using (public.is_active_dcc_head()) with check (public.is_active_dcc_head());
drop policy if exists "dcc delete committees" on public.committees;
create policy "dcc delete committees" on public.committees for delete to authenticated using (public.is_active_dcc_head());

drop policy if exists "dcc read delegate applications" on public.delegates;
create policy "dcc read delegate applications" on public.delegates for select to authenticated using (public.is_active_dcc_head());
drop policy if exists "dcc update delegate applications" on public.delegates;
create policy "dcc update delegate applications" on public.delegates for update to authenticated using (public.is_active_dcc_head()) with check (public.is_active_dcc_head());

drop policy if exists "dcc update delegate registration settings" on public.settings;
create policy "dcc update delegate registration settings" on public.settings for update to authenticated
using (public.is_active_dcc_head() and key in ('registration_open','early_bird_opens','early_bird_closes','regular_opens','regular_closes'))
with check (public.is_active_dcc_head() and key in ('registration_open','early_bird_opens','early_bird_closes','regular_opens','regular_closes'));
