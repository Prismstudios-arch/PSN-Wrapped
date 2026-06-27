-- PSN Wrapped — migration 0002: AI recap commentary cache.
-- Run this in the Supabase SQL Editor (one-time) on top of schema.sql.
-- Caches the generated persona + AI commentary per user so we call the LLM at
-- most once per recap snapshot.

create table if not exists public.recap_ai (
  user_id            uuid primary key references public.users(id) on delete cascade,
  stats_generated_at timestamptz not null,
  persona_title      text,
  persona_blurb      text,
  commentary         text not null,
  model              text,
  created_at         timestamptz not null default now()
);

alter table public.recap_ai enable row level security;

drop policy if exists recap_ai_select_self on public.recap_ai;
create policy recap_ai_select_self on public.recap_ai
  for select using (user_id = auth.uid());
