-- WEST MUN QR passes, venue scan audit, and private EB signup invitations.
-- Run once against the existing WEST MUN Supabase project.
create table if not exists public.wm_qr_passes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  qr_token text not null unique,
  full_name text not null check (char_length(btrim(full_name)) >= 5 and char_length(full_name) <= 120),
  email text not null,
  account_role text not null,
  team text,
  section text,
  active boolean not null default true,
  inside boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_scanned_at timestamptz
);

create table if not exists public.wm_qr_scan_logs (
  id uuid primary key default gen_random_uuid(),
  scanner_user_id uuid not null references auth.users(id),
  pass_user_id uuid references auth.users(id) on delete set null,
  pass_full_name text,
  team text,
  section text,
  direction text not null check (direction in ('entry','exit')),
  outcome text not null check (outcome in ('allowed','denied')),
  reason text,
  scanned_at timestamptz not null default now()
);

create table if not exists public.wm_eb_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  department text not null check (char_length(btrim(department)) between 1 and 80),
  section text not null check (char_length(btrim(section)) between 1 and 100),
  eb_role text not null check (char_length(btrim(eb_role)) between 1 and 60),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claim_id uuid,
  redeemed_at timestamptz,
  revoked_at timestamptz
);

alter table public.wm_qr_passes enable row level security;
alter table public.wm_qr_scan_logs enable row level security;
alter table public.wm_eb_invites enable row level security;

-- All reads/writes go through trusted Edge Functions using the service role.
-- Never expose QR tokens, invite hashes, or scan logs directly to browser clients.
revoke all on public.wm_qr_passes from anon, authenticated;
revoke all on public.wm_qr_scan_logs from anon, authenticated;
revoke all on public.wm_eb_invites from anon, authenticated;
grant all on public.wm_qr_passes to service_role;
grant all on public.wm_qr_scan_logs to service_role;
grant all on public.wm_eb_invites to service_role;
