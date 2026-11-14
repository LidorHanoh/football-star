"use client";

import { ActivityIcon } from "lucide-react";
import { useState } from "react";
import { careerStats, pct, perMatch, sumMatchStats } from "@/lib/engine/stats";
import type { CareerSave } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { type CareerDict, fill } from "./helpers";

type Scope = "season" | "career";

/** "How much do I do per match": averages for this season or the whole career. */
export function PerMatch({ save, t }: { save: CareerSave; t: CareerDict }) {
  const [scope, setScope] = useState<Scope>("season");
  const pm = t.perMatch;
  const gk = save.player.position === "GK";
  const cur = save.season?.matches ?? [];
  const played = cur.filter((m) => m.minutes);

  // Goals / assists / rating are known for every match; detailed stats only for matches that have them.
  const base =
    scope === "season"
      ? {
          apps: played.length,
          goals: cur.reduce((s, m) => s + m.goals, 0),
          assists: cur.reduce((s, m) => s + m.assists, 0),
          ratingSum: played.reduce((s, m) => s + (m.rating ?? 0), 0),
        }
      : save.history.reduce(
          (acc, h) => ({ apps: acc.apps + h.apps, goals: acc.goals + h.goals, assists: acc.assists + h.assists, ratingSum: acc.ratingSum + (h.avgRating ?? 0) * h.apps }),
          { apps: played.length, goals: cur.reduce((s, m) => s + m.goals, 0), assists: cur.reduce((s, m) => s + m.assists, 0), ratingSum: played.reduce((s, m) => s + (m.rating ?? 0), 0) },
        );
  const { total: st, apps: sApps } = scope === "season" ? sumMatchStats(cur) : careerStats(save.history, cur);
  const f = (v: number) => perMatch(v, sApps).toFixed(1);

  const tiles: { label: string; value: string; sub?: string; bar?: number }[] = gk
    ? [
        { label: pm.saves, value: f(st.saves) },
        { label: pm.cleanSheets, value: String(st.cleanSheet), sub: `${pct(st.cleanSheet, sApps)}%`, bar: pct(st.cleanSheet, sApps) },
        { label: pm.passes, value: f(st.passes) },
        { label: pm.passAcc, value: `${pct(st.passesDone, st.passes)}%`, bar: pct(st.passesDone, st.passes) },
      ]
    : [
        { label: pm.goals, value: perMatch(base.goals, base.apps).toFixed(2) },
        { label: pm.assists, value: perMatch(base.assists, base.apps).toFixed(2) },
        { label: pm.shots, value: f(st.shots), sub: `${f(st.onTarget)} ${pm.onTarget}` },
        { label: pm.keyPasses, value: f(st.keyPasses) },
        { label: pm.dribbles, value: f(st.dribblesWon), sub: `${pm.dribbleRate} ${pct(st.dribblesWon, st.dribbles)}%`, bar: pct(st.dribblesWon, st.dribbles) },
        { label: pm.passAcc, value: `${pct(st.passesDone, st.passes)}%`, sub: `${f(st.passes)} ${pm.passes}`, bar: pct(st.passesDone, st.passes) },
        { label: pm.tackles, value: f(st.tackles) },
        { label: pm.interceptions, value: f(st.interceptions) },
      ];

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold">
          <ActivityIcon className="size-4 text-primary" aria-hidden /> {pm.title}
        </h3>
        <div className="flex rounded-lg bg-muted p-0.5 text-xs font-semibold">
          {(["season", "career"] as Scope[]).map((k) => (
            <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)} className={cn("rounded-md px-3 py-1 transition", scope === k ? "bg-background shadow" : "text-muted-foreground")}>
              {pm[k]}
            </button>
          ))}
        </div>
      </div>
      {sApps === 0 && base.apps === 0 ? (
        <p className="text-sm text-muted-foreground">{pm.none}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="col-span-2 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 sm:col-span-4">
              <dt className="text-sm font-medium">{pm.rating}</dt>
              <dd className="font-heading text-2xl font-black tabular-nums text-primary">{base.apps ? (base.ratingSum / base.apps).toFixed(2) : "–"}</dd>
            </div>
            {tiles.map((x) => (
              <div key={x.label} className="rounded-xl bg-muted/60 p-2.5">
                <dd className="font-heading text-xl font-extrabold tabular-nums">{x.value}</dd>
                <dt className="truncate text-xs text-muted-foreground">{x.label}</dt>
                {x.bar !== undefined && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${x.bar}%` }} />
                  </div>
                )}
                {x.sub && <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">{x.sub}</p>}
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{fill(pm.apps, { n: sApps })}</p>
        </>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{pm.driven}</p>
    </div>
  );
}
