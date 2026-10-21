-- Reusable EB signup links and unique EB phone numbers.
alter table public.wm_qr_passes
  add column if not exists phone text,
  add column if not exists gender text;

create unique index if not exists wm_qr_passes_phone_digits_unique
  on public.wm_qr_passes ((regexp_replace(phone, '[^0-9]', '', 'g')))
  where phone is not null and regexp_replace(phone, '[^0-9]', '', 'g') <> '';

create table if not exists public.wm_eb_signup_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.wm_eb_signup_links enable row level security;
revoke all on public.wm_eb_signup_links from anon, authenticated;
grant all on public.wm_eb_signup_links to service_role;

comment on table public.wm_eb_signup_links is
  'Reusable EB signup links. Token hashes only; service role validates and manages links.';
comment on column public.wm_qr_passes.phone is
  'EB phone number; unique by digits-only normalized form.';
comment on column public.wm_qr_passes.gender is
  'Self-selected gender for EB profile.';
