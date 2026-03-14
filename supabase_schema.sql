-- ═══════════════════════════════════════════════════════════════
--  BETZONE — Supabase Schema
--  Rulează acest SQL în Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  balance     numeric(12, 2) not null default 1000.00,
  created_at  timestamptz default now()
);

-- Bets history table
create table if not exists public.bets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game_type   text not null check (game_type in ('sports','blackjack','slots','roulette','plinko')),
  bet_amount  numeric(10, 2) not null,
  win_amount  numeric(10, 2) not null default 0,
  details     jsonb default '{}',
  created_at  timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.bets enable row level security;

-- Policies: users can only see/edit their own data
create policy "Users see own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users see own bets"
  on public.bets for select using (auth.uid() = user_id);

create policy "Users insert own bets"
  on public.bets for insert with check (auth.uid() = user_id);

-- Indexes
create index if not exists bets_user_id_idx on public.bets(user_id);
create index if not exists bets_created_at_idx on public.bets(created_at desc);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    1000.00
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
