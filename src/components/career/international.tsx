"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { type IntlBreak, type IntlMatch, MOMENT_MOVES, moveChance, type Tournament } from "@/lib/engine/international";
import type { CareerSave } from "@/lib/engine/types";
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
      {(m.stage || m.hero) && (
        <span className="flex items-center justify-between gap-2 text-[11px] font-bold tracking-wider uppercase">
          <span className="text-amber-200">{m.stage ? t.intl.stages[m.stage] : ""}</span>
          {m.hero && <span className="animate-pop rounded-full bg-amber-400 px-2 py-px text-black normal-case">🦸 {t.intl.heroBadge}</span>}
        </span>
      )}
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

type Phase = "wait" | "moment" | "spin" | "result";

/**
 * The summer tournament as a campaign: games are revealed one by one, and when
 * a game comes down to you, you choose what to do. The dice (better players
 * get better odds) decide — and the campaign goes on from there.
 */
export function TournamentTakeover({ tour, save, country, locale, t, onMove, onClose }: { tour: Tournament; save: CareerSave; country: string; locale: Locale; t: CareerDict; onMove: (index: number, moveId: string) => void; onClose: () => void }) {
  const it = t.intl;
  const nation = countryLabel(country, locale);
  const surname = save.player.name.split(" ").at(-1)!;
  const title = `${it.comps[tour.comp]} ${tour.year}`;
  const [shown, setShown] = useState(tour.qualified ? 0 : tour.matches.length);
  const [phase, setPhase] = useState<Phase>("wait");
  const total = tour.matches.length;
  const finished = shown >= total;
  const next = tour.plan?.[shown];
  const needsChoice = !finished && !!next?.moment && !tour.picks?.[shown];

  // Reveal the next game — or stop and ask when it comes down to you.
  useEffect(() => {
    if (finished || phase !== "wait") return;
    if (needsChoice) {
      const timer = setTimeout(() => setPhase("moment"), shown === 0 ? 700 : 900);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 900 : 1100);
    return () => clearTimeout(timer);
  }, [shown, finished, phase, needsChoice]);

  const heroes = tour.matches.slice(0, shown).filter((m) => m.hero);
  const outcome = !tour.qualified ? fill(it.didNotQualify, { nation }) : tour.won ? fill(it.champions, { nation }) : tour.last === "group" ? it.outGroup : tour.last === "final" ? it.outFinal : fill(it.outStage, { stage: it.stages[tour.last] });
  const pick = tour.picks?.[shown];

  return (
    <Takeover tone={!finished ? "blue" : tour.won ? "gold" : tour.qualified && tour.last !== "group" ? "good" : "bad"} label={title}>
      <p className="text-center text-xs font-bold tracking-[0.2em] text-white/60 uppercase">{it.summer}</p>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="animate-pop text-4xl" aria-hidden>
          {tour.comp === "wc" ? "🌍" : tour.comp === "euro" ? "🇪🇺" : "🌎"}
        </span>
        <CountryFlag country={country} className="animate-pop h-10 w-15 rounded-md shadow-xl" />
      </div>
      <p className="mt-2 text-center font-heading text-2xl font-black">{title}</p>
      {tour.qualified && <p className="mt-0.5 text-center text-sm text-white/80">{tour.picked ? fill(it.inSquad, { nation }) : fill(it.notInSquad, { nation })}</p>}
      {tour.qualified && (
        <ul className="mt-3 grid gap-2">
          {tour.matches.slice(0, shown).map((m, i) => (
            <IntlRow key={i} m={m} country={country} locale={locale} t={t} delay={0} />
          ))}
        </ul>
      )}

      {/* It comes down to you */}
      {next?.moment && (phase === "moment" || phase === "spin" || phase === "result") && (
        <MomentCard
          key={shown}
          index={shown}
          base={next}
          save={save}
          country={country}
          locale={locale}
          t={t}
          phase={phase}
          success={pick?.success ?? null}
          hero={!!tour.matches[shown]?.hero}
          surname={surname}
          onPick={(moveId) => {
            onMove(shown, moveId);
            setPhase("spin");
          }}
          onSpun={() => setPhase("result")}
          onContinue={() => {
            setPhase("wait");
            setShown((n) => n + 1);
          }}
        />
      )}

      {!finished && phase === "wait" && (
        <div className="flex h-12 items-center justify-center gap-1" aria-label="…">
          {[0, 1, 2].map((d) => (
            <span key={d} className="size-2 rounded-full bg-white/60 motion-safe:animate-[dots_1s_ease-in-out_infinite]" style={{ animationDelay: `${d * 0.15}s` }} />
          ))}
        </div>
      )}

      {finished && (
        <div className="animate-rise mt-4 text-center">
          <p className="font-heading text-2xl font-black">
            {tour.won ? "🏆 " : ""}
            {outcome}
          </p>
          {heroes.length > 0 && (
            <div className="mx-auto mt-3 max-w-sm rounded-xl bg-black/30 p-3 text-start">
              <p className="text-[11px] font-bold tracking-wider text-amber-200 uppercase">🗞️ {it.headlines}</p>
              <p className="mt-1 font-heading text-lg leading-snug font-black">“{fill(tour.won ? it.headlineWon : it.headlineHero, { name: surname, nation })}”</p>
            </div>
          )}
          <Button size="lg" className="mt-4 h-14 w-full bg-white text-base font-bold text-black hover:bg-white/90" onClick={onClose} autoFocus>
            {t.next}
          </Button>
        </div>
      )}
    </Takeover>
  );
}

