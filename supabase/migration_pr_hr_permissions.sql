-- =====================================================================
-- WEST MUN 2027 — PR Sponsors & HR Inquiries Role-Based Access Control
--
-- This safe, additive migration implements:
-- 1. Helper functions public.is_pr_head() and public.is_hr_head()
--    verifying authenticated user Auth UUID against public.department_heads.
-- 2. Safe additive schema update for public.sponsors (adds 'description' column).
-- 3. Expanded status check on public.inquiries to permit 'resolved'.
-- 4. RLS policies on public.sponsors granting PR heads CRUD access while
--    preserving existing admin/super admin privileges and public read of published sponsors.
-- 5. Storage RLS policies on storage.objects (bucket 'site-files') granting PR heads upload access.
-- 6. RLS policies on public.inquiries granting HR heads SELECT and UPDATE access
--    while preserving existing admin/super admin privileges, public submission,
--    and blocking unauthorized department heads and ordinary users.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Additive columns for public.sponsors
-- ---------------------------------------------------------------------
alter table public.sponsors add column if not exists description text not null default '' check (char_length(description) <= 1500);
alter table public.sponsors add column if not exists sort_order integer not null default 0;
alter table public.sponsors add column if not exists published boolean not null default true;

-- ---------------------------------------------------------------------
-- 2. Status constraint update for public.inquiries (support 'resolved')
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'inquiries' and constraint_name = 'inquiries_status_check'
  ) then
    alter table public.inquiries drop constraint inquiries_status_check;
  end if;
  alter table public.inquiries add constraint inquiries_status_check check (status in ('new', 'read', 'archived', 'resolved'));
exception when others then
  null; -- Ignore if constraint cannot be replaced
end $$;

-- ---------------------------------------------------------------------
-- 3. Role-based helper functions (SECURITY DEFINER)
--    Uses existing authenticated user ID and active department_heads assignment.
--    Handles both short slugs ('pr', 'hr') and full department names consistently.
-- ---------------------------------------------------------------------
create or replace function public.is_pr_head()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.department_heads dh
    where (dh.id = auth.uid() or dh.user_id = auth.uid())
      and coalesce(dh.active, true) = true
      and lower(btrim(dh.department)) in ('pr', 'public relations', 'public relations & external affairs')
  );
$$;

create or replace function public.is_hr_head()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.department_heads dh
    where (dh.id = auth.uid() or dh.user_id = auth.uid())
      and coalesce(dh.active, true) = true
      and lower(btrim(dh.department)) in ('hr', 'human resources', 'human resources & delegate services')
  );
$$;

-- ---------------------------------------------------------------------
-- 4. Row Level Security for public.sponsors
-- ---------------------------------------------------------------------
alter table public.sponsors enable row level security;

-- Public reads published sponsors, Admins and PR Heads read all (including unpublished drafts)
drop policy if exists "public read published" on public.sponsors;
drop policy if exists "sponsors select access" on public.sponsors;
create policy "sponsors select access" on public.sponsors
  for select to anon, authenticated
  using (published or public.is_admin() or public.is_pr_head());

-- PR Heads and Admins can create new sponsor records
drop policy if exists "admin insert" on public.sponsors;
drop policy if exists "sponsors insert access" on public.sponsors;
create policy "sponsors insert access" on public.sponsors
  for insert to authenticated
  with check (public.is_admin() or public.is_pr_head());

-- PR Heads and Admins can update sponsor records
drop policy if exists "admin update" on public.sponsors;
drop policy if exists "sponsors update access" on public.sponsors;
create policy "sponsors update access" on public.sponsors
  for update to authenticated
  using (public.is_admin() or public.is_pr_head())
  with check (public.is_admin() or public.is_pr_head());

-- PR Heads and Admins can delete sponsor records
drop policy if exists "admin delete" on public.sponsors;
drop policy if exists "sponsors delete access" on public.sponsors;
create policy "sponsors delete access" on public.sponsors
  for delete to authenticated
  using (public.is_admin() or public.is_pr_head());

-- ---------------------------------------------------------------------
-- 5. Row Level Security for storage.objects (bucket: 'site-files')
--    Permits PR Heads to upload sponsor logos to the shared public bucket.
-- ---------------------------------------------------------------------
drop policy if exists "site-files admin insert" on storage.objects;
drop policy if exists "site-files upload access" on storage.objects;
create policy "site-files upload access" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-files' and (public.is_admin() or public.is_pr_head()));

drop policy if exists "site-files admin update" on storage.objects;
drop policy if exists "site-files update access" on storage.objects;
create policy "site-files update access" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-files' and (public.is_admin() or public.is_pr_head()))
  with check (bucket_id = 'site-files' and (public.is_admin() or public.is_pr_head()));

drop policy if exists "site-files admin select" on storage.objects;
drop policy if exists "site-files admin read" on storage.objects;
drop policy if exists "site-files read access" on storage.objects;
create policy "site-files read access" on storage.objects
  for select to authenticated
  using (bucket_id = 'site-files' and (public.is_admin() or public.is_pr_head()));

-- ---------------------------------------------------------------------
-- 6. Row Level Security for public.inquiries
--    HR Heads and Admins can read inquiries and update status/notes.
--    Deletion remains strictly limited to Super Admin / Admins.
--    Public submission continues to be permitted.
-- ---------------------------------------------------------------------
alter table public.inquiries enable row level security;

-- Public contact form submission (unchanged)
drop policy if exists "public submit" on public.inquiries;
create policy "public submit" on public.inquiries
  for insert to anon, authenticated
  with check (true);

-- Admins and HR Heads can view inquiries (PR heads and other heads are blocked)
drop policy if exists "admin read" on public.inquiries;
drop policy if exists "inquiries read access" on public.inquiries;
create policy "inquiries read access" on public.inquiries
  for select to authenticated
  using (public.is_admin() or public.is_hr_head());

-- Admins and HR Heads can update inquiries (status, admin_notes)
drop policy if exists "admin update" on public.inquiries;
drop policy if exists "inquiries update access" on public.inquiries;
create policy "inquiries update access" on public.inquiries
  for update to authenticated
  using (public.is_admin() or public.is_hr_head())
  with check (public.is_admin() or public.is_hr_head());

-- Deletion is restricted to Admins only
drop policy if exists "admin delete" on public.inquiries;
drop policy if exists "inquiries delete access" on public.inquiries;
create policy "inquiries delete access" on public.inquiries
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. Explicit SQL Table Grants
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.sponsors to authenticated;
grant select, update on public.inquiries to authenticated;
