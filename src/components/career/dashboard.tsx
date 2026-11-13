"use client";

import { ChevronDownIcon, PlayIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { netWage } from "@/lib/engine/career";
import { playHalf, type HalfEvent, sortTable } from "@/lib/engine/season";
import type { CareerSave, Highlight } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { ScreenProps } from "./career-app";
import { clubName, fill, FLAGS, leagueRating, money } from "./helpers";
import { Highlights } from "./highlights";
import { StatusBars } from "./status-bars";

type Stage = { kind: "idle" } | { kind: "simulating" } | { kind: "highlights"; items: Highlight[]; events: HalfEvent[]; next: CareerSave } | { kind: "summary"; events: HalfEvent[]; pending?: CareerSave };

export function Dashboard({ save, world, t, locale, onChange, onExit }: ScreenProps & { onExit: () => void }) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [fullTable, setFullTable] = useState(false);
  // While the end-of-season summary is open, show the finished season's numbers.
  const view = stage.kind === "summary" && stage.pending ? stage.pending : save;
  const season = view.season!;
  const contract = view.contract!;
  const club = world.clubs.find((c) => c.id === contract.clubId)!;
  const league = world.leagues.find((l) => l.key === season.leagueKey);
  const d = t.dashboard;

  function play() {
    setStage({ kind: "simulating" });
    // Small delay so the "playing matches" state is visible.
    setTimeout(() => {
      const { save: next, events } = playHalf(save, world);
      const half = next.season!.halvesPlayed;
      const items = next.season!.highlights.filter((h) => h.half === half);
      setStage({ kind: "highlights", items, events, next });
    }, 700);
  }

  if (stage.kind === "highlights") {
    return (
      <section className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 font-heading text-2xl font-extrabold">
          <SparklesIcon className="text-amber-500" aria-hidden /> {t.highlights.title}
        </h1>
        <Highlights
          items={stage.items}
          world={world}
          myClubId={contract.clubId}
          playerName={save.player.name}
          isKeeper={save.player.position === "GK"}
          t={t}
          locale={locale}
          onDone={() => {
            // Save only after the highlights, so a refresh mid-reel replays the half.
            // After the second half, keep the summary on screen until the player moves on.
            const { events, next } = stage;
            if (next.phase === "season-end") setStage({ kind: "summary", events, pending: next });
            else {
              onChange(next);
              setStage({ kind: "summary", events });
            }
          }}
        />
      </section>
    );
  }

  const matches = season.matches;
  const played = matches.filter((m) => m.minutes);
  const ratings = played.map((m) => m.rating!).filter(Boolean);
  const avg = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2) : "–";
  const table = sortTable(season.table);
  const myPos = table.findIndex((r) => r.clubId === club.id);
  const visibleRows = fullTable ? table : table.filter((_, i) => i < 5 || Math.abs(i - myPos) <= 1);

  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[1.3fr_1fr]">
      {/* Player card */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-sm lg:col-span-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <span className="text-xs font-semibold opacity-80">{d.world}</span>
            <span className="-mt-2 font-heading text-4xl font-black tabular-nums">{view.player.rating}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-2xl font-extrabold sm:text-3xl">
              {FLAGS[view.player.nationality] ?? ""} {view.player.name}
            </h1>
            <p className="text-muted-foreground">
              {t.positions[view.player.position]} · {fill(d.ageYears, { age: view.player.age })} · {d.leagueRating} <strong className="text-foreground tabular-nums">{leagueRating(world, view)}</strong>
            </p>
            <p className="mt-1 text-sm">
              <strong>{clubName(world, club.id, locale)}</strong>
              <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs">{t.offers.level[contract.level]}</span>
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-end">
            <dt className="text-muted-foreground">{t.offers.wage}</dt>
            <dd className="font-bold tabular-nums">{fill(d.wage, { wage: money(netWage(contract.wage, view.agent), locale) })}</dd>
            <dt className="text-muted-foreground">{d.contract}</dt>
            <dd className="font-medium">{fill(d.contractUntil, { year: contract.until + 1 })}</dd>
            <dt className="text-muted-foreground">{t.agent.yours}</dt>
            <dd className="font-medium">{view.agent ? `${view.agent.name} (${view.agent.commission}%)` : "–"}</dd>
          </dl>
        </div>
        <div className="mt-5">
          <StatusBars bars={view.bars} t={t} />
        </div>
      </div>

      {/* Season actions */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold">
            {fill(d.season, { year: `${season.year}/${String((season.year + 1) % 100).padStart(2, "0")}` })}
          </h2>
          <span className="text-sm text-muted-foreground">{league ? league.name[locale] ?? league.name.en : ""}</span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className={cn("h-2 flex-1 rounded-full", i < season.halvesPlayed ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        {stage.kind === "summary" && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h3 className="mb-2 font-bold">{t.highlights.summary}</h3>
            <ul className="grid gap-1 text-sm">
              {stage.events.map((e, i) => (
                <li key={i}>• {fill(t.events[e.key as keyof typeof t.events], { ...e.params, club: e.params?.club ? clubName(world, String(e.params.club), locale) : "" })}</li>
              ))}
            </ul>
          </div>
        )}

        {stage.kind === "summary" && stage.pending && (
          <Button size="lg" className="h-14 text-base" onClick={() => onChange(stage.pending!)}>
            {d.toSeasonEnd}
          </Button>
        )}

        {contract.level === "youth" && <p className="rounded-lg bg-muted p-3 text-sm">{d.youthNote}</p>}

        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            [d.apps, played.length],
            [d.goals, matches.reduce((s, m) => s + m.goals, 0)],
            [d.assists, matches.reduce((s, m) => s + m.assists, 0)],
            [d.avg, avg],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-muted/60 p-2">
              <dd className="font-heading text-2xl font-extrabold tabular-nums">{value}</dd>
              <dt className="truncate text-xs text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>

        {view.phase === "season" && season.halvesPlayed < 2 && (
          <Button size="lg" className="h-14 text-base" disabled={stage.kind === "simulating"} onClick={play}>
            <PlayIcon aria-hidden />
            {stage.kind === "simulating" ? d.simulating : season.halvesPlayed === 0 ? d.playFirst : d.playSecond}
          </Button>
        )}

        {played.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{d.lastMatches}</h3>
            <ul className="grid gap-1.5 text-sm">
              {matches.slice(-5).reverse().map((m, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded text-xs font-bold text-white", m.goalsFor > m.goalsAgainst ? "bg-emerald-600" : m.goalsFor === m.goalsAgainst ? "bg-slate-500" : "bg-rose-600")}>
                    {m.goalsFor}-{m.goalsAgainst}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{clubName(world, m.opponentId, locale)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {m.minutes ? `${m.started ? "" : `${d.sub} · `}${m.goals ? `⚽×${m.goals} ` : ""}${m.assists ? `🅰×${m.assists} ` : ""}${m.rating}` : d.didNotPlay}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button variant="ghost" className="mt-auto self-start" onClick={onExit}>
          {t.back}
        </Button>
      </div>

      {/* League table */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 font-heading text-xl font-bold">{d.table}</h2>
        {table.length === 0 ? (
          <p className="text-sm text-muted-foreground">–</p>
        ) : (
          <>
            <table className="w-full text-sm tabular-nums">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="w-7 text-start">#</th>
                  <th className="text-start" />
                  <th className="w-8">P</th>
                  <th className="w-10">+/-</th>
                  <th className="w-8">Pts</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => {
                  const pos = table.indexOf(r) + 1;
                  const mine = r.clubId === club.id;
                  return (
                    <tr key={r.clubId} className={cn("border-t", mine && "bg-primary/10 font-bold")}>
                      <td className="py-1.5">{pos}</td>
                      <td className="max-w-0 truncate py-1.5">{clubName(world, r.clubId, locale)}</td>
                      <td className="text-center">{r.p}</td>
                      <td className="text-center">{r.gf - r.ga}</td>
                      <td className="text-center font-bold">{r.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFullTable(!fullTable)}>
              <ChevronDownIcon className={cn(fullTable && "rotate-180")} aria-hidden /> {d.fullTable}
            </Button>
          </>
        )}

        {view.history.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 font-bold">{d.history}</h3>
            <ul className="grid gap-1 text-sm">
              {view.history.map((h) => (
                <li key={h.year} className="flex justify-between gap-2">
                  <span className="truncate">
                    {h.year}/{String((h.year + 1) % 100).padStart(2, "0")} · {clubName(world, h.clubId, locale)}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {h.apps} · {h.goals}⚽ · {h.ratingEnd}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
