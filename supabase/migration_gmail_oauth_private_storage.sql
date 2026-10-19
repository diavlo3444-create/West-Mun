-- WEST MUN Gmail OAuth credential storage.
-- Refresh tokens are encrypted by the Edge Function before storage.
-- No browser role receives table privileges; only the server-side service_role
-- can read/write these tables. Keep the RLS policies empty by design.

create table if not exists public.gmail_oauth_states (
  nonce_hash text primary key check (char_length(nonce_hash) = 64),
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gmail_oauth_states_expires_at_idx
  on public.gmail_oauth_states (expires_at);

create table if not exists public.gmail_oauth_credentials (
  singleton boolean primary key default true check (singleton),
  encrypted_refresh_token text not null,
  connected_by uuid not null references auth.users(id),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_oauth_states enable row level security;
alter table public.gmail_oauth_credentials enable row level security;

revoke all on table public.gmail_oauth_states from public, anon, authenticated;
revoke all on table public.gmail_oauth_credentials from public, anon, authenticated;

grant all on table public.gmail_oauth_states to service_role;
grant all on table public.gmail_oauth_credentials to service_role;
