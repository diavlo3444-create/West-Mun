-- =====================================================================
-- WEST MUN 2027 — Team Registration & Management Migration
--
-- Adds the `team_registrations` table with full Row Level Security,
-- independent team open/closed switches in `settings`, and database-level
-- triggers to strictly block submissions when a team is closed.
--
-- Safe to run in Supabase > SQL Editor > New query.
-- =====================================================================

-- 1. Create team_registrations table
create table if not exists public.team_registrations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  full_name       text not null check (char_length(btrim(full_name)) between 2 and 100),
  email           text not null check (char_length(email) between 6 and 120 and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$'),
  phone           text not null default '' check (char_length(phone) <= 40),
  institution     text not null check (char_length(btrim(institution)) between 2 and 150),
  team            text not null check (team in ('security', 'media', 'volunteers')),
  experience      text not null default '' check (char_length(experience) <= 3000),
  statement       text not null default '' check (char_length(statement) <= 3000),
  status          text not null default 'received' check (status in ('received', 'under_review', 'accepted', 'waitlisted', 'rejected', 'withdrawn')),
  admin_notes     text not null default '' check (char_length(admin_notes) <= 5000),
  age_confirmed   boolean not null check (age_confirmed),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consent_at      timestamptz not null default now()
);

-- Unique application per email per team
create unique index if not exists team_registrations_email_team_key
  on public.team_registrations (lower(email), team);

create index if not exists team_registrations_created_idx
  on public.team_registrations (created_at desc);

-- 2. Server-side guard trigger enforcing team closure and rate limiting
create or replace function public.team_registrations_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open text;
begin
  if tg_op = 'INSERT' then
    new.full_name   := btrim(new.full_name);
    new.email       := lower(btrim(new.email));
    new.institution := btrim(new.institution);
    new.status      := 'received';
    new.admin_notes := '';
    new.created_at  := now();
    new.updated_at  := now();
    new.consent_at  := now();

    -- Server-side enforcement: check authoritative status in public.settings
    v_open := public.setting('team_' || new.team || '_open');
    if lower(btrim(v_open)) <> 'true' then
      raise exception 'team_registration_closed' using errcode = 'P0001';
    end if;

    -- Flood cap: max 20 per minute
    if (select count(*) from public.team_registrations t where t.created_at > now() - interval '1 minute') >= 20 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;

    return new;
  end if;

  -- UPDATE: only organisers can reach this; protect consent timestamp
  new.created_at      := old.created_at;
  new.consent_at      := old.consent_at;
  new.consent_version := old.consent_version;
  new.age_confirmed   := old.age_confirmed;
  new.updated_at      := now();
  return new;
end;
$$;

drop trigger if exists team_registrations_guard_trg on public.team_registrations;
create trigger team_registrations_guard_trg before insert or update on public.team_registrations
  for each row execute function public.team_registrations_guard();

-- 3. Row Level Security policies
alter table public.team_registrations enable row level security;

drop policy if exists "public submit team" on public.team_registrations;
create policy "public submit team" on public.team_registrations
  for insert to anon, authenticated with check (true);

drop policy if exists "admin read team" on public.team_registrations;
create policy "admin read team" on public.team_registrations
  for select to authenticated using (public.is_admin());

drop policy if exists "admin update team" on public.team_registrations;
create policy "admin update team" on public.team_registrations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete team" on public.team_registrations;
create policy "admin delete team" on public.team_registrations
  for delete to authenticated using (public.is_admin());

-- 4. Explicit permissions
revoke all on public.team_registrations from anon, authenticated;

grant insert (full_name, email, phone, institution, team, experience, statement, age_confirmed, consent_version)
  on public.team_registrations to anon, authenticated;

grant select, update, delete on public.team_registrations to authenticated;

-- 5. Seed default team registration switches
insert into public.settings (key, value)
values
  ('team_security_open', 'true'),
  ('team_media_open', 'true'),
  ('team_volunteers_open', 'true'),
  ('team_delegates_open', 'false')
on conflict (key) do nothing;
