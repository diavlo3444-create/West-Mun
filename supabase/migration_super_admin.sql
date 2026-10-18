-- =====================================================================
-- WEST MUN 2027 — IT Super Admin & Head Account Management Migration
--
-- Configures top-level IT Super Admin authorization strictly for:
--   diavlo3444@gmail.com
--
-- Enforces server/database-level verification so that ONLY the authenticated
-- user diavlo3444@gmail.com registered in public.admins can manage
-- department head accounts and assignments.
--
-- Run this in Supabase > SQL Editor > New query.
-- =====================================================================

-- 1. Helper function: verify caller is the authorized IT Super Admin
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
      and lower(btrim(a.email)) = 'diavlo3444@gmail.com'
  );
$$;

-- 2. Ensure RLS on department_heads allows Super Admin management
alter table public.department_heads enable row level security;

-- Super Admin Full Access Policy
drop policy if exists "super admin full access department_heads" on public.department_heads;
create policy "super admin full access department_heads" on public.department_heads
  for all to authenticated
  using (public.is_super_admin() or public.is_admin())
  with check (public.is_super_admin());

-- 3. Stored Procedure for Updating Department Head Assignment & Status
create or replace function public.super_admin_update_head(
  p_head_id     uuid,
  p_department  text,
  p_section     text default null,
  p_active      boolean default true,
  p_head_name   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Cryptographic check: Only authenticated diavlo3444@gmail.com in public.admins
  if not public.is_super_admin() then
    raise exception 'access_denied: only diavlo3444@gmail.com as IT Super Admin can modify department heads' using errcode = '42501';
  end if;

  -- Validate department
  if p_department not in (
    'design', 'marketing', 'media_press', 'security', 'volunteers',
    'pr', 'hr', 'logistics', 'it', 'ceremonies', 'dcc'
  ) then
    raise exception 'invalid_department: %', p_department using errcode = 'P0001';
  end if;

  -- Validate section for gender-separated departments
  if p_department in ('media_press', 'security', 'volunteers') then
    if p_section not in ('male', 'female') or p_section is null then
      raise exception 'section_required: % requires section to be either "male" or "female"', p_department using errcode = 'P0001';
    end if;
  else
    if p_section is not null then
      raise exception 'invalid_section: % does not use gender sections; section must be NULL', p_department using errcode = 'P0001';
    end if;
  end if;

  update public.department_heads
  set department = p_department,
      section    = p_section,
      active     = p_active,
      head_name  = coalesce(p_head_name, head_name),
      updated_at = now()
  where id = p_head_id or user_id = p_head_id;

  if not found then
    raise exception 'not_found: department head with id % not found', p_head_id using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'status', 'success',
    'head_id', p_head_id,
    'department', p_department,
    'section', p_section,
    'active', p_active
  );
end;
$$;

-- 4. Stored Procedure for Toggling Head Active Status (Instant Revocation)
create or replace function public.super_admin_toggle_head_active(
  p_head_id uuid,
  p_active  boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'access_denied: only diavlo3444@gmail.com as IT Super Admin can toggle head status' using errcode = '42501';
  end if;

  update public.department_heads
  set active = p_active,
      updated_at = now()
  where id = p_head_id or user_id = p_head_id;

  if not found then
    raise exception 'not_found: department head with id % not found', p_head_id using errcode = 'P0002';
  end if;

  return jsonb_build_object('status', 'success', 'head_id', p_head_id, 'active', p_active);
end;
$$;

-- 5. Stored Procedure for Removing Department Head Portal Access
create or replace function public.super_admin_remove_head(
  p_head_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'access_denied: only diavlo3444@gmail.com as IT Super Admin can remove department heads' using errcode = '42501';
  end if;

  delete from public.department_heads
  where id = p_head_id or user_id = p_head_id;

  return jsonb_build_object('status', 'success', 'removed_head_id', p_head_id);
end;
$$;

-- 6. Grant permissions
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.super_admin_update_head(uuid, text, text, boolean, text) to authenticated;
grant execute on function public.super_admin_toggle_head_active(uuid, boolean) to authenticated;
grant execute on function public.super_admin_remove_head(uuid) to authenticated;

-- =====================================================================
-- STEP TO AUTHORIZE diavlo3444@gmail.com:
--
-- 1. Create or confirm user diavlo3444@gmail.com in Supabase Auth (Authentication > Users).
-- 2. Run the snippet below:
--
-- insert into public.admins (user_id, email)
-- select id, 'diavlo3444@gmail.com'
-- from auth.users
-- where lower(email) = 'diavlo3444@gmail.com'
-- on conflict (user_id) do update set email = excluded.email;
-- =====================================================================
