-- =====================================================================
-- WEST MUN — database structure + security rules (Supabase / Postgres)
--
-- Run this ONCE in Supabase > SQL Editor > New query. It is safe to run
-- again later (every statement is idempotent), e.g. after an update.
-- Run seed.sql afterwards to load the current website content, then
-- make_admin.sql to make yourself an organiser.
--
-- Security model: the rules live HERE, in the database (Row Level
-- Security), not in website code. Anyone can talk to the database
-- directly with the public "anon" key, so the rules below are the only
-- thing that actually protects the data.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Organisers
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- Logging in does NOT make someone an admin. Every write rule below asks
-- this function, which looks the logged-in user up in public.admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;


-- ---------------------------------------------------------------------
-- 2. Helper functions
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Parses a date typed into Settings without ever raising an error
-- (a typo in Settings must never break public registration).
create or replace function public.try_date(p text)
returns date
language plpgsql
immutable
as $$
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return p::date;
exception when others then
  return null;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. Settings (key/value: fees, dates, links, page texts, legal info)
--    PUBLIC READ: never put secrets or private notes in here.
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key check (char_length(key) between 1 and 80),
  value      text not null default '' check (char_length(value) <= 20000),
  updated_at timestamptz not null default now()
);

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

create or replace function public.setting(p_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select s.value from public.settings s where s.key = p_key), '');
$$;

