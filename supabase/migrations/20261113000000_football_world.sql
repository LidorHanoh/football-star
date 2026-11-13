-- Phase 1: the football world (real leagues, clubs and players). Read-only for
-- users; written only by the local import scripts (service role).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.countries (
  code        text primary key,                -- country name as used by the data source, e.g. 'England', 'Israel'
  name        jsonb not null,                  -- {"en": "...", "he": "..."}
  flag_code   text                             -- ISO code for generated flags, e.g. 'GB-ENG', 'IL'
);

create table public.data_snapshots (
  id           uuid primary key default gen_random_uuid(),
  season       text not null,                  -- e.g. '2026/27'
  source       text not null,                  -- e.g. 'api-football squads + researched league lists'
  imported_at  timestamptz not null default now(),
  is_current   boolean not null default false
);
create unique index data_snapshots_one_current on public.data_snapshots (is_current) where is_current;

create table public.leagues (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,           -- stable short key, e.g. 'isr', 'eng1'
  external_id  text unique,                    -- Transfermarkt competition code, e.g. 'ISR1'
  country_code text not null references public.countries (code),
  name         jsonb not null,
  tier         smallint not null default 1,
  num_teams    smallint not null,
  strength     smallint not null check (strength between 1 and 100),
  is_playable  boolean not null default true
);

create table public.clubs (
  id                uuid primary key default gen_random_uuid(),
  external_id       integer not null unique,   -- Transfermarkt club id
  api_football_id   integer,
  league_id         uuid not null references public.leagues (id),
  name              jsonb not null,
  short_name        jsonb,
  primary_color     text,
  secondary_color   text,
  reputation        smallint not null default 50 check (reputation between 1 and 100),
  team_rating       smallint not null default 60 check (team_rating between 1 and 99),  -- avg world rating of the best XI (match sim)
  budget            bigint,
  founded           smallint,
  city              text,
  stadium_name      jsonb,
  stadium_capacity  integer
);
create index clubs_league_id_idx on public.clubs (league_id);

create table public.players (
  id              uuid primary key default gen_random_uuid(),
  external_id     integer not null unique,     -- Transfermarkt player id
  club_id         uuid references public.clubs (id) on delete set null,
  name            jsonb not null,              -- {"en": "...", "he": "..."}; he only for Israeli league + stars
  nationality     text references public.countries (code),
  second_nationality text references public.countries (code),
  birth_date      date,
  age             smallint,                    -- from the squad list when birth_date is unknown
  position        text not null check (position in ('GK','CB','LB','RB','DM','CM','AM','LW','RW','ST')),
  shirt_number    smallint,
  height_cm       smallint,
  foot            text check (foot in ('right', 'left', 'both')),
  contract_until  date,
  rating_world    smallint not null default 50 check (rating_world between 1 and 99),
  attributes      jsonb,                       -- {"pace","shooting","passing","dribbling","defending","physical","goalkeeping"}
  potential       smallint check (potential between 1 and 99),
  value           bigint,                      -- in-game value derived from OUR rating (never a copied market value)
  wage            integer,
  rating_source   text not null default 'formula' check (rating_source in ('researched', 'formula')),
  ratings_locked  boolean not null default false,  -- the sync never overwrites locked ratings
  updated_at      timestamptz not null default now()
);
create index players_club_id_idx on public.players (club_id);
create index players_nationality_idx on public.players (nationality);

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- League rating is derived: the player's percentile inside their own league, scaled to 1..99.
create view public.player_ratings
with (security_invoker = true) as
  select
    p.*,
    c.league_id,
    (1 + round(98 * percent_rank() over (partition by c.league_id order by p.rating_world)))::smallint as rating_league
  from public.players p
  join public.clubs c on c.id = p.club_id;

-- ---------------------------------------------------------------------------
-- Access: everyone can read, nobody but the service role can write.
-- ---------------------------------------------------------------------------
alter table public.countries      enable row level security;
alter table public.data_snapshots enable row level security;
alter table public.leagues        enable row level security;
alter table public.clubs          enable row level security;
alter table public.players        enable row level security;

create policy "World data is public" on public.countries      for select using (true);
create policy "World data is public" on public.data_snapshots for select using (true);
create policy "World data is public" on public.leagues        for select using (true);
create policy "World data is public" on public.clubs          for select using (true);
create policy "World data is public" on public.players        for select using (true);

grant select on public.countries, public.data_snapshots, public.leagues, public.clubs, public.players, public.player_ratings
  to anon, authenticated;
grant all on public.countries, public.data_snapshots, public.leagues, public.clubs, public.players, public.player_ratings
  to service_role;

-- profiles.favourite_club_id was waiting for this table.
alter table public.profiles
  add constraint profiles_favourite_club_id_fkey
  foreign key (favourite_club_id) references public.clubs (id) on delete set null;
