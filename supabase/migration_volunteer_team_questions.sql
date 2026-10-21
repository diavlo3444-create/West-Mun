-- =====================================================================
-- WEST MUN 2027 — Volunteer Team Assessment Questions Migration
--
-- Adds the 4 mandatory assessment questions to public.team_registrations:
-- 1. Special Skills & Contribution
-- 2. Teamwork & Accountability (Teammate not pulling weight)
-- 3. Emergency & Conflict Reaction (Sudden medical emergency or argument)
-- 4. Professionalism with Delegates (Difficult or unresponsive delegates)
--
-- Enforces mandatory responses at database level via trigger for team = 'volunteers'.
-- Grants explicit insert privileges to anon & authenticated roles.
-- Safe and backward-compatible with existing registrations and other teams.
--
-- Run in Supabase > SQL Editor > New query.
-- =====================================================================

-- 1. Add volunteer questions columns to team_registrations
alter table public.team_registrations
  add column if not exists volunteer_special_skills text not null default '',
  add column if not exists volunteer_teamwork_conflict text not null default '',
  add column if not exists volunteer_emergency_reaction text not null default '',
  add column if not exists volunteer_delegate_professionalism text not null default '';

-- 2. Enhanced trigger guard: enforces team closure, rate limiting, and Security & Volunteer question validation
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

    -- Strict validation for Volunteer team assessment questions
    if new.team = 'volunteers' then
      if btrim(coalesce(new.volunteer_special_skills, '')) = '' then
        raise exception 'volunteer_special_skills_required: Special skills response is required.' using errcode = 'P0001';
      end if;

      if btrim(coalesce(new.volunteer_teamwork_conflict, '')) = '' then
        raise exception 'volunteer_teamwork_conflict_required: Teamwork & accountability response is required.' using errcode = 'P0001';
      end if;

      if btrim(coalesce(new.volunteer_emergency_reaction, '')) = '' then
        raise exception 'volunteer_emergency_reaction_required: Emergency reaction response is required.' using errcode = 'P0001';
      end if;

      if btrim(coalesce(new.volunteer_delegate_professionalism, '')) = '' then
        raise exception 'volunteer_delegate_professionalism_required: Professionalism response is required.' using errcode = 'P0001';
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

-- 3. Grant explicit column insert permissions to public / anon and authenticated
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
  security_handling_harassment,
  volunteer_special_skills,
  volunteer_teamwork_conflict,
  volunteer_emergency_reaction,
  volunteer_delegate_professionalism
) on public.team_registrations to anon, authenticated;

-- Ensure select & update are granted to authenticated
grant select, update on public.team_registrations to authenticated;
