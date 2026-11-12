-- BATCOMPUTER cloud mirror. Run this once in the Supabase SQL editor of YOUR
-- OWN project. Safe to run again: every statement is idempotent.
--
-- There is no sign-in. The app talks to these tables only from the server,
-- with the service role key. Row level security is on and there are no
-- policies, so the public anon key can read and write nothing.

create table if not exists public.profiles (
  user_id uuid primary key,
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  user_id uuid not null,
  log_date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

-- Read-only shared dossiers. Snapshots only, never a view onto daily_logs.
create table if not exists public.shared_dossiers (
  token text primary key,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.shared_dossiers enable row level security;

-- Upgrading from an older copy of this schema: drop what sign-in needed.
alter table public.profiles drop constraint if exists profiles_user_id_fkey;
alter table public.daily_logs drop constraint if exists daily_logs_user_id_fkey;
drop policy if exists "Users manage their profile" on public.profiles;
drop policy if exists "Users manage their daily logs" on public.daily_logs;
drop policy if exists "Shared dossiers are publicly readable" on public.shared_dossiers;
