"use client";

import { BarChart3Icon, ChevronDownIcon, LayoutDashboardIcon, PlayIcon, TrophyIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { roleFor } from "@/lib/engine/attrs";
import { netWage, teamStrength } from "@/lib/engine/career";
import { clubKit } from "@/lib/engine/people";
import { playHalf, type HalfEvent, sortTable } from "@/lib/engine/season";
import { situationsPending } from "@/lib/engine/situations";
import type { CareerSave } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { ScreenProps } from "./career-app";
import { CareerHistory } from "./career-history";
import { Crest } from "./crest";
import { Face } from "./face";
import { clubName, fill, leagueRating, money, teamName } from "./helpers";
import { CountryFlag } from "./region-picker";
import { PlayerStats } from "./player-stats";
import { SeasonPlay } from "./season-play";
import { Situations } from "./situations";
import { Squad } from "./squad";
import { StatusBars } from "./status-bars";

type Stage = { kind: "idle" } | { kind: "simulating" } | { kind: "playing"; events: HalfEvent[]; next: CareerSave } | { kind: "summary"; events: HalfEvent[]; pending?: CareerSave };
type Tab = "overview" | "squad" | "stats" | "career";

export function Dashboard({ save, world, t, locale, onChange }: ScreenProps) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [tab, setTab] = useState<Tab>("overview");
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
      setStage({ kind: "playing", events, next });
    }, 500);
  }

  if (stage.kind === "playing") {
    return (
      <SeasonPlay
        before={save}
        after={stage.next}
        world={world}
        t={t}
        locale={locale}
        onFinish={(final) => {
          // Save only after the half is watched, so a refresh mid-way replays it.
          // After the second half, keep the summary on screen until the player moves on.
          if (final.phase === "season-end") setStage({ kind: "summary", events: stage.events, pending: final });
          else {
            onChange(final);
            setStage({ kind: "summary", events: stage.events });
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
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
          <div className="relative shrink-0">
            <Face seed={view.player.face} kit={clubKit(club)} number={view.player.kit} className="animate-pop size-24 overflow-hidden rounded-2xl shadow-lg" title={view.player.name} />
            <span key={view.player.rating} className="animate-pop absolute -end-2 -bottom-2 grid size-11 place-items-center rounded-xl bg-primary font-heading text-xl font-black text-primary-foreground tabular-nums shadow-lg ring-2 ring-background" title={d.world}>
              {view.player.rating}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-2xl font-extrabold sm:text-3xl">
              <CountryFlag country={view.player.nationality} className="me-2 inline-block size-6 rounded-full align-[-3px] shadow" />
              {view.player.name}
            </h1>
            <p className="text-muted-foreground">
              {t.positions[view.player.position]} · {fill(d.ageYears, { age: view.player.age })} · {d.leagueRating} <strong className="text-foreground tabular-nums">{leagueRating(world, view)}</strong>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <Crest club={club} className="size-6" />
              <strong>{teamName(world, club.id, locale, contract.level, view.player.age)}</strong>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t.offers.level[contract.level]}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{t.roles[roleFor(view.player.rating, teamStrength(club, contract.level), view.bars.trust)]}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">#{view.player.kit}</span>
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
        <nav className="mt-5 flex gap-1 rounded-xl bg-muted p-1" aria-label={t.tabs.label}>
          {(
            [
              ["overview", LayoutDashboardIcon],
              ["squad", UsersIcon],
              ["stats", BarChart3Icon],
              ["career", TrophyIcon],
            ] as const
          ).map(([k, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={cn("relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition", tab === k ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="size-4 shrink-0" aria-hidden /> <span className="truncate">{t.tabs[k]}</span>
              {k === "stats" && view.player.trainingPoints > 0 && <span className="absolute end-2 top-1 size-2 animate-ping rounded-full bg-primary" />}
            </button>
          ))}
        </nav>
      </div>

      {tab === "squad" && (
        <div className="animate-rise lg:col-span-2">
          <Squad save={view} world={world} t={t} locale={locale} />
        </div>
      )}
      {tab === "stats" && (
        <div className="animate-rise lg:col-span-2">
          <PlayerStats save={save} t={t} onChange={onChange} />
        </div>
      )}
      {tab === "career" && (
        <div className="animate-rise lg:col-span-2">
          <CareerHistory save={view} world={world} t={t} locale={locale} />
        </div>
      )}
      {tab === "overview" && (
        <>

      {/* Season actions */}
      <div className="animate-rise flex flex-col gap-4 rounded-2xl border bg-card p-5">
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
          <div className="animate-rise rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h3 className="mb-2 font-bold">{t.highlights.summary}</h3>
            <ul className="grid gap-1 text-sm">
              {stage.events.map((e, i) => (
                <li key={i}>• {fill(t.events[e.key as keyof typeof t.events], { ...e.params, club: e.params?.club ? clubName(world, String(e.params.club), locale) : "", kind: e.params?.kind ? t.injury.kinds[e.params.kind as keyof typeof t.injury.kinds] : "" })}</li>
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

        {view.phase === "season" && season.halvesPlayed < 2 && stage.kind !== "summary" && <Situations save={save} t={t} onChange={onChange} />}

        {view.player.injury && (
          <p className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-medium">
            <span aria-hidden>🩹</span> {fill(t.injury.out, { kind: t.injury.kinds[view.player.injury.kind], n: view.player.injury.matches })}
          </p>
        )}

        {view.phase === "season" && season.halvesPlayed < 2 && (
          <Button size="lg" className="shine h-14 text-base" disabled={stage.kind === "simulating" || situationsPending(save)} onClick={play}>
            <PlayIcon aria-hidden />
            {stage.kind === "simulating" ? d.simulating : situationsPending(save) ? t.situations.decideFirst : season.halvesPlayed === 0 ? d.playFirst : d.playSecond}
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
                  <span className="min-w-0 flex-1 truncate">{teamName(world, m.opponentId, locale, contract.level, view.player.age)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {m.minutes ? `${m.injured ? "🩹 " : ""}${m.started ? "" : `${d.sub} · `}${m.goals ? `⚽×${m.goals} ` : ""}${m.assists ? `🅰×${m.assists} ` : ""}${m.rating}` : m.out ? `🩹 ${t.injury.injured}` : d.didNotPlay}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>

      {/* League table */}
      <div className="animate-rise rounded-2xl border bg-card p-5" style={{ animationDelay: "80ms" }}>
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
                      <td className="max-w-0 truncate py-1.5">
                        <span className="flex items-center gap-1.5">
                          <Crest club={world.clubs.find((c) => c.id === r.clubId)!} className="size-4" />
                          <span className="truncate">{clubName(world, r.clubId, locale)}</span>
                        </span>
                      </td>
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

      </div>
        </>
      )}
    </section>
  );
}
