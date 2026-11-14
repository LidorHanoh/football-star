-- Admin panel: the site owner edits player ratings by hand. Edited players are
-- locked (the Transfermarkt import never overwrites them) and every change is
-- logged so it can be reviewed and reverted.

-- ---------------------------------------------------------------------------
-- The owner's account is an admin (now, and if it signs up again later).
-- ---------------------------------------------------------------------------
create or replace function public.grant_owner_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users u where u.id = new.id and lower(u.email) = 'lidorhanoh123@gmail.com') then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

create trigger profiles_grant_owner_admin
  before insert on public.profiles
  for each row execute function public.grant_owner_admin();

update public.profiles p set role = 'admin'
from auth.users u
where u.id = p.id and lower(u.email) = 'lidorhanoh123@gmail.com';

-- ---------------------------------------------------------------------------
-- Change log
-- ---------------------------------------------------------------------------
create table public.rating_changes (
  id             bigint generated always as identity primary key,
  player_id      uuid not null references public.players (id) on delete cascade,
  changed_by     uuid references auth.users (id) on delete set null,
  old_rating     smallint not null,
  new_rating     smallint not null,
  old_potential  smallint,
  new_potential  smallint,
  old_position   text not null,
  new_position   text not null,
  was_locked     boolean not null,
  note           text check (char_length(note) <= 200),
  reverted_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index rating_changes_player_idx on public.rating_changes (player_id);
create index rating_changes_created_idx on public.rating_changes (created_at desc);

alter table public.rating_changes enable row level security;
create policy "Admins read the change log" on public.rating_changes for select to authenticated using ((select public.is_admin()));
grant select on public.rating_changes to authenticated;
grant all on public.rating_changes to service_role;

-- ---------------------------------------------------------------------------
-- Club strength = average of its best 11 player ratings (used by the career).
-- ---------------------------------------------------------------------------
create or replace function public.recompute_team_ratings(p_club uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.clubs c set team_rating = greatest(1, least(99, s.r))
  from (
    select club_id, round(avg(rating_world))::smallint as r
    from (
      select club_id, rating_world, row_number() over (partition by club_id order by rating_world desc) as rn
      from public.players
      where club_id is not null and (p_club is null or club_id = p_club)
    ) x
    where rn <= 11
    group by club_id
  ) s
  where s.club_id = c.id;
$$;
revoke execute on function public.recompute_team_ratings(uuid) from public, anon, authenticated;

-- Shift every attribute by the same amount as the rating (keeps the profile).
create or replace function public.shift_attributes(attrs jsonb, delta int)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(key, case when value ~ '^-?[0-9]+(\.[0-9]+)?$' then to_jsonb(greatest(1, least(99, round(value::numeric) + delta))) else attrs -> key end), attrs)
  from jsonb_each_text(coalesce(attrs, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_player(
  p_player uuid,
  p_rating smallint,
  p_potential smallint,
  p_position text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old public.players;
  delta int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change ratings' using errcode = '42501';
  end if;
  if p_rating not between 1 and 99 or (p_potential is not null and p_potential not between 1 and 99) then
    raise exception 'Ratings must be between 1 and 99' using errcode = '22023';
  end if;

  select * into old from public.players where id = p_player for update;
  if not found then
    raise exception 'Player not found' using errcode = 'P0002';
  end if;
  if old.rating_world = p_rating and old.potential is not distinct from p_potential and old.position = p_position then
    return;
  end if;

  delta := p_rating - old.rating_world;
  update public.players set
    rating_world   = p_rating,
    potential      = greatest(coalesce(p_potential, old.potential, p_rating), p_rating),
    position       = p_position,
    attributes     = public.shift_attributes(old.attributes, delta),
    value          = greatest(25000, round(coalesce(old.value, 25000) * power(1.2, delta)))::bigint,
    wage           = greatest(100, round(coalesce(old.wage, 100) * power(1.2, delta)))::int,
    rating_source  = 'researched',
    ratings_locked = true
  where id = p_player;

  insert into public.rating_changes (player_id, changed_by, old_rating, new_rating, old_potential, new_potential, old_position, new_position, was_locked, note)
  values (p_player, (select auth.uid()), old.rating_world, p_rating, old.potential, greatest(coalesce(p_potential, old.potential, p_rating), p_rating), old.position, p_position, old.ratings_locked, nullif(trim(p_note), ''));

  if old.club_id is not null then
    perform public.recompute_team_ratings(old.club_id);
  end if;
end;
$$;

create or replace function public.admin_revert_change(p_change bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ch public.rating_changes;
  cur public.players;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change ratings' using errcode = '42501';
  end if;
  select * into ch from public.rating_changes where id = p_change and reverted_at is null for update;
  if not found then
    raise exception 'Change not found or already reverted' using errcode = 'P0002';
  end if;
  select * into cur from public.players where id = ch.player_id for update;

  update public.players set
    rating_world   = ch.old_rating,
    potential      = ch.old_potential,
    position       = ch.old_position,
    attributes     = public.shift_attributes(cur.attributes, ch.old_rating - cur.rating_world),
    value          = greatest(25000, round(coalesce(cur.value, 25000) * power(1.2, ch.old_rating - cur.rating_world)))::bigint,
    wage           = greatest(100, round(coalesce(cur.wage, 100) * power(1.2, ch.old_rating - cur.rating_world)))::int,
    -- Unlock again only when no other hand edit of this player is still active.
    ratings_locked = ch.was_locked or exists (select 1 from public.rating_changes o where o.player_id = ch.player_id and o.id <> ch.id and o.reverted_at is null)
  where id = ch.player_id;

  update public.rating_changes set reverted_at = now() where id = ch.id;

  if cur.club_id is not null then
    perform public.recompute_team_ratings(cur.club_id);
  end if;
end;
$$;

revoke execute on function public.admin_update_player(uuid, smallint, smallint, text, text) from public, anon;
revoke execute on function public.admin_revert_change(bigint) from public, anon;
grant execute on function public.admin_update_player(uuid, smallint, smallint, text, text) to authenticated;
grant execute on function public.admin_revert_change(bigint) to authenticated;
