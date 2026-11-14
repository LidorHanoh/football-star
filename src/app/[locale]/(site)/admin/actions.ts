"use server";

import { updateTag } from "next/cache";
import type { Position } from "@/lib/engine/types";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const POSITIONS: Position[] = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];
const rating = (n: unknown) => (Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 99 ? (n as number) : null);

async function adminClient() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return null;
  return createClient();
}

/** Change a player's rating / potential / position. The database checks admin rights again and logs the change. */
export async function updatePlayer(input: { id: string; rating: number; potential: number | null; position: string; note?: string }): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, error: "not allowed" };
  const r = rating(input.rating);
  const p = input.potential === null ? null : rating(input.potential);
  if (!r || (input.potential !== null && !p) || !POSITIONS.includes(input.position as Position)) return { ok: false, error: "invalid values" };
  const { error } = await supabase.rpc("admin_update_player", {
    p_player: input.id,
    p_rating: r,
    p_potential: p as number,
    p_position: input.position,
    p_note: input.note?.slice(0, 200) || undefined,
  });
  if (error) return { ok: false, error: error.message };
  updateTag("world");
  return { ok: true };
}

export async function revertChange(id: number): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, error: "not allowed" };
  const { error } = await supabase.rpc("admin_revert_change", { p_change: id });
  if (error) return { ok: false, error: error.message };
  updateTag("world");
  return { ok: true };
}
