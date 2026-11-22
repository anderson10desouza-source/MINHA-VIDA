-- Execute este script no SQL Editor do seu projeto Supabase
-- Ele cria as tabelas de perfil e sincronização de dados do app com segurança RLS.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  phone text not null default '',
  birthdate text not null default '',
  city text not null default '',
  avatar_url text not null default '',
  member_since text not null default '',
  daily_devotional_reminder boolean not null default true,
  agenda_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_app_states enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "user_app_states_select_own" on public.user_app_states;
create policy "user_app_states_select_own"
  on public.user_app_states for select
  using (auth.uid() = user_id);

drop policy if exists "user_app_states_insert_own" on public.user_app_states;
create policy "user_app_states_insert_own"
  on public.user_app_states for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_app_states_update_own" on public.user_app_states;
create policy "user_app_states_update_own"
  on public.user_app_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
