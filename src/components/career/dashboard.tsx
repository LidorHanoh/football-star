"use client";

import { BarChart3Icon, ChevronDownIcon, HomeIcon, PlayIcon, TrophyIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { roleFor } from "@/lib/engine/attrs";
import { netWage, teamStrength } from "@/lib/engine/career";
import { isLeague, runOf } from "@/lib/engine/competitions";
import { clubKit } from "@/lib/engine/people";
import { playHalf, promotionRating, type HalfEvent, sortTable } from "@/lib/engine/season";
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
import { Squad } from "./squad";
import { StatusBars } from "./status-bars";

type Stage = { kind: "idle" } | { kind: "simulating" } | { kind: "playing"; events: HalfEvent[]; next: CareerSave } | { kind: "summary"; events: HalfEvent[]; pending?: CareerSave };
type Tab = "overview" | "squad" | "stats" | "career";
/** These are shown between the matches (full screen), not in the summary. */
const BETWEEN_MATCHES = new Set(["injured", "recovered", "roleDown", "roleUp"]);
const TABS = [
  ["overview", HomeIcon],
  ["squad", UsersIcon],
  ["stats", BarChart3Icon],
  ["career", TrophyIcon],
] as const;

/**
 * The career home. Phone first: a compact player card, the season, and the big
 * Play button in thumb reach above a bottom tab bar (tabs sit on top on a computer).
 */
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
        events={stage.events}
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
          setTab("overview");
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
  const visibleRows = fullTable ? table : table.filter((_, i) => i < 4 || Math.abs(i - myPos) <= 1);
  const role = roleFor(view.player.rating, teamStrength(club, contract.level), view.bars.trust);
  const canPlay = view.phase === "season" && season.halvesPlayed < 2;
  const country = league?.country ?? "";
  const cupName = (t.cupNames as Record<string, string>)[country] ?? t.comps.cup;
  const cup = runOf(matches, "cup");
  const euro = season.europe ? runOf(matches, season.europe.comp) : null;

  const summaryBtn = stage.kind === "summary" && stage.pending;
  const action = summaryBtn ? (
    <Button size="lg" className="shine h-14 w-full text-base font-bold" onClick={() => onChange(stage.pending!)}>
      {d.toSeasonEnd}
    </Button>
  ) : canPlay ? (
    <Button size="lg" className="shine h-14 w-full text-base font-bold" disabled={stage.kind === "simulating"} onClick={play}>
      <PlayIcon aria-hidden />
      {stage.kind === "simulating" ? d.simulating : season.halvesPlayed === 0 ? d.playFirst : d.playSecond}
    </Button>
  ) : null;

  return (
    <section className="mx-auto grid max-w-5xl gap-4 px-3 pt-3 pb-40 sm:px-4 md:pb-10 lg:grid-cols-[1.3fr_1fr]">
      {/* Player card */}
      <div className="rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-card p-4 shadow-sm sm:p-5 lg:col-span-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <Face seed={view.player.face} kit={clubKit(club)} number={view.player.kit} className="animate-pop size-20 rounded-2xl shadow-lg sm:size-24" title={view.player.name} />
            <span key={view.player.rating} className="animate-pop absolute -end-2 -bottom-2 grid size-10 place-items-center rounded-xl bg-primary font-heading text-lg font-black text-primary-foreground tabular-nums shadow-lg ring-2 ring-background" title={d.world}>
              {view.player.rating}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-heading text-xl font-extrabold sm:text-3xl">
              <CountryFlag country={view.player.nationality} className="size-5 shrink-0 rounded-full shadow" />
              <span className="truncate">{view.player.name}</span>
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {t.positions[view.player.position]} · {fill(d.ageYears, { age: view.player.age })} · {d.leagueRating} <strong className="text-foreground tabular-nums">{leagueRating(world, view)}</strong>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Crest club={club} className="size-5" />
              <strong className="truncate">{teamName(world, club.id, locale, contract.level, view.player.age)}</strong>
            </p>
            <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-bold text-primary">{t.roles[role]}</span>
              <span className="rounded-full bg-muted px-2 py-0.5">{t.offers.level[contract.level]}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">#{view.player.kit}</span>
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          {[
            [t.offers.wage, fill(d.wage, { wage: money(netWage(contract.wage, view.agent), locale) })],
            [d.contract, fill(d.contractUntil, { year: contract.until + 1 })],
            [t.agent.yours, view.agent ? `${view.agent.name.split(" ")[0]} · ${view.agent.commission}%` : "–"],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-xl bg-background/60 px-2 py-1.5">
              <dt className="truncate text-muted-foreground">{k}</dt>
              <dd className="truncate font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <StatusBars bars={view.bars} t={t} />
        </div>
        {/* Tabs on a computer */}
        <nav className="mt-5 hidden gap-1 rounded-xl bg-muted p-1 md:flex" aria-label={t.tabs.label}>
          {TABS.map(([k, Icon]) => (
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
          {/* Season */}
          <div className="animate-rise flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-xl font-bold">{fill(d.season, { year: `${season.year}/${String((season.year + 1) % 100).padStart(2, "0")}` })}</h2>
              <span className="truncate text-sm text-muted-foreground">{league ? (league.name[locale] ?? league.name.en) : ""}</span>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className={cn("h-2 flex-1 rounded-full", i < season.halvesPlayed ? "bg-primary" : "bg-muted")} />
              ))}
            </div>

            {/* Competitions this season */}
            {contract.level === "first" && (season.europe || cup.last) && (
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {season.europe && (
                  <span className={cn("rounded-full px-2.5 py-1 text-white", season.europe.comp === "cl" ? "bg-blue-700" : "bg-orange-600")}>
                    {season.europe.comp === "cl" ? "⭐" : "🟠"} {t.comps[season.europe.comp]}
                    {euro?.last ? ` · ${euro.won ? "🏆" : t.stages[euro.last]}` : ""}
                  </span>
                )}
                {cup.last && (
                  <span className="rounded-full bg-amber-500 px-2.5 py-1 text-black">
                    🏆 {cupName} · {cup.won ? "🏆" : t.stages[cup.last]}
                  </span>
                )}
              </div>
            )}

            {stage.kind === "summary" && (
              <div className="animate-rise rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <h3 className="mb-2 font-bold">{t.highlights.summary}</h3>
                <ul className="grid gap-1 text-sm">
                  {stage.events
                    .filter((e) => !BETWEEN_MATCHES.has(e.key))
                    .map((e, i) => (
                      <li key={i}>• {fill(t.events[e.key as keyof typeof t.events], { ...e.params, club: e.params?.club ? clubName(world, String(e.params.club), locale) : "", kind: e.params?.kind ? t.injury.kinds[e.params.kind as keyof typeof t.injury.kinds] : "" })}</li>
                    ))}
                </ul>
              </div>
            )}

            {contract.level === "youth" && (
              <div className="grid gap-2 rounded-2xl bg-muted p-3 text-sm">
                <p>{d.youthNote}</p>
                {(() => {
                  const need = promotionRating(save.player.age, club.teamRating);
                  const pct = Math.max(4, Math.min(100, Math.round((save.player.rating / need) * 100)));
                  return (
                    <div className="grid gap-1">
                      <div className="flex justify-between font-semibold">
                        <span>{fill(d.callUp, { n: need })}</span>
                        <span className="tabular-nums">
                          {save.player.rating}/{need}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-background">
                        <div className={cn("h-full rounded-full", save.player.rating >= need ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <dl className="grid grid-cols-4 gap-2 text-center">
              {[
                [d.apps, played.length],
                [d.goals, matches.reduce((s, m) => s + m.goals, 0)],
                [d.assists, matches.reduce((s, m) => s + m.assists, 0)],
                [d.avg, avg],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-muted/60 p-2">
                  <dd className="font-heading text-xl font-extrabold tabular-nums sm:text-2xl">{value}</dd>
                  <dt className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</dt>
                </div>
              ))}
            </dl>

            {view.player.injury && (
              <p className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-medium">
                <span aria-hidden>🩹</span> {fill(t.injury.out, { kind: t.injury.kinds[view.player.injury.kind], n: view.player.injury.matches })}
              </p>
            )}

            {/* On a computer the action sits here; on a phone it's pinned at the bottom. */}
            {action && <div className="hidden md:block">{action}</div>}

            {played.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{d.lastMatches}</h3>
                <ul className="grid gap-1.5 text-sm">
                  {matches
                    .slice(-5)
                    .reverse()
                    .map((m, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
                        <span className={cn("grid h-6 min-w-9 shrink-0 place-items-center rounded px-1 text-xs font-bold text-white tabular-nums", m.goalsFor > m.goalsAgainst || m.pens === "won" ? "bg-emerald-600" : m.goalsFor === m.goalsAgainst ? "bg-slate-500" : "bg-rose-600")} dir="ltr">
                          {m.goalsFor}-{m.goalsAgainst}
                        </span>
                        {!isLeague(m) && <span aria-hidden>{m.comp === "cl" ? "⭐" : m.comp === "el" ? "🟠" : "🏆"}</span>}
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
          <div className="animate-rise rounded-3xl border bg-card p-4 sm:p-5" style={{ animationDelay: "80ms" }}>
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
                      <th className="w-9">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => {
                      const pos = table.indexOf(r) + 1;
                      const mine = r.clubId === club.id;
                      return (
                        <tr key={r.clubId} className={cn("border-t", mine && "bg-primary/10 font-bold")}>
                          <td className="py-2">{pos}</td>
                          <td className="max-w-0 truncate py-2">
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
                <Button variant="ghost" size="sm" className="mt-2 h-10 w-full" onClick={() => setFullTable(!fullTable)}>
                  <ChevronDownIcon className={cn(fullTable && "rotate-180")} aria-hidden /> {d.fullTable}
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {/* Phone: the action + bottom tabs, pinned */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        {action && tab === "overview" && <div className="px-3 pt-3">{action}</div>}
        <nav className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]" aria-label={t.tabs.label}>
          {TABS.map(([k, Icon]) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition", tab === k ? "text-primary" : "text-muted-foreground")}>
              <Icon className={cn("size-6", tab === k && "scale-110")} aria-hidden />
              {t.tabs[k]}
              {k === "stats" && view.player.trainingPoints > 0 && <span className="absolute top-2 start-[calc(50%+8px)] size-2.5 rounded-full bg-primary ring-2 ring-background" />}
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
