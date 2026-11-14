"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import { AWARD_KEYS, type AwardKey, awardTable, type LeaderLine, leagueLeaders, SLOTS } from "@/lib/engine/awards";
import { hash, personName } from "@/lib/engine/people";
import type { CareerSave, Position, World } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Crest } from "./crest";
import { type CareerDict, clubName, fill } from "./helpers";
import { TrophyArt } from "./trophy";
import { type SquadPlayer, useSquads } from "./use-squad";

/** Which squad players fit each key-player slot, best first. */
const SLOT_POSITIONS: Position[][] = [
  ["ST", "LW", "RW", "AM"],
  ["ST", "LW", "RW", "AM"],
  ["LW", "RW", "AM", "ST"],
  ["AM", "CM", "LW", "RW"],
  ["CM", "DM", "AM"],
  ["CB", "DM"],
  ["RB", "LB", "CB"],
  ["GK"],
];

/** Real names for each club's key players: the best fits from its squad. */
function slotNames(squad: SquadPlayer[] | undefined, clubId: string, israeli: boolean) {
  const used = new Set<string>();
  return SLOTS.map((_, i) => {
    const pick = squad?.find((p) => !p.you && !used.has(p.id) && SLOT_POSITIONS[i].includes(p.position)) ?? squad?.find((p) => !p.you && !used.has(p.id) && p.position !== "GK");
    if (pick) {
      used.add(pick.id);
      return pick.name;
    }
    return personName(hash(`${clubId}:lead${i}`), israeli);
  });
}

const VALUE: Record<AwardKey, keyof LeaderLine> = { goldenBoot: "goals", playmaker: "assists", playerOfSeason: "rating", goldenGlove: "cleanSheets", wall: "rating" };

/**
 * The league's charts: top scorers, assists, ratings, clean sheets and the
 * best defenders, with you in them. The leader at the end wins the award.
 */
export function LeagueLeaders({ save, world, t, locale, final = false, initial, rows = 10 }: { save: CareerSave; world: World; t: CareerDict; locale: Locale; final?: boolean; initial?: AwardKey; rows?: number }) {
  const l = t.leaders;
  const lines = useMemo(() => leagueLeaders(save), [save]);
  const [tab, setTab] = useState<AwardKey>(initial ?? (save.player.position === "GK" ? "goldenGlove" : "goldenBoot"));
  const league = world.leagues.find((x) => x.key === save.season?.leagueKey);
  const israeli = league?.country === "Israel";
  const youth = save.contract?.level === "youth";
  const clubs = useMemo(() => [...new Set(lines.map((x) => x.clubId))].map((id) => world.clubs.find((c) => c.id === id)).filter((c) => !!c), [lines, world]);
  const squads = useSquads(clubs, locale, israeli, youth);
  const names = useMemo(() => Object.fromEntries(clubs.map((c) => [c.id, slotNames(squads[c.id], c.id, israeli)])), [clubs, squads, israeli]);

  const table = awardTable(lines, tab);
  const meIdx = table.findIndex((x) => x.you);
  const shown = table.slice(0, rows);
  const leader = table[0];
  const key = VALUE[tab];
  const fmt = (x: LeaderLine, k: keyof LeaderLine) => (k === "rating" ? (x.rating ? x.rating.toFixed(2) : "–") : String(x[k]));
  const name = (x: LeaderLine) => (x.you ? save.player.name : (names[x.clubId]?.[x.slot] ?? ""));
  const tabs = AWARD_KEYS;

  const row = (x: LeaderLine, rank: number) => (
    <tr key={x.id} className={cn("border-t", x.you && "bg-primary/10 font-bold")}>
      <td className={cn("w-7 py-1.5 text-center tabular-nums", rank === 1 ? "font-black text-amber-500" : "text-muted-foreground")}>{rank === 1 ? "👑" : rank}</td>
      <td className="max-w-0 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          {(() => {
            const club = world.clubs.find((c) => c.id === x.clubId);
            return club ? <Crest club={club} className="size-5 shrink-0" /> : null;
          })()}
          <span className="min-w-0">
            <span className="block truncate text-sm">
              {name(x)}
              {x.you && <span className="ms-1 rounded bg-primary px-1 text-[10px] text-primary-foreground">{l.you}</span>}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{clubName(world, x.clubId, locale)}</span>
          </span>
        </span>
      </td>
      <td className="w-9 text-center text-xs text-muted-foreground tabular-nums">{x.apps}</td>
      {(tab === "goldenGlove" ? (["goals", "assists", "rating", "cleanSheets"] as const) : (["goals", "assists", "rating"] as const)).map((k) => (
        <td key={k} className={cn("w-10 text-center tabular-nums", k === key ? "font-black" : "text-xs text-muted-foreground")}>
          {fmt(x, k)}
        </td>
      ))}
    </tr>
  );

  return (
    <section className="grid grid-cols-1 gap-2 rounded-2xl border bg-card p-3" aria-label={l.title}>
      <div className="flex items-center gap-3">
        <TrophyArt kind={tab} className="h-14 w-11 shrink-0 drop-shadow" />
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-black">{l.title}</h3>
          <p className="truncate text-xs text-muted-foreground">{fill(l.sub, { league: league ? (league.name[locale] ?? league.name.en) : "" })}</p>
          <p className="text-xs font-semibold">{final && leader ? (leader.you ? fill(l.youWon, { trophy: t.trophies[tab] }) : fill(l.winner, { trophy: t.trophies[tab] })) : fill(l.race, { trophy: t.trophies[tab] })}</p>
        </div>
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist">
        {tabs.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-bold transition", tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {l.tabs[k]}
          </button>
        ))}
      </div>
      {table.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{l.empty}</p>
      ) : (
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-[11px] text-muted-foreground">
              <th className="w-7" />
              <th className="text-start font-semibold">{l.cols.player}</th>
              <th className="w-9 font-semibold">{l.cols.apps}</th>
              <th className="w-10 font-semibold">{l.cols.goals}</th>
              <th className="w-10 font-semibold">{l.cols.assists}</th>
              <th className="w-10 font-semibold">{l.cols.rating}</th>
              {tab === "goldenGlove" && <th className="w-10 font-semibold">{l.cols.cleanSheets}</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((x, i) => row(x, i + 1))}
            {meIdx >= rows && row(table[meIdx], meIdx + 1)}
          </tbody>
        </table>
      )}
      {meIdx > 0 && leader && (
        <p className="text-center text-xs text-muted-foreground">
          {fill(l.behind, { pos: meIdx + 1, n: key === "rating" ? (leader.rating - table[meIdx].rating).toFixed(2) : Number(leader[key]) - Number(table[meIdx][key]) })}
        </p>
      )}
      {(tab === "playerOfSeason" || tab === "wall" || tab === "goldenGlove") && <p className="text-center text-[11px] text-muted-foreground">{l.regular}</p>}
    </section>
  );
}