-- Registration state of one tier on a given day (dates are UTC):
--   'closed'  master switch is off
--   'not_yet' the tier's opening date has not arrived
--   'ended'   the tier's closing date has passed
--   'open'    delegates may register
create or replace function public.tier_state(
  p_tier text,
  p_on   date default (now() at time zone 'utc')::date
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_opens  date;
  v_closes date;
begin
  if p_tier not in ('early_bird', 'regular') then
    return 'closed';
  end if;
  if lower(btrim(public.setting('registration_open'))) <> 'true' then
    return 'closed';
  end if;
  v_opens  := public.try_date(btrim(public.setting(p_tier || '_opens')));
  v_closes := public.try_date(btrim(public.setting(p_tier || '_closes')));
  if v_opens is not null and p_on < v_opens then
    return 'not_yet';
  end if;
  if v_closes is not null and p_on > v_closes then
    return 'ended';
  end if;
  return 'open';
end;
$$;

-- The fee for a tier, or NULL while the fee is still "TBA" / invalid.
create or replace function public.tier_fee(p_tier text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
begin
  if p_tier not in ('early_bird', 'regular') then
    return null;
  end if;
  v := btrim(public.setting('fee_' || p_tier));
  if v ~ '^\d{1,6}(\.\d{1,2})?$' then
    return v::numeric;
  end if;
  return null;
end;
$$;


-- ---------------------------------------------------------------------
-- 4. Website content (everything the public site displays)
-- ---------------------------------------------------------------------
create table if not exists public.secretariat (
  id             uuid primary key default gen_random_uuid(),
  sort_order     integer not null default 0,
  published      boolean not null default true,
  role           text not null check (char_length(btrim(role)) between 1 and 120),
  name           text not null check (char_length(btrim(name)) between 1 and 120),
  department     text not null default '' check (char_length(department) <= 120),
  bio            text not null default '' check (char_length(bio) <= 1500),
  image_url      text not null default '' check (char_length(image_url) <= 600 and (image_url = '' or image_url ~ '^(https://|/[^/])')),
  image_position text not null default 'center' check (image_position in ('center', 'top', 'bottom')),
  confirmed      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.committees (
  id          uuid primary key default gen_random_uuid(),
  sort_order  integer not null default 0,
  published   boolean not null default true,
  name        text not null default 'TBA' check (char_length(btrim(name)) between 1 and 160),
  type        text not null default 'General Assembly' check (char_length(btrim(type)) between 1 and 80),
  topic       text not null default 'TBA' check (char_length(topic) <= 300),
  chair       text not null default 'TBA' check (char_length(chair) <= 120),
  description text not null default '' check (char_length(description) <= 1500),
  level       text not null default '' check (char_length(level) <= 120),
  created_at  timestamptz not null default now()
);

create table if not exists public.schedule_days (
  id         uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  published  boolean not null default true,
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  date_text  text not null default 'TBA' check (char_length(date_text) <= 80),
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_sessions (
  id          uuid primary key default gen_random_uuid(),
  day_id      uuid not null references public.schedule_days (id) on delete cascade,
  sort_order  integer not null default 0,
  published   boolean not null default true,
  time_text   text not null default 'TBA' check (char_length(time_text) <= 80),
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  location    text not null default 'TBA' check (char_length(location) <= 120),
  description text not null default '' check (char_length(description) <= 1500),
  created_at  timestamptz not null default now()
);
create index if not exists schedule_sessions_day_idx on public.schedule_sessions (day_id);

create table if not exists public.faq (
  id         uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  published  boolean not null default true,
  question   text not null check (char_length(btrim(question)) between 1 and 300),
  answer     text not null check (char_length(btrim(answer)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  sort_order  integer not null default 0,
  published   boolean not null default true,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 600),
  category    text not null default 'Other' check (char_length(category) <= 60),
  file_url    text not null check (char_length(file_url) <= 600 and file_url ~ '^(https://|/[^/])'),
  created_at  timestamptz not null default now()
);

create table if not exists public.sponsors (
  id          uuid primary key default gen_random_uuid(),
  sort_order  integer not null default 0,
  published   boolean not null default true,
  name        text not null check (char_length(btrim(name)) between 1 and 160),
  tier        text not null default '' check (char_length(tier) <= 60),
  logo_url    text not null default '' check (char_length(logo_url) <= 600 and (logo_url = '' or logo_url ~ '^(https://|/[^/])')),
  website_url text not null default '' check (char_length(website_url) <= 600 and (website_url = '' or website_url ~ '^(https://|/[^/])')),
  created_at  timestamptz not null default now()
);

create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  published    boolean not null default true,
  pinned       boolean not null default false,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  body         text not null default '' check (char_length(body) <= 3000),
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. Private tables: delegate applications + contact inquiries
--    The public can INSERT only. Only organisers can read them.
-- ---------------------------------------------------------------------
create table if not exists public.delegates (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  full_name       text not null check (char_length(btrim(full_name)) between 2 and 100),
  email           text not null check (char_length(email) between 6 and 120 and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$'),
  institution     text not null check (char_length(btrim(institution)) between 2 and 150),
  tier            text not null check (tier in ('early_bird', 'regular')),
  delegation_type text not null check (delegation_type in ('single_delegate', 'school_delegation')),
  status          text not null default 'received' check (status in ('received', 'under_review', 'accepted', 'waitlisted', 'rejected', 'withdrawn')),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'waived', 'refunded')),
  fee_amount      numeric(10, 2) check (fee_amount is null or fee_amount >= 0),
  admin_notes     text not null default '' check (char_length(admin_notes) <= 5000),
  age_confirmed   boolean not null check (age_confirmed),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consent_at      timestamptz not null default now()
);
create unique index if not exists delegates_email_tier_key on public.delegates (lower(email), tier);
create index if not exists delegates_created_idx on public.delegates (created_at desc);

create table if not exists public.inquiries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  name            text not null check (char_length(btrim(name)) between 2 and 100),
  email           text not null check (char_length(email) between 6 and 120 and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$'),
  subject         text not null check (char_length(btrim(subject)) between 3 and 150),
  message         text not null check (char_length(btrim(message)) between 10 and 3000),
  status          text not null default 'new' check (status in ('new', 'read', 'archived')),
  admin_notes     text not null default '' check (char_length(admin_notes) <= 5000),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consent_at      timestamptz not null default now()
);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);

-- Delegates cannot cheat: whatever the browser sends, these triggers force
-- the status to "received", the payment to "unpaid" and the fee to the real
-- price, and they enforce the registration switch, windows and a flood cap.
create or replace function public.delegates_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
begin
  if tg_op = 'INSERT' then
    new.full_name      := btrim(new.full_name);
    new.email          := lower(btrim(new.email));
    new.institution    := btrim(new.institution);
    new.status         := 'received';
    new.payment_status := 'unpaid';
    new.admin_notes    := '';
    new.created_at     := now();
    new.updated_at     := now();
    new.consent_at     := now();

    v_state := public.tier_state(new.tier);
    if v_state = 'closed'  then raise exception 'registration_closed'  using errcode = 'P0001'; end if;
    if v_state = 'not_yet' then raise exception 'registration_not_yet' using errcode = 'P0001'; end if;
    if v_state = 'ended'   then raise exception 'registration_ended'   using errcode = 'P0001'; end if;

    if (select count(*) from public.delegates d where d.created_at > now() - interval '1 minute') >= 20 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;

    new.fee_amount := public.tier_fee(new.tier);
    return new;
  end if;

  -- UPDATE (only organisers can reach this): the consent record is frozen.
  new.created_at      := old.created_at;
  new.consent_at      := old.consent_at;
  new.consent_version := old.consent_version;
  new.age_confirmed   := old.age_confirmed;
  new.updated_at      := now();
  return new;
end;
$$;

drop trigger if exists delegates_guard_trg on public.delegates;
create trigger delegates_guard_trg before insert or update on public.delegates
  for each row execute function public.delegates_guard();

create or replace function public.inquiries_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.name        := btrim(new.name);
    new.email       := lower(btrim(new.email));
    new.subject     := btrim(new.subject);
    new.message     := btrim(new.message);
    new.status      := 'new';
    new.admin_notes := '';
    new.created_at  := now();
    new.updated_at  := now();
    new.consent_at  := now();

    if (select count(*) from public.inquiries i where i.created_at > now() - interval '1 minute') >= 10 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    return new;
  end if;

  new.created_at      := old.created_at;
  new.consent_at      := old.consent_at;
  new.consent_version := old.consent_version;
  new.updated_at      := now();
  return new;
end;
$$;

drop trigger if exists inquiries_guard_trg on public.inquiries;
create trigger inquiries_guard_trg before insert or update on public.inquiries
  for each row execute function public.inquiries_guard();


-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------
alter table public.admins        enable row level security;
alter table public.settings      enable row level security;
alter table public.announcements enable row level security;
alter table public.delegates     enable row level security;
alter table public.inquiries     enable row level security;

-- admins: you can only see your own row. Nobody can change this table
-- through the website/API; organisers are added in the SQL Editor only.
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- settings: public read, admin write
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings
  for select to anon, authenticated using (true);
drop policy if exists "settings admin insert" on public.settings;
create policy "settings admin insert" on public.settings
  for insert to authenticated with check (public.is_admin());
drop policy if exists "settings admin update" on public.settings;
create policy "settings admin update" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "settings admin delete" on public.settings;
create policy "settings admin delete" on public.settings
  for delete to authenticated using (public.is_admin());

-- announcements: public sees published ones whose publish time has arrived
alter table public.announcements enable row level security;
drop policy if exists "announcements public read" on public.announcements;
create policy "announcements public read" on public.announcements
  for select to anon, authenticated
  using ((published and published_at <= now()) or public.is_admin());
drop policy if exists "announcements admin insert" on public.announcements;
create policy "announcements admin insert" on public.announcements
  for insert to authenticated with check (public.is_admin());
drop policy if exists "announcements admin update" on public.announcements;
create policy "announcements admin update" on public.announcements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "announcements admin delete" on public.announcements;
create policy "announcements admin delete" on public.announcements
  for delete to authenticated using (public.is_admin());

-- content tables: public reads published rows, admins do everything
do $$
declare
  t text;
begin
  foreach t in array array['secretariat', 'committees', 'schedule_days', 'schedule_sessions', 'faq', 'documents', 'sponsors']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "public read published" on public.%I', t);
    execute format('create policy "public read published" on public.%I for select to anon, authenticated using (published or public.is_admin())', t);

    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);

    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);

    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- delegates + inquiries: anyone may submit, only admins may read/change/delete
drop policy if exists "public submit" on public.delegates;
create policy "public submit" on public.delegates
  for insert to anon, authenticated with check (true);
drop policy if exists "admin read" on public.delegates;
create policy "admin read" on public.delegates
  for select to authenticated using (public.is_admin());
drop policy if exists "admin update" on public.delegates;
create policy "admin update" on public.delegates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete" on public.delegates;
create policy "admin delete" on public.delegates
  for delete to authenticated using (public.is_admin());

drop policy if exists "public submit" on public.inquiries;
create policy "public submit" on public.inquiries
  for insert to anon, authenticated with check (true);
drop policy if exists "admin read" on public.inquiries;
create policy "admin read" on public.inquiries
  for select to authenticated using (public.is_admin());
drop policy if exists "admin update" on public.inquiries;
create policy "admin update" on public.inquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete" on public.inquiries;
create policy "admin delete" on public.inquiries
  for delete to authenticated using (public.is_admin());


-- ---------------------------------------------------------------------
-- 7. Explicit grants (so it works whether or not Supabase auto-exposes
--    new tables). Row Level Security above still decides every row.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

revoke all on public.admins, public.settings, public.secretariat, public.committees,
              public.schedule_days, public.schedule_sessions, public.faq, public.documents,
              public.sponsors, public.announcements, public.delegates, public.inquiries
  from anon, authenticated;

grant select on public.settings, public.secretariat, public.committees, public.schedule_days,
                public.schedule_sessions, public.faq, public.documents, public.sponsors,
                public.announcements
  to anon, authenticated;

grant insert, update, delete on public.settings, public.secretariat, public.committees,
                                public.schedule_days, public.schedule_sessions, public.faq,
                                public.documents, public.sponsors, public.announcements
  to authenticated;

grant select on public.admins to authenticated;

-- The public may only fill in these columns; everything else is set by the
-- triggers above (so status / payment / fee can never come from the browser).
grant insert (full_name, email, institution, tier, delegation_type, age_confirmed, consent_version)
  on public.delegates to anon, authenticated;
grant insert (name, email, subject, message, consent_version)
  on public.inquiries to anon, authenticated;

grant select, update, delete on public.delegates, public.inquiries to authenticated;


-- ---------------------------------------------------------------------
-- 8. File storage: bucket "site-files" (PDFs + images, 15 MB each)
--    Files are public to download by link; only admins can upload,
--    replace, list or delete. SVG is deliberately NOT allowed.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-files', 'site-files', true, 15728640,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site-files admin read" on storage.objects;
create policy "site-files admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'site-files' and public.is_admin());

drop policy if exists "site-files admin insert" on storage.objects;
create policy "site-files admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-files' and public.is_admin());

drop policy if exists "site-files admin update" on storage.objects;
create policy "site-files admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-files' and public.is_admin())
  with check (bucket_id = 'site-files' and public.is_admin());

drop policy if exists "site-files admin delete" on storage.objects;
create policy "site-files admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-files' and public.is_admin());
