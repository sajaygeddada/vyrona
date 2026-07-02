-- ============================================================================
-- VYRONA — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor (or via `supabase db push`).
-- Sets up tables + Row Level Security so each user only ever sees their own
-- data, even though the anon key is public.
-- ============================================================================

-- Make sure UUID generation is available
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: one row per user, holds display name + XP/level
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default 'Adventurer',
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- habits
-- ----------------------------------------------------------------------------
create table if not exists public.habits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text default 'morning',
  type text default 'checkbox',
  target numeric default 1,
  unit text default '',
  difficulty text default 'easy',
  xp_reward integer default 10,
  penalty integer default 5,
  frequency text default 'daily',
  reminder text,
  archived boolean default false,
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;

create policy "Habits are managed by owner" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- habit_logs: one row per habit per day
-- ----------------------------------------------------------------------------
create table if not exists public.habit_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null references public.habits(id) on delete cascade,
  date date not null,
  value numeric not null default 0,
  xp_awarded boolean not null default false,
  unique (habit_id, date)
);

alter table public.habit_logs enable row level security;

create policy "Habit logs are managed by owner" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- goals (milestones stored as jsonb array: [{id,title,done}])
-- ----------------------------------------------------------------------------
create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text default 'career',
  priority text default 'medium',
  difficulty integer default 3,
  xp_reward integer default 3000,
  due_date date,
  progress integer default 0,
  notes text default '',
  milestones jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Goals are managed by owner" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- journal_entries: one row per day
-- ----------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  gratitude text default '',
  win text default '',
  fail text default '',
  learned text default '',
  felt text default '',
  tomorrow text default '',
  mood text,
  unique (user_id, date)
);

alter table public.journal_entries enable row level security;

create policy "Journal entries are managed by owner" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Helpful indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_habits_user on public.habits(user_id);
create index if not exists idx_habit_logs_user on public.habit_logs(user_id);
create index if not exists idx_habit_logs_habit on public.habit_logs(habit_id);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_journal_user on public.journal_entries(user_id);
