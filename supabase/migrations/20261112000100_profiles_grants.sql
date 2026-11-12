-- New Supabase projects no longer auto-grant table privileges to the API roles,
-- so grant them explicitly. RLS policies still decide which rows are visible/editable.

grant usage on schema public to anon, authenticated;

-- Profiles are public (leaderboards); updates are limited to specific columns
-- by the column grant in the previous migration plus RLS.
grant select on public.profiles to anon, authenticated;

-- Used inside RLS policies, so the calling role must be able to execute it.
grant execute on function public.is_admin() to anon, authenticated;
