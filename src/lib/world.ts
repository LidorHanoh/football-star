import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { World } from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * The football world a career needs: 20 leagues and their clubs (~370 rows).
 * Public, read-only data, so it is cached for a day and shared by everyone.
 */
export async function getCareerWorld(): Promise<World> {
  "use cache";
  cacheLife("days");
  cacheTag("world"); // admin rating edits refresh it
  if (!isSupabaseConfigured) return { leagues: [], clubs: [] };

  const supabase = createSupabase<Database>(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const [{ data: leagues, error: e1 }, { data: clubs, error: e2 }] = await Promise.all([
    supabase.from("leagues").select("id, key, name, country_code, strength, tier").eq("is_playable", true),
    supabase.from("clubs").select("id, external_id, league_id, name, reputation, team_rating"),
  ]);
  if (e1 || e2) throw new Error(`Failed to load world: ${(e1 ?? e2)!.message}`);

  const keyById = new Map(leagues!.map((l) => [l.id, l.key]));
  return {
    leagues: leagues!
      .map((l) => ({ key: l.key, name: l.name as World["leagues"][number]["name"], country: l.country_code, strength: l.strength, tier: l.tier }))
      .sort((a, b) => b.strength - a.strength),
    clubs: clubs!.map((c) => ({
      id: c.id,
      leagueKey: keyById.get(c.league_id)!,
      name: c.name as World["clubs"][number]["name"],
      reputation: c.reputation,
      teamRating: c.team_rating,
      tmId: c.external_id,
    })),
  };
}
