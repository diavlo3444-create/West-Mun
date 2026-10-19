-- =====================================================================
-- WEST MUN 2027 — Admin Accounts Migration: Super Admin & Normal Admins
--
-- Safely extends `public.admins` table to distinguish IT Super Admin
-- from normal Admin accounts, supporting name storage, active status,
-- and strict database-level security checks.
--
-- Safe to run in Supabase > SQL Editor > New query.
-- =====================================================================

-- 1. Add additive columns to public.admins
alter table public.admins
  add column if not exists full_name text not null default '',
  add column if not exists role text not null default 'admin' check (role in ('super_admin', 'admin')),
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- 2. Strictly assign Super Admin role to diavlo3444@gmail.com
update public.admins
set role = 'super_admin',
    full_name = coalesce(nullif(full_name, ''), 'IT Super Admin'),
    active = true,
    updated_at = now()
where lower(btrim(email)) = 'diavlo3444@gmail.com';

-- 3. Automatic updated_at trigger for public.admins
create or replace function public.set_admins_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists admins_updated_at on public.admins;
create trigger admins_updated_at
  before update on public.admins
  for each row execute function public.set_admins_updated_at();

-- 4. Update public.is_admin() to require an ACTIVE admin record
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and a.active = true
  );
$$;

-- 5. Helper function: public.is_super_admin()
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and a.active = true
      and (a.role = 'super_admin' or lower(btrim(a.email)) = 'diavlo3444@gmail.com')
  );
$$;

-- 6. Row Level Security policies for public.admins
alter table public.admins enable row level security;

-- Each admin can read their own row
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- Super Admin can read all admin rows
drop policy if exists "super admin read all admins" on public.admins;
create policy "super admin read all admins" on public.admins
  for select to authenticated
  using (public.is_super_admin() or user_id = auth.uid());

-- Prevent normal admins from inserting, updating, or deleting admin records
-- All admin provisioning runs exclusively through the trusted serverless API
-- with service-role credentials and strict diavlo3444@gmail.com verification.
drop policy if exists "super admin modify admins" on public.admins;
create policy "super admin modify admins" on public.admins
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.admins to authenticated;
