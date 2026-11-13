"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import { roleFor } from "@/lib/engine/attrs";
import { teamStrength } from "@/lib/engine/career";
import { clubKit, clubManager } from "@/lib/engine/people";
import type { CareerSave, Position, World } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import { Face } from "./face";
import { type CareerDict, fill, FLAGS } from "./helpers";

interface SquadPlayer {
  id: string;
  name: string;
  position: Position;
  number: number | null;
  rating: number;
  age: number | null;
  nationality: string | null;
  you?: boolean;
}

/** 4-3-3 slots on a vertical pitch (x: 0 left → 100 right, y: 0 attack → 100 own goal) and who can play there. */
const SLOTS: { x: number; y: number; fits: Position[] }[] = [
  { x: 50, y: 90, fits: ["GK"] },
  { x: 14, y: 70, fits: ["LB"] },
  { x: 38, y: 74, fits: ["CB"] },
  { x: 62, y: 74, fits: ["CB"] },
  { x: 86, y: 70, fits: ["RB"] },
  { x: 50, y: 56, fits: ["DM", "CM"] },
  { x: 28, y: 46, fits: ["CM", "DM", "AM"] },
  { x: 72, y: 46, fits: ["CM", "AM", "DM"] },
  { x: 16, y: 22, fits: ["LW", "AM"] },
  { x: 50, y: 14, fits: ["ST"] },
  { x: 84, y: 22, fits: ["RW", "AM"] },
];

const squadCache = new Map<string, SquadPlayer[]>();

