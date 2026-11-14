"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import type { IntlBreak, IntlMatch, Tournament } from "@/lib/engine/international";
import { cn } from "@/lib/utils";
import { type CareerDict, countryLabel, fill } from "./helpers";
import { CountryFlag } from "./region-picker";
import { Takeover } from "./situations";

/** One national-team game as a row: flags, score, your numbers. */
function IntlRow({ m, country, locale, t, delay }: { m: IntlMatch; country: string; locale: Locale; t: CareerDict; delay: number }) {
  const res = m.gf > m.ga || m.pens === "won" ? "w" : m.gf < m.ga || m.pens === "lost" ? "l" : "d";
  const [home, away, hg, ag] = m.home ? [country, m.opp, m.gf, m.ga] : [m.opp, country, m.ga, m.gf];
  return (
    <li className={cn("animate-rise grid gap-1.5 rounded-xl border-s-4 bg-white/10 px-3 py-2.5", res === "w" ? "border-s-emerald-400" : res === "d" ? "border-s-slate-300" : "border-s-rose-400")} style={{ animationDelay: `${delay}ms` }}>
      {m.stage && <span className="text-[11px] font-bold tracking-wider text-amber-200 uppercase">{t.intl.stages[m.stage]}</span>}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 font-semibold">
        <span className="flex min-w-0 items-center justify-end gap-2 text-end">
          <span className="min-w-0 truncate">{countryLabel(home, locale)}</span>
          <CountryFlag country={home} className="h-4 w-6 shrink-0 rounded-sm" />
        </span>
        <span className="flex gap-1 rounded-md bg-white px-2 font-heading font-black text-slate-900 tabular-nums">
          <span>{hg}</span>
          <span>–</span>
          <span>{ag}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <CountryFlag country={away} className="h-4 w-6 shrink-0 rounded-sm" />
          <span className="min-w-0 truncate">{countryLabel(away, locale)}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {m.pens && <span className="text-white/70">{m.pens === "won" ? t.play.pensWon : t.play.pensLost}</span>}
        {m.minutes ? (
          <>
            <span className={cn("rounded px-1.5 py-0.5 font-bold tabular-nums", (m.rating ?? 0) >= 7.5 ? "bg-emerald-600" : (m.rating ?? 0) >= 6.5 ? "bg-amber-500 text-black" : "bg-rose-600")}>{m.rating}</span>
            <span className="text-white/70">{m.minutes}&apos;</span>
            {m.goals > 0 && <span>⚽×{m.goals}</span>}
            {m.assists > 0 && <span>🅰×{m.assists}</span>}
          </>
        ) : (
          <span className="text-white/60">{t.intl.unused}</span>
        )}
      </div>
    </li>
  );
}

/** International break: you're called up (with the two games), or you weren't picked this time. */
export function IntlTakeover({ brk, country, locale, t, onClose }: { brk: IntlBreak; country: string; locale: Locale; t: CareerDict; onClose: () => void }) {
  const it = t.intl;
  const nation = countryLabel(country, locale);
  if (!brk.picked) {
    return (
      <Takeover tone="dark" label={it.breakTitle}>
        <div className="text-center">
          <CountryFlag country={country} className="animate-pop mx-auto mb-4 h-16 w-24 rounded-lg opacity-60 grayscale shadow-xl" />
          <p className="font-heading text-3xl font-black">{it.notPicked}</p>
          <p className="mx-auto mt-3 max-w-md text-lg text-white/80">{fill(it.notPickedText, { nation })}</p>
          <Button size="lg" className="mt-8 h-14 w-full bg-white text-base font-bold text-black hover:bg-white/90" onClick={onClose} autoFocus>
            {t.next}
          </Button>
        </div>
      </Takeover>
    );
  }
  const goals = brk.matches.reduce((s, m) => s + m.goals, 0);
  return (
    <Takeover tone="blue" label={it.breakTitle}>
      <p className="text-center text-xs font-bold tracking-[0.2em] text-white/60 uppercase">{it.breakTitle}</p>
      <div className="relative mx-auto mt-4 w-fit">
        <CountryFlag country={country} className="animate-pop h-20 w-32 rounded-lg shadow-[0_0_60px_rgba(255,255,255,0.25)]" />
        <span className="animate-pop absolute -end-3 -top-3 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-black shadow" style={{ animationDelay: "300ms" }}>
          {brk.firstCap ? it.firstCapBadge : "📞"}
        </span>
      </div>
      <p className="mt-5 text-center font-heading text-3xl font-black">{brk.firstCap ? fill(it.firstCap, { nation }) : fill(it.calledUp, { nation })}</p>
      <ul className="mt-5 grid gap-2">
        {brk.matches.map((m, i) => (
          <IntlRow key={i} m={m} country={country} locale={locale} t={t} delay={400 + i * 350} />
        ))}
      </ul>
      {goals > 0 && <p className="animate-pop mt-4 text-center font-bold text-amber-200">{fill(it.scored, { n: goals })}</p>}
      <Button size="lg" className="mt-6 h-14 w-full bg-white text-base font-bold text-black hover:bg-white/90" onClick={onClose} autoFocus>
        {t.next}
      </Button>
    </Takeover>
  );
}

