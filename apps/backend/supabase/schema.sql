-- ============================================================================
-- Endcard — Supabase schema + Row Level Security
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor (or `supabase db push`) on a fresh project.
--
-- Auth model: the Endcard backend mints its own HS256 JWTs signed with the
-- project's JWT secret. `sub` = public.users.id, role = 'authenticated'. So
-- `auth.uid()` inside RLS equals the Endcard user id. We do NOT use Supabase
-- Auth's email/password — the backend is the identity provider.
--
-- Secret-handling model:
--   * The app NEVER reads `platform_connections` (RLS denies it). Only the
--     service-role backend touches encrypted tokens.
--   * The app MAY read its own `cached_stats`, `users`, `pro_status`, `friends`.
-- ============================================================================

create extension if not exists pgcrypto;

-- updated_at helper -----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── users ───────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ── platform_connections ────────────────────────────────────────────────────
-- Holds derived, ENCRYPTED tokens only. The raw platform credential (PSN NPSSO)
-- is never stored. One connection per (user, platform).
create table if not exists public.platform_connections (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.users(id) on delete cascade,
  platform                  text not null check (platform in ('psn','xbox','steam','nintendo')),
  platform_user_id          text not null,
  platform_username         text,
  access_token_enc          text not null,   -- AES-256-GCM sealed blob (base64)
  refresh_token_enc         text,            -- AES-256-GCM sealed blob (base64)
  access_token_expires_at   timestamptz,
  refresh_token_expires_at  timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (user_id, platform),
  unique (platform, platform_user_id)
);

create index if not exists idx_platform_connections_user on public.platform_connections(user_id);

drop trigger if exists trg_platform_connections_updated_at on public.platform_connections;
create trigger trg_platform_connections_updated_at
  before update on public.platform_connections
  for each row execute function public.set_updated_at();

-- ── cached_stats ─────────────────────────────────────────────────────────────
-- The normalized, recap-ready snapshot (DerivedStats). One row per user; the
-- jsonb is platform-neutral so a unified multi-platform recap fits here later.
create table if not exists public.cached_stats (
  user_id        uuid primary key references public.users(id) on delete cascade,
  schema_version int not null default 1,
  stats          jsonb not null,
  generated_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_cached_stats_updated_at on public.cached_stats;
create trigger trg_cached_stats_updated_at
  before update on public.cached_stats
  for each row execute function public.set_updated_at();

-- ── pro_status ───────────────────────────────────────────────────────────────
create table if not exists public.pro_status (
  user_id    uuid primary key references public.users(id) on delete cascade,
  tier       text not null default 'free' check (tier in ('free','pro')),
  source     text,                 -- 'revenuecat' | 'gift' | 'promo' | ...
  since      timestamptz not null default now(),
  expires_at timestamptz,          -- null = lifetime/none
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_pro_status_updated_at on public.pro_status;
create trigger trg_pro_status_updated_at
  before update on public.pro_status
  for each row execute function public.set_updated_at();

-- ── friends (Phase 5; schema now so connectors/UI don't need migrations) ─────
create table if not exists public.friends (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  friend_user_id uuid not null references public.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at     timestamptz not null default now(),
  unique (user_id, friend_user_id),
  check (user_id <> friend_user_id)
);

create index if not exists idx_friends_user on public.friends(user_id);
create index if not exists idx_friends_friend on public.friends(friend_user_id);

-- ── recap_ai (cached AI commentary + persona; generated at most once per recap) ─
create table if not exists public.recap_ai (
  user_id            uuid primary key references public.users(id) on delete cascade,
  stats_generated_at timestamptz not null,
  persona_title      text,
  persona_blurb      text,
  commentary         text not null,
  model              text,
  created_at         timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.users               enable row level security;
alter table public.platform_connections enable row level security;
alter table public.cached_stats         enable row level security;
alter table public.pro_status           enable row level security;
alter table public.friends              enable row level security;
alter table public.recap_ai             enable row level security;

-- users: a user can read/update only their own row. Inserts happen via the
-- service-role backend (RLS-bypassing), so no insert policy for `authenticated`.
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- platform_connections: NO policies for `authenticated`. With RLS enabled and
-- no policy, the app role cannot read encrypted tokens at all. Only the
-- service-role backend (which bypasses RLS) accesses this table.

-- cached_stats: the app reads its own snapshot (offline-first dashboard).
-- Writes are backend-only (service role).
drop policy if exists cached_stats_select_self on public.cached_stats;
create policy cached_stats_select_self on public.cached_stats
  for select using (user_id = auth.uid());

-- pro_status: the app reads its own entitlement.
drop policy if exists pro_status_select_self on public.pro_status;
create policy pro_status_select_self on public.pro_status
  for select using (user_id = auth.uid());

-- friends: the app reads rows it is part of (either side of the relationship).
drop policy if exists friends_select_self on public.friends;
create policy friends_select_self on public.friends
  for select using (user_id = auth.uid() or friend_user_id = auth.uid());

-- recap_ai: the app reads its own cached commentary.
drop policy if exists recap_ai_select_self on public.recap_ai;
create policy recap_ai_select_self on public.recap_ai
  for select using (user_id = auth.uid());