export function Squad({ save, world, t, locale }: { save: CareerSave; world: World; t: CareerDict; locale: Locale }) {
  const clubId = save.contract!.clubId;
  const club = world.clubs.find((c) => c.id === clubId)!;
  const league = world.leagues.find((l) => l.key === club.leagueKey);
  const kit = clubKit(club);
  const manager = clubManager(club, league?.country === "Israel");
  const [players, setPlayers] = useState<SquadPlayer[] | null>(squadCache.get(clubId) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (squadCache.has(clubId) || !isSupabaseConfigured) return;
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
        squadCache.set(clubId, list);
        setPlayers(list);
      });
    return () => {
      live = false;
    };
  }, [clubId, locale]);

  const youth = save.contract!.level === "youth";
  const me: SquadPlayer = { id: "you", name: save.player.name, position: save.player.position, number: save.player.kit, rating: save.player.rating, age: save.player.age, nationality: save.player.nationality, you: true };

  // Pick the XI: best available for each slot. Coach trust gives you a small edge.
  const { xi, bench, rest } = useMemo(() => {
    const pool = [...(players ?? []), ...(youth ? [] : [me])].map((p) => ({ ...p, score: p.rating + (p.you ? (save.bars.trust - 50) * 0.08 + (save.bars.form - 50) * 0.03 : 0) }));
    pool.sort((a, b) => b.score - a.score);
    const used = new Set<string>();
    const xi = SLOTS.map((slot) => {
      const pick = pool.find((p) => !used.has(p.id) && slot.fits.includes(p.position)) ?? pool.find((p) => !used.has(p.id) && p.position !== "GK");
      if (pick) used.add(pick.id);
      return pick ?? null;
    });
    const others = pool.filter((p) => !used.has(p.id));
    return { xi, bench: others.slice(0, 9), rest: others.slice(9) };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- me is rebuilt each render from save
  }, [players, youth, save]);

  const role = roleFor(save.player.rating, teamStrength(club, save.contract!.level), save.bars.trust);
  const inXI = xi.some((p) => p?.you);
  const onBench = bench.some((p) => p.you);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="grid content-start gap-4">
        {/* You + coach */}
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <Face seed={manager.face} kind="manager" kit={kit} className="size-16 rounded-xl" title={manager.name} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t.squad.coach}</p>
            <p className="truncate font-bold">{manager.name}</p>
          </div>
          <div className="text-end">
            <p className="text-xs text-muted-foreground">{t.squad.yourRole}</p>
            <p className="font-heading text-lg font-extrabold">{t.roles[role]}</p>
          </div>
        </div>
        <p className={cn("rounded-xl p-3 text-sm font-medium", youth ? "bg-muted" : inXI ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : onBench ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300")}>
          {youth ? t.squad.youthNote : inXI ? t.squad.inXI : onBench ? t.squad.onBench : t.squad.outOfSquad}
        </p>

        {/* Pitch with the starting XI */}
        <div dir="ltr" className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl border-4 border-emerald-950/30 bg-[repeating-linear-gradient(0deg,#166534_0_10%,#15803d_10%_20%)] shadow-inner">
          <div className="absolute inset-x-[6%] inset-y-[4%] rounded-sm border border-white/40" />
          <div className="absolute inset-x-[6%] top-1/2 h-px bg-white/40" />
          <div className="absolute top-1/2 left-1/2 size-[22%] -translate-1/2 rounded-full border border-white/40" />
          <div className="absolute bottom-[4%] left-1/2 h-[14%] w-[44%] -translate-x-1/2 border border-b-0 border-white/40" />
          <div className="absolute top-[4%] left-1/2 h-[14%] w-[44%] -translate-x-1/2 border border-t-0 border-white/40" />
          {players === null && !failed && isSupabaseConfigured && <p className="absolute inset-0 grid place-items-center text-white/80">{t.squad.loading}</p>}
          {xi.map((p, i) =>
            p ? (
              <div key={p.id} className="animate-pop absolute flex w-20 -translate-1/2 flex-col items-center" style={{ left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%`, animationDelay: `${i * 40}ms` }}>
                <span
                  className={cn("grid size-9 place-items-center rounded-full border-2 text-sm font-black shadow-md", p.you && "ring-4 ring-amber-300")}
                  style={{ background: p.position === "GK" ? "#f59e0b" : kit.primary, color: p.position === "GK" ? "#111" : kit.text, borderColor: kit.secondary }}
                >
                  {p.number ?? ""}
                </span>
                <span className={cn("mt-0.5 max-w-full truncate rounded px-1 text-[11px] leading-4 font-semibold", p.you ? "bg-amber-300 text-black" : "bg-black/55 text-white")}>{p.you ? t.squad.you : p.name.split(" ").slice(-1)[0]}</span>
                <span className="text-[10px] font-bold text-white/90 tabular-nums">{p.rating}</span>
              </div>
            ) : null,
          )}
        </div>
      </div>

      {/* Bench and the rest of the squad */}
      <div className="grid content-start gap-4">
        <SquadList title={t.squad.bench} list={bench} t={t} />
        {rest.length > 0 && <SquadList title={t.squad.reserves} list={rest} t={t} muted />}
        {failed && <p className="text-sm text-muted-foreground">{t.squad.failed}</p>}
        {players && players.length === 0 && <p className="text-sm text-muted-foreground">{t.squad.noData}</p>}
        <p className="text-xs text-muted-foreground">{fill(t.squad.teamRating, { n: club.teamRating })}</p>
      </div>
    </div>
  );
}

function SquadList({ title, list, t, muted }: { title: string; list: SquadPlayer[]; t: CareerDict; muted?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="mb-2 font-bold">{title}</h3>
      <ul className={cn("grid gap-1 text-sm", muted && "text-muted-foreground")}>
        {list.map((p) => (
          <li key={p.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1", p.you && "bg-amber-300/30 font-bold text-foreground")}>
            <span className="w-6 text-center text-xs tabular-nums opacity-70">{p.number ?? "–"}</span>
            <span className="w-12 shrink-0 rounded bg-muted px-1 text-center text-[11px] font-semibold">{t.positionsShort[p.position]}</span>
            <span className="min-w-0 flex-1 truncate">
              {p.nationality && FLAGS[p.nationality] ? `${FLAGS[p.nationality]} ` : ""}
              {p.you ? `${p.name} (${t.squad.you})` : p.name}
            </span>
            <span className="text-xs tabular-nums opacity-70">{p.age ?? ""}</span>
            <span className="w-7 text-end font-bold tabular-nums">{p.rating}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