/** One decisive moment: what's happening, your three options with their odds, then the wheel. */
function MomentCard({ index, base, save, country, locale, t, phase, success, hero, surname, onPick, onSpun, onContinue }: { index: number; base: IntlMatch; save: CareerSave; country: string; locale: Locale; t: CareerDict; phase: Phase; success: boolean | null; hero: boolean; surname: string; onPick: (moveId: string) => void; onSpun: () => void; onContinue: () => void }) {
  const it = t.intl;
  const kind = base.moment!.kind;
  const text = it.moments[kind];
  const [chosen, setChosen] = useState<string | null>(null);
  const move = MOMENT_MOVES[kind].find((m) => m.id === chosen);
  const pct = move ? Math.round(moveChance(save, move, base.opp) * 100) : 0;
  const reward = move?.reward ?? "goal";

  return (
    <div className="animate-pop mt-3 rounded-2xl border-2 border-amber-300/70 bg-black/35 p-3.5 shadow-2xl" data-moment={index}>
      <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
        <span className="rounded bg-amber-400 px-1.5 text-black tabular-nums">{base.moment!.minute}&apos;</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <CountryFlag country={country} className="h-3 w-4.5 rounded-sm" />
          <span>{it.vs}</span>
          <CountryFlag country={base.opp} className="h-3 w-4.5 rounded-sm" />
          <span className="truncate">{countryLabel(base.opp, locale)}</span>
          {base.stage && <span className="text-white/60">· {it.stages[base.stage]}</span>}
        </span>
      </div>
      <p className="mt-2 font-heading text-xl leading-snug font-black">{text.title}</p>
      <p className="text-sm text-white/80">{text.text}</p>

      {phase === "moment" && (
        <div className="mt-3 grid gap-2">
          {MOMENT_MOVES[kind].map((m, i) => {
            const c = Math.round(moveChance(save, m, base.opp) * 100);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setChosen(m.id);
                  onPick(m.id);
                }}
                className="animate-rise flex min-h-12 items-center gap-3 rounded-xl bg-white px-3 py-2 text-start font-bold text-slate-900 shadow transition active:scale-[0.98]"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="min-w-0 flex-1">{it.moves[m.id as keyof typeof it.moves]}</span>
                <span className="text-[11px] font-semibold text-slate-500">{it.rewards[m.reward]}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-black text-white tabular-nums", c >= 55 ? "bg-emerald-600" : c >= 35 ? "bg-amber-500" : "bg-rose-600")}>{c}%</span>
              </button>
            );
          })}
        </div>
      )}

      {(phase === "spin" || phase === "result") && success !== null && (
        <div className="mt-3 grid justify-items-center gap-2">
          <p className="text-sm font-bold">{it.moves[chosen as keyof typeof it.moves]}</p>
          <ChanceWheel pct={pct} success={success} onDone={onSpun} />
          {phase === "result" && (
            <>
              <p className={cn("animate-pop font-heading text-3xl font-black", success ? "text-emerald-300" : "text-rose-300")}>{success ? it.outcomes[reward] : it.outcomes.fail}</p>
              {hero && (
                <div className="animate-pop relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 p-3 text-center text-black">
                  <span aria-hidden className="absolute inset-0 motion-safe:animate-pulse bg-white/20" />
                  <p className="relative text-2xl">🦸📣🔥</p>
                  <p className="relative font-heading text-lg leading-tight font-black">{fill(it.heroTitle, { name: surname })}</p>
                  <p className="relative text-xs font-semibold">{it.heroText}</p>
                </div>
              )}
              <Button size="lg" className="mt-1 h-12 w-full bg-white font-bold text-black hover:bg-white/90" onClick={onContinue} autoFocus>
                {t.next}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** A wheel with your odds in green. The result is already decided; the wheel lands on it. */
function ChanceWheel({ pct, success, onDone }: { pct: number; success: boolean; onDone: () => void }) {
  const green = (pct / 100) * 360;
  const [target] = useState(() => 360 * 5 + (success ? 8 + Math.random() * Math.max(1, green - 16) : green + 8 + Math.random() * Math.max(1, 360 - green - 16)));
  const done = useRef(onDone);
  useEffect(() => {
    // Safety net if the transition never fires (reduced motion, background tab).
    const timer = setTimeout(() => done.current(), 2600);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div dir="ltr" className="relative size-36">
      <div className="absolute -top-1.5 left-1/2 z-10 size-0 -translate-x-1/2 border-x-[9px] border-t-[16px] border-x-transparent border-t-white drop-shadow" aria-hidden />
      <div
        className="size-full rounded-full border-4 border-white/90 shadow-lg motion-reduce:transition-none"
        style={{ background: `conic-gradient(#16a34a 0 ${green}deg, #dc2626 ${green}deg 360deg)`, transition: "transform 2.2s cubic-bezier(0.15, 0.85, 0.25, 1)" }}
        ref={(el) => {
          if (el && !el.dataset.spun) {
            el.dataset.spun = "1";
            el.style.transform = "rotate(0deg)";
            requestAnimationFrame(() => requestAnimationFrame(() => (el.style.transform = `rotate(${-target}deg)`)));
          }
        }}
        onTransitionEnd={() => done.current()}
      />
      {/* The odds stay upright while the wheel turns. */}
      <span className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="grid size-14 place-items-center rounded-full bg-black/70 font-heading text-lg font-black text-white tabular-nums">{pct}%</span>
      </span>
    </div>
  );
}