/** The summer tournament: games revealed one by one, then how far your country went. */
export function TournamentTakeover({ tour, country, locale, t, onClose }: { tour: Tournament; country: string; locale: Locale; t: CareerDict; onClose: () => void }) {
  const it = t.intl;
  const nation = countryLabel(country, locale);
  const title = `${it.comps[tour.comp]} ${tour.year}`;
  const [shown, setShown] = useState(tour.qualified ? 0 : tour.matches.length);
  useEffect(() => {
    if (shown >= tour.matches.length) return;
    const timer = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 900 : 1100);
    return () => clearTimeout(timer);
  }, [shown, tour.matches.length]);
  const finished = shown >= tour.matches.length;
  const outcome = !tour.qualified ? fill(it.didNotQualify, { nation }) : tour.won ? fill(it.champions, { nation }) : tour.last === "group" ? it.outGroup : tour.last === "final" ? it.outFinal : fill(it.outStage, { stage: it.stages[tour.last] });

  return (
    <Takeover tone={!finished ? "blue" : tour.won ? "gold" : tour.qualified && tour.last !== "group" ? "good" : "bad"} label={title}>
      <p className="text-center text-xs font-bold tracking-[0.2em] text-white/60 uppercase">{it.summer}</p>
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="animate-pop text-5xl" aria-hidden>
          {tour.comp === "wc" ? "🌍" : tour.comp === "euro" ? "🇪🇺" : "🌎"}
        </span>
        <CountryFlag country={country} className="animate-pop h-12 w-18 rounded-md shadow-xl" />
      </div>
      <p className="mt-3 text-center font-heading text-3xl font-black">{title}</p>
      {tour.qualified && <p className="mt-1 text-center text-white/80">{tour.picked ? fill(it.inSquad, { nation }) : fill(it.notInSquad, { nation })}</p>}
      {tour.qualified && (
        <ul className="mt-4 grid gap-2">
          {tour.matches.slice(0, shown).map((m, i) => (
            <IntlRow key={i} m={m} country={country} locale={locale} t={t} delay={0} />
          ))}
          {!finished && (
            <li className="flex h-12 items-center justify-center gap-1" aria-label="…">
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-2 rounded-full bg-white/60 motion-safe:animate-[dots_1s_ease-in-out_infinite]" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </li>
          )}
        </ul>
      )}
      {finished && (
        <div className="animate-rise mt-5 text-center">
          <p className="font-heading text-2xl font-black">{tour.won ? "🏆 " : ""}{outcome}</p>
          <Button size="lg" className="mt-5 h-14 w-full bg-white text-base font-bold text-black hover:bg-white/90" onClick={onClose} autoFocus>
            {t.next}
          </Button>
        </div>
      )}
      {!finished && (
        <button type="button" className="mx-auto mt-4 block text-sm text-white/60 underline" onClick={() => setShown(tour.matches.length)}>
          {t.highlights.skip}
        </button>
      )}
    </Takeover>
  );
}
