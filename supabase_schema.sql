-- ═══════════════════════════════════════════════════════════════
--  BETZONE — Supabase Schema v2
--  Rulează acest SQL în Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- Profiles table
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  balance     numeric(12, 2) not null default 1000.00,
  created_at  timestamptz default now()
);

-- Casino bets history
create table if not exists public.bets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game_type   text not null check (game_type in ('sports','blackjack','slots','roulette','plinko')),
  bet_amount  numeric(10, 2) not null,
  win_amount  numeric(10, 2) not null default 0,
  details     jsonb default '{}',
  created_at  timestamptz default now()
);

-- Sport bets (pariuri sportive cu verificare rezultate)
create table if not exists public.sport_bets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  sport_key       text not null,
  match_id        text not null,
  home_team       text not null,
  away_team       text not null,
  commence_time   timestamptz not null,
  selections      jsonb not null,   -- [{pick, pickLabel, odd, matchId, matchLabel}]
  total_odds      numeric(10, 4) not null,
  stake           numeric(10, 2) not null,
  potential_win   numeric(10, 2) not null,
  actual_win      numeric(10, 2) not null default 0,
  status          text not null default 'pending'
                  check (status in ('pending', 'won', 'lost', 'void')),
  result_home     text,   -- scorul/castigatorul dupa verificare
  result_away     text,
  settled_at      timestamptz,
  created_at      timestamptz default now()
);

-- Row Level Security
alter table public.profiles   enable row level security;
alter table public.bets        enable row level security;
alter table public.sport_bets  enable row level security;

-- Policies profiles
create policy "Users see own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Policies bets
create policy "Users see own bets"
  on public.bets for select using (auth.uid() = user_id);
create policy "Users insert own bets"
  on public.bets for insert with check (auth.uid() = user_id);

-- Policies sport_bets
create policy "Users see own sport_bets"
  on public.sport_bets for select using (auth.uid() = user_id);
create policy "Users insert own sport_bets"
  on public.sport_bets for insert with check (auth.uid() = user_id);
create policy "Users update own sport_bets"
  on public.sport_bets for update using (auth.uid() = user_id);

-- Indexes
create index if not exists bets_user_id_idx        on public.bets(user_id);
create index if not exists sport_bets_user_id_idx  on public.sport_bets(user_id);
create index if not exists sport_bets_status_idx   on public.sport_bets(status);
create index if not exists sport_bets_match_id_idx on public.sport_bets(match_id);
create index if not exists sport_bets_created_idx  on public.sport_bets(created_at desc);

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

-- ═══════════════════════════════════════════════════════════════
--  BONUSURI — Rulează în SQL Editor după schema principală
-- ═══════════════════════════════════════════════════════════════

-- Tabel bonusuri disponibile (global, admin-defined)
create table if not exists public.bonus_definitions (
  id          text primary key,
  title       text not null,
  description text not null,
  amount      numeric(10,2) not null,
  trigger_type text not null,  -- 'first_login','first_bet','first_casino_win','streak_3','bet_100','daily_login'
  trigger_value numeric default 1,
  expires_days  int default 30,
  active      boolean default true
);

-- Inserează bonusurile predefinite
insert into public.bonus_definitions (id, title, description, amount, trigger_type, trigger_value) values
  ('welcome',      'Bun venit!',         'Bonus la prima autentificare',                  50.00,  'first_login',       1),
  ('first_bet',    'Primul pariu',        'Plasează primul tău pariu sportiv',             100.00, 'first_bet',         1),
  ('first_win',    'Prima victorie',      'Câștigă primul pariu sportiv',                  75.00,  'first_casino_win',  1),
  ('streak_3',     'Serie de 3 pariuri',  'Plasează 3 pariuri în total',                   150.00, 'streak_3',          3),
  ('high_roller',  'High Roller',         'Pariază minimum 100 MDL într-un singur pariu',  200.00, 'bet_100',           100),
  ('daily_login',  'Login zilnic',        'Autentifică-te în 3 zile consecutive',          25.00,  'daily_login',       3)
on conflict (id) do nothing;

-- Bonusuri activate per user
create table if not exists public.user_bonuses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  bonus_id        text not null references public.bonus_definitions(id),
  status          text not null default 'available'
                  check (status in ('available','claimed','expired')),
  progress        numeric default 0,
  target          numeric not null,
  amount          numeric(10,2) not null,
  claimed_at      timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz default now(),
  unique(user_id, bonus_id)
);

-- Tabel pentru tracking activitate zilnică
create table if not exists public.user_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- RLS
alter table public.bonus_definitions enable row level security;
alter table public.user_bonuses      enable row level security;
alter table public.user_activity     enable row level security;

create policy "Anyone reads bonus_definitions"
  on public.bonus_definitions for select using (true);

create policy "Users see own bonuses"
  on public.user_bonuses for select using (auth.uid() = user_id);
create policy "Users insert own bonuses"
  on public.user_bonuses for insert with check (auth.uid() = user_id);
create policy "Users update own bonuses"
  on public.user_bonuses for update using (auth.uid() = user_id);

create policy "Users insert own activity"
  on public.user_activity for insert with check (auth.uid() = user_id);
create policy "Users see own activity"
  on public.user_activity for select using (auth.uid() = user_id);

-- Indexes
create index if not exists user_bonuses_user_idx    on public.user_bonuses(user_id);
create index if not exists user_bonuses_status_idx  on public.user_bonuses(status);
create index if not exists user_activity_user_idx   on public.user_activity(user_id);
create index if not exists user_activity_type_idx   on public.user_activity(action_type);