-- =====================================================================
-- WEST MUN 2027 — Department Heads Migration
--
-- Adds the `department_heads` table with Row Level Security (RLS),
-- allowing authenticated users to read their own department assignment
-- and administrators to manage department head assignments.
--
-- Run this in Supabase > SQL Editor > New query.
--
-- NOTE (2026): this file creates the original `id`-keyed table. The current
-- application keys on `user_id`. If this file was ever run, also run
-- supabase/migration_department_heads_repair.sql, which adds/backfills the
-- missing columns without deleting data.
-- =====================================================================

-- 1. Create department_heads table
create table if not exists public.department_heads (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null check (char_length(email) between 5 and 120 and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$'),
  department  text not null check (department in (
    'design',
    'marketing',
    'media_press',
    'security',
    'volunteers',
    'pr',
    'hr',
    'logistics',
    'it',
    'ceremonies',
    'dcc'
  )),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Unique constraint: each user account is assigned to one department
create unique index if not exists department_heads_id_idx on public.department_heads (id);
create index if not exists department_heads_department_idx on public.department_heads (department);

-- 2. Automatic updated_at trigger
drop trigger if exists department_heads_updated_at on public.department_heads;
create trigger department_heads_updated_at
  before update on public.department_heads
  for each row execute function public.set_updated_at();

-- 3. Row Level Security
alter table public.department_heads enable row level security;

-- Policy: Authenticated users can read their own department head assignment
drop policy if exists "heads read own record" on public.department_heads;
create policy "heads read own record" on public.department_heads
  for select to authenticated
  using (auth.uid() = id);

-- Policy: Admins have full access to view, add, modify, and delete department heads
drop policy if exists "admin full access department_heads" on public.department_heads;
create policy "admin full access department_heads" on public.department_heads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Permissions
grant usage on schema public to authenticated;
grant select on public.department_heads to authenticated;
grant insert, update, delete on public.department_heads to authenticated;

-- =====================================================================
-- EXAMPLE: How to assign a department head:
--
-- 1. Create or invite the user in Supabase Auth (Authentication > Users).
-- 2. Copy their User UID (e.g. 'a0000000-0000-0000-0000-000000000001').
-- 3. Run:
--
-- insert into public.department_heads (id, email, department, active)
-- values ('<USER_UID>', 'head.security@westmun.org', 'security', true)
-- on conflict (id) do update set department = excluded.department, active = true;
-- =====================================================================
