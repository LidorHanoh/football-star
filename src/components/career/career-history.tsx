"use client";

import { TrendingUpIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { trophyCabinet } from "@/lib/engine/stats";
import type { CareerSave, Trophy, World } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Crest } from "./crest";
import { type CareerDict, fill, teamName } from "./helpers";
import { TrophyArt } from "./trophy";

const seasonLabel = (y: number) => `${y}/${String((y + 1) % 100).padStart(2, "0")}`;

/** The career tab: trophy cabinet, rating progress and every season so far. */
export function CareerHistory({ save, world, t, locale }: { save: CareerSave; world: World; t: CareerDict; locale: Locale }) {
  const h = t.history;
  const cabinet = trophyCabinet(save.history);
  const byKind = new Map<Trophy, number[]>();
  for (const c of cabinet) byKind.set(c.trophy, [...(byKind.get(c.trophy) ?? []), c.year]);
  const curYear = save.season?.year ?? (save.history.at(-1)?.year ?? 0) + 1;
  const ageAt = (year: number) => save.player.age - (curYear - year);

  return (
    <div className="grid gap-5">
      {/* Trophy cabinet: wooden shelves, one slot per award (×N when won again) */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        <h2 className="flex items-center gap-2 px-5 pt-5 font-heading text-xl font-bold">
          <TrophyIcon className="size-5 text-amber-500" aria-hidden /> {h.cabinet}
          {cabinet.length > 0 && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-sm text-amber-600 dark:text-amber-300">{cabinet.length}</span>}
        </h2>
        {cabinet.length === 0 ? (
          <div className="flex items-center gap-4 p-5">
            <TrophyArt kind="league" className="h-20 opacity-25 grayscale" />
            <p className="text-muted-foreground">{h.emptyCabinet}</p>
          </div>
        ) : (
          <div className="mt-3 bg-gradient-to-b from-[#3b2414] to-[#1f120a] px-4 pt-6 pb-0">
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-6">
              {[...byKind.entries()].map(([kind, years], i) => (
                <li key={kind} className="animate-rise relative flex w-28 flex-col items-center text-center" style={{ animationDelay: `${i * 90}ms` }}>
                  <TrophyArt kind={kind} className="h-28 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition duration-300 hover:-translate-y-1 hover:scale-105" title={t.trophies[kind]} />
                  {years.length > 1 && <span className="absolute end-1 top-1 rounded-full bg-amber-400 px-1.5 text-xs font-black text-black shadow">×{years.length}</span>}
                  <span className="mt-1 text-xs font-bold text-amber-100">{t.trophies[kind]}</span>
                  <span className="text-[0.65rem] text-amber-100/60 tabular-nums">{years.map(seasonLabel).join(" · ")}</span>
                </li>
              ))}
            </ul>
            {/* shelf */}
            <div className="mt-4 h-3 rounded-t bg-gradient-to-b from-[#7a4a26] to-[#4a2c16] shadow-[0_-2px_8px_rgba(0,0,0,0.4)]" />
          </div>
        )}
      </section>

      <RatingChart save={save} t={t} ageAt={ageAt} />

      {/* Season by season */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 font-heading text-xl font-bold">{h.seasons}</h2>
        {save.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{h.noSeasons}</p>
        ) : (
          <ol className="relative grid gap-3 border-s-2 border-primary/30 ps-5">
            {[...save.history].reverse().map((s, i) => {
              const club = world.clubs.find((c) => c.id === s.clubId);
              const won = s.trophies ?? [];
              return (
                <li key={s.year} className="animate-rise relative" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className={cn("absolute -start-[1.72rem] top-4 size-3 rounded-full ring-4 ring-card", won.length ? "bg-amber-400" : "bg-primary")} aria-hidden />
                  <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3", won.length ? "border-amber-400/50 bg-amber-400/5" : "bg-muted/30")}>
                    {club && <Crest club={club} className="size-10" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {teamName(world, s.clubId, locale, s.level, ageAt(s.year))}
                        {s.loanFrom && <span className="ms-1.5 rounded-full bg-cyan-600 px-1.5 py-px text-[10px] font-bold text-white">{t.offers.tags.loan}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {seasonLabel(s.year)} · {fill(t.dashboard.ageYears, { age: ageAt(s.year) })}
                        {s.leaguePosition && s.level === "first" ? ` · #${s.leaguePosition}` : ""}
                      </p>
                    </div>
                    <dl className="flex gap-3 text-center text-xs tabular-nums">
                      {[
                        [t.dashboard.apps, s.apps],
                        [t.dashboard.goals, s.goals],
                        [t.dashboard.assists, s.assists],
                        [t.dashboard.avg, s.avgRating?.toFixed(2) ?? "–"],
                      ].map(([label, v]) => (
                        <div key={String(label)}>
                          <dd className="font-heading text-base font-extrabold">{v}</dd>
                          <dt className="text-muted-foreground">{label}</dt>
                        </div>
                      ))}
                    </dl>
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary font-heading font-black text-primary-foreground tabular-nums" title={t.dashboard.world}>
                      {s.ratingEnd}
                    </span>
                    {won.length > 0 && (
                      <ul className="flex w-full flex-wrap gap-2">
                        {won.map((k) => (
                          <li key={k} className="flex items-center gap-1 rounded-full bg-amber-400/15 py-0.5 ps-0.5 pe-2 text-xs font-semibold">
                            <TrophyArt kind={k} className="h-6" /> {t.trophies[k]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

/** Rating after every season, plus today. One series, hover for details. */
function RatingChart({ save, t, ageAt }: { save: CareerSave; t: CareerDict; ageAt: (y: number) => number }) {
  const h = t.history;
  const [hover, setHover] = useState<number | null>(null);
  const pts = [
    ...save.history.map((s) => ({ label: seasonLabel(s.year), age: ageAt(s.year), rating: s.ratingEnd, trophies: s.trophies?.length ?? 0 })),
    { label: h.now, age: save.player.age, rating: save.player.rating, trophies: 0 },
  ];
  const W = 600;
  const H = 200;
  const pad = { l: 34, r: 16, t: 22, b: 28 };
  const min = Math.floor((Math.min(...pts.map((p) => p.rating)) - 3) / 5) * 5;
  const max = Math.ceil((Math.max(...pts.map((p) => p.rating)) + 3) / 5) * 5;
  const x = (i: number) => pad.l + (pts.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (pts.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const peak = pts.reduce((b, p, i) => (p.rating > pts[b].rating ? i : b), 0);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.rating)}`).join(" ");
  const ticks = Array.from({ length: Math.round((max - min) / 5) + 1 }, (_, i) => min + i * 5);
  const shown = hover ?? pts.length - 1;
  const gain = pts.at(-1)!.rating - pts[0].rating;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
          <TrendingUpIcon className="size-5 text-primary" aria-hidden /> {h.progress}
        </h2>
        <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
          <strong className="text-foreground">{pts[shown].label}</strong> · {fill(t.dashboard.ageYears, { age: pts[shown].age })} · <strong className="text-foreground">{pts[shown].rating}</strong>
          {pts.length > 1 && hover === null && <span className={cn("ms-2 font-bold", gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600")}>{gain >= 0 ? `+${gain}` : gain}</span>}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`${h.progress}: ${pts.map((p) => `${p.label} ${p.rating}`).join(", ")}`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="rc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-border" strokeWidth="1" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="currentColor" className="text-muted-foreground tabular-nums">
              {v}
            </text>
          </g>
        ))}
        {pts.length > 1 && <path d={`${line} L${x(pts.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`} fill="url(#rc-area)" />}
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="currentColor" className="text-muted-foreground" strokeDasharray="3 3" />}
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} className="cursor-pointer outline-none">
            <rect x={x(i) - 18} y={pad.t} width="36" height={H - pad.t - pad.b} fill="transparent" />
            <circle cx={x(i)} cy={y(p.rating)} r={hover === i ? 6 : 4.5} fill={p.trophies ? "#f59e0b" : "var(--primary)"} stroke="var(--card)" strokeWidth="2" />
            {(pts.length <= 8 || i === 0 || i === pts.length - 1 || i % 2 === 0) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="currentColor" className="text-muted-foreground">
                {pts.length > 8 ? p.label.slice(2) : p.label}
              </text>
            )}
          </g>
        ))}
        {pts.length > 1 && (
          <text x={x(peak)} y={y(pts[peak].rating) - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" className="text-foreground">
            {h.peak} {pts[peak].rating}
          </text>
        )}
      </svg>
    </section>
  );
}
