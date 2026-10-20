-- =====================================================================
-- WEST MUN 2027 — Security Team Assessment Questions Migration
--
-- Adds the 4 mandatory long-answer scenario questions to public.team_registrations:
-- 1. Emergency Problem-Solving (minimum 80 words)
-- 2. Teamwork and Communication (minimum 50 words)
-- 3. Motivation (minimum 50 words)
-- 4. Handling Bullying and Harassment (minimum 50 words)
--
-- Enforces word counts at database level via trigger for team = 'security'.
-- Grants explicit insert privileges to anon & authenticated roles.
-- Safe and backward-compatible with existing registrations and other teams.
--
-- Run in Supabase > SQL Editor > New query.
-- =====================================================================

-- 1. Add long-answer columns to team_registrations
alter table public.team_registrations
  add column if not exists security_emergency_steps text not null default '',
  add column if not exists security_teamwork text not null default '',
  add column if not exists security_motivation text not null default '',
  add column if not exists security_handling_harassment text not null default '';

-- 2. Helper word counter function in PostgreSQL
create or replace function public.word_count(p_text text)
returns integer
language plpgsql
immutable
as $$
declare
  v_trimmed text;
begin
  v_trimmed := btrim(coalesce(p_text, ''));
  if v_trimmed = '' then
    return 0;
  end if;
  return coalesce(array_length(regexp_split_to_array(v_trimmed, '\s+'), 1), 0);
end;
$$;

-- 3. Enhanced trigger guard: enforces team closure, rate limiting, and Security team word counts
create or replace function public.team_registrations_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open text;
  v_words integer;
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

    -- Strict validation for Security team long-answer scenario questions
    if new.team = 'security' then
      -- Question 1: Emergency Problem-Solving (min 80 words)
      v_words := public.word_count(new.security_emergency_steps);
      if v_words < 80 then
        raise exception 'security_emergency_steps_min_words_80: Emergency Problem-Solving requires at least 80 words (received %)', v_words using errcode = 'P0001';
      end if;

      -- Question 2: Teamwork and Communication (min 50 words)
      v_words := public.word_count(new.security_teamwork);
      if v_words < 50 then
        raise exception 'security_teamwork_min_words_50: Teamwork and Communication requires at least 50 words (received %)', v_words using errcode = 'P0001';
      end if;

      -- Question 3: Motivation (min 50 words)
      v_words := public.word_count(new.security_motivation);
      if v_words < 50 then
        raise exception 'security_motivation_min_words_50: Motivation requires at least 50 words (received %)', v_words using errcode = 'P0001';
      end if;

      -- Question 4: Handling Bullying and Harassment (min 50 words)
      v_words := public.word_count(new.security_handling_harassment);
      if v_words < 50 then
        raise exception 'security_handling_harassment_min_words_50: Handling Bullying and Harassment requires at least 50 words (received %)', v_words using errcode = 'P0001';
      end if;
    end if;

    -- Flood cap: max 20 per minute across submissions
    if (select count(*) from public.team_registrations t where t.created_at > now() - interval '1 minute') >= 20 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;

    return new;
  end if;

  -- UPDATE: only organisers/heads can reach this; protect consent timestamp and immutable fields
  new.created_at      := old.created_at;
  new.consent_at      := old.consent_at;
  new.consent_version := old.consent_version;
  new.age_confirmed   := old.age_confirmed;
  new.updated_at      := now();
  return new;
end;
$$;

drop trigger if exists team_registrations_guard_trg on public.team_registrations;
create trigger team_registrations_guard_trg
  before insert or update on public.team_registrations
  for each row execute function public.team_registrations_guard();

-- 4. Grant explicit column insert permissions to public / anon and authenticated
grant insert (
  full_name,
  email,
  phone,
  institution,
  team,
  section,
  experience,
  statement,
  age_confirmed,
  consent_version,
  security_emergency_steps,
  security_teamwork,
  security_motivation,
  security_handling_harassment
) on public.team_registrations to anon, authenticated;

-- Ensure select & update are granted to authenticated
grant select, update on public.team_registrations to authenticated;
