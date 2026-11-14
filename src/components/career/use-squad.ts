"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { isLowerClub } from "@/lib/engine/lower-leagues";
import { hash, personName } from "@/lib/engine/people";
import { Rng } from "@/lib/engine/rng";
import type { Position, WorldClub } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface SquadPlayer {
  id: string;
  name: string;
  position: Position;
  number: number | null;
  rating: number;
  age: number | null;
  nationality: string | null;
  you?: boolean;
}

const SHAPE: Position[] = ["GK", "GK", "CB", "CB", "CB", "LB", "RB", "DM", "CM", "CM", "CM", "AM", "LW", "RW", "ST", "ST", "CB", "RB", "CM", "LW", "ST", "GK"];

/** A made-up squad for clubs with no database squad (the amateur divisions). Same club, same players. */
export function generatedSquad(club: WorldClub, israeli: boolean): SquadPlayer[] {
  const rng = new Rng(hash(`squad:${club.id}`));
  return SHAPE.map((position, i) => ({
    id: `${club.id}-g${i}`,
    name: personName(hash(`${club.id}:p${i}`), israeli),
    position,
    number: i < 11 ? [1, 4, 5, 3, 2, 6, 8, 10, 7, 11, 9][i] : 12 + i,
    rating: Math.round(club.teamRating + (i < 11 ? 1 : -4) + rng.normal() * 2.5),
    age: rng.int(18, 34),
    nationality: israeli ? "Israel" : null,
  })).sort((a, b) => b.rating - a.rating);
}

const cache = new Map<string, SquadPlayer[]>();

/** The club's real squad (from the database), or a generated one (amateur clubs; `made` = a youth side). */
export function useSquad(club: WorldClub, locale: Locale, israeli: boolean, made = false) {
  const clubId = club.id;
  const lower = made || isLowerClub(clubId);
  const [players, setPlayers] = useState<SquadPlayer[] | null>(() => (lower ? generatedSquad(club, israeli) : (cache.get(clubId) ?? null)));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (lower || cache.has(clubId) || !isSupabaseConfigured) return;
    let live = true;
    createClient()
      .from("players")
      .select("id, name, position, shirt_number, rating_world, age, nationality")
      .eq("club_id", clubId)
      .order("rating_world", { ascending: false })
      .then(({ data, error }) => {
        if (!live) return;
        if (error || !data) return setFailed(true);
        const list = data.map((p) => ({ id: p.id, name: (p.name as { en: string; he?: string })[locale === "he" ? "he" : "en"] ?? (p.name as { en: string }).en, position: p.position as Position, number: p.shirt_number, rating: p.rating_world, age: p.age, nationality: p.nationality }));
        cache.set(clubId, list);
        setPlayers(list);
      });
    return () => {
      live = false;
    };
  }, [clubId, locale, lower]);

  return { players: lower ? generatedSquad(club, israeli) : (players ?? cache.get(clubId) ?? null), failed };
}

/**
 * Many clubs' squads at once (one database query for the ones not loaded yet).
 * `made` = youth sides, always generated.
 */
export function useSquads(clubs: WorldClub[], locale: Locale, israeli: boolean, made = false) {
  const key = clubs.map((c) => c.id).join(",");
  const [, setTick] = useState(0);
  useEffect(() => {
    const missing = clubs.filter((c) => !made && !isLowerClub(c.id) && !cache.has(c.id)).map((c) => c.id);
    if (!missing.length || !isSupabaseConfigured) return;
    let live = true;
    createClient()
      .from("players")
      .select("id, name, position, shirt_number, rating_world, age, nationality, club_id")
      .in("club_id", missing)
      .order("rating_world", { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return;
        const by = new Map<string, SquadPlayer[]>(missing.map((id) => [id, []]));
        for (const p of data) {
          const name = p.name as { en: string; he?: string };
          by.get(p.club_id as string)?.push({ id: p.id, name: (locale === "he" ? name.he : undefined) ?? name.en, position: p.position as Position, number: p.shirt_number, rating: p.rating_world, age: p.age, nationality: p.nationality });
        }
        for (const [id, list] of by) if (list.length) cache.set(id, list);
        if (live) setTick((n) => n + 1);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, locale, made]);
  const out: Record<string, SquadPlayer[]> = {};
  for (const c of clubs) {
    if (made) out[c.id] = generatedSquad({ ...c, id: `${c.id}-youth`, teamRating: c.teamRating - 12 }, israeli);
    else if (isLowerClub(c.id)) out[c.id] = generatedSquad(c, israeli);
    else if (cache.has(c.id)) out[c.id] = cache.get(c.id)!;
  }
  return out;
}
