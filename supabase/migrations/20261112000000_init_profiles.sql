-- Phase 0: users & profiles foundation.
-- Football world, trivia and career tables arrive in Phase 1 migrations.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  username          text not null unique
                      check (username ~ '^[A-Za-z0-9_֐-׿؀-ۿ]{3,20}$'),
  display_name      text check (char_length(display_name) <= 40),
  avatar_url        text,
  preferred_locale  text not null default 'he' check (preferred_locale in ('he', 'en', 'ar')),
  favourite_club_id uuid,          -- FK to clubs added in Phase 1
  role              text not null default 'user' check (role in ('user', 'editor', 'admin')),
  xp                integer not null default 0 check (xp >= 0),
  level             integer not null default 1 check (level >= 1),
  daily_streak      integer not null default 0 check (daily_streak >= 0),
  last_daily_date   date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.profiles is 'Public profile for each auth user. Created automatically on sign-up.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row whenever a new auth user signs up.
-- Username: from sign-up metadata if valid, else "player_" + 8 random chars.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted   text := new.raw_user_meta_data ->> 'username';
  locale   text := coalesce(new.raw_user_meta_data ->> 'locale', 'he');
  uname    text;
begin
  if wanted is not null
     and wanted ~ '^[A-Za-z0-9_֐-׿؀-ۿ]{3,20}$'
     and not exists (select 1 from public.profiles where username = wanted) then
    uname := wanted;
  else
    uname := 'player_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  if locale not in ('he', 'en', 'ar') then
    locale := 'he';
  end if;

  insert into public.profiles (id, username, display_name, avatar_url, preferred_locale)
  values (
    new.id,
    uname,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 40),
    new.raw_user_meta_data ->> 'avatar_url',
    locale
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Profiles are public (needed for leaderboards).
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users may update their own profile...
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Admins may update any profile (e.g. assign editor role).
create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ...but only these columns. role / xp / level / streaks are changed by
-- security-definer functions (game logic) or by admins via the dashboard.
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, preferred_locale, favourite_club_id)
  on public.profiles to authenticated;

-- No insert/delete policies: rows are created by the trigger and removed by
-- the auth.users cascade.
