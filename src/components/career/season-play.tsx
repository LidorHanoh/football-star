"use client";

import { FastForwardIcon, PlayIcon, SkipForwardIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { clubKit, clubManager, hash } from "@/lib/engine/people";
import type { HalfEvent } from "@/lib/engine/season";
import { resolveSetPiece } from "@/lib/engine/set-piece";
import { chooseSituation, halfSituations, type Situation } from "@/lib/engine/situations";
import type { CareerSave, InjuryKind, MatchResult, Role, World, Zone } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Crest } from "./crest";
import { Face } from "./face";
import { type CareerDict, fill, teamName } from "./helpers";
import { HighlightClip } from "./highlights";
import { SetPieceGame } from "./set-piece";
import { FAN_MOMENTS, type FanMoment, FanTakeover, NewsTakeover, SituationTakeover } from "./situations";

type Step = "pre" | "score" | "post" | "clip" | "setpiece" | "end";

/** Something that takes over the screen between matches. */
type Moment =
  | { kind: "decision"; situation: Situation }
  | { kind: "injury"; injury: InjuryKind; n: number }
  | { kind: "recovered" }
  | { kind: "fans"; moment: FanMoment }
  | { kind: "role"; up: boolean; to: Role };

/**
 * Plays the half season match by match: every score, your rating, your goals,
 * the highlights and the penalties you take — and what happens in between:
 * off-the-pitch decisions, injuries, the fans, a word from the manager.
 * One button speeds it up (highlights are skipped); decisions always wait for you.
 */
export function SeasonPlay({ before, after, events, world, t, locale, onFinish }: { before: CareerSave; after: CareerSave; events: HalfEvent[]; world: World; t: CareerDict; locale: Locale; onFinish: (save: CareerSave) => void }) {
  const [save, setSaveState] = useState(after);
  const saveRef = useRef(after);
  const setSave = (s: CareerSave) => {
    saveRef.current = s;
    setSaveState(s);
  };
  const [pos, setPos] = useState<{ i: number; step: Step; qi: number }>({ i: 0, step: "pre", qi: 0 });
  const { i, step, qi } = pos;
  const [clipIndex, setClipIndex] = useState(0);
  const [fast, setFast] = useState(false);
  const offset = before.season!.matches.length;
  const half = after.season!.halvesPlayed as 1 | 2;
  const myClub = world.clubs.find((c) => c.id === after.contract!.clubId)!;
  const myKit = clubKit(myClub);
  const matches = save.season!.matches.slice(offset);
  const m = matches[i];
  const done = matches.slice(0, i);
  const opp = m ? world.clubs.find((c) => c.id === m.opponentId) : undefined;
  const oppKit = opp ? clubKit(opp) : myKit;
  const name = before.player.name;
  const coach = clubManager(myClub, world.leagues.find((l) => l.key === myClub.leagueKey)?.country === "Israel");

  // What happens in between matches is fixed for the half (seeded, so a reload is the same).
  const [plan] = useState(() => {
    const ms = after.season!.matches.slice(offset);
    // When each decision comes up (before which match of this half).
    const decisions = halfSituations(before, half).map((d) => ({ ...d, index: Math.min(ms.length - 1, Math.floor(d.at * ms.length)) }));
    // Fan moments: after a great game (max two per half).
    const fanAfter = new Map<number, FanMoment>();
    ms.forEach((x, k) => {
      if (fanAfter.size >= 2 || !x.minutes || !x.rating) return;
      const h = hash(`${after.id}:${half}:${k}`);
      if ((x.rating >= 8 || x.goals >= 2) && h % 100 < 65) fanAfter.set(k, FAN_MOMENTS[h % FAN_MOMENTS.length]);
    });
    return { decisions, fanAfter };
  });
  const { decisions, fanAfter } = plan;

  const queue = (k: number, which: "pre" | "post"): Moment[] => {
    const x = matches[k];
    if (!x) return [];
    const q: Moment[] = [];
    if (which === "pre") {
      for (const d of decisions) if (d.index === k) q.push({ kind: "decision", situation: d.situation });
      if (k > 0 && matches[k - 1].out && !x.out) q.push({ kind: "recovered" });
    } else {
      if (x.injured) {
        let n = 0;
        for (let j = k + 1; j < matches.length && matches[j].out; j++) n++;
        if (k + 1 + n >= matches.length) n += after.player.injury?.matches ?? 0;
        q.push({ kind: "injury", injury: x.injured, n: Math.max(1, n) });
      }
      const fan = fanAfter.get(k);
      if (fan && !fast) q.push({ kind: "fans", moment: fan });
    }
    return q;
  };
  const endQueue: Moment[] = events.filter((e) => e.key === "roleDown" || e.key === "roleUp").map((e) => ({ kind: "role", up: e.key === "roleUp", to: e.params!.to as Role }));
  const clipsOf = (k: number) => {
    const x = matches[k];
    return x ? save.season!.highlights.filter((h) => h.half === half && h.round === x.round && h.opponentId === x.opponentId) : [];
  };

  /** Move to a point in the flow, skipping past anything with nothing to show. */
  function go(k: number, st: Step, q = 0) {
    for (;;) {
      if (st === "pre" && !queue(k, "pre")[q]) st = "score";
      else if (st === "post" && !queue(k, "post")[q]) {
        q = 0;
        const x = matches[k];
        if (clipsOf(k).length && !fast) {
          setClipIndex(0);
          st = "clip";
        } else if (x.setPiece && !x.setPiece.result) st = "setpiece";
        else if (k + 1 < matches.length) {
          k++;
          st = "pre";
        } else st = "end";
      } else if (st === "end" && !endQueue[q]) {
        onFinish(saveRef.current);
        return;
      } else break;
    }
    setPos({ i: k, step: st, qi: q });
  }
  const clips = clipsOf(i);
  const current: Moment | undefined = step === "pre" || step === "post" ? queue(i, step)[qi] : step === "end" ? endQueue[qi] : undefined;

  const next = () => (i + 1 < matches.length ? go(i + 1, "pre") : go(i, "end"));

  function afterClip() {
    if (clipIndex + 1 < clips.length && !fast) setClipIndex(clipIndex + 1);
    else if (m!.setPiece && !m!.setPiece.result) go(i, "setpiece");
    else next();
  }

  /** Close the moment on screen and move on. */
  const closeMoment = () => go(i, step, qi + 1);

  // The first match may have nothing before it.
  useEffect(() => {
    if (step === "pre" && !current) {
      const timer = setTimeout(() => go(i, "pre"), 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount / position change
  }, [i, step, qi]);

  // The score shows for a moment, then what happened after the match.
  useEffect(() => {
    if (!m || step !== "score") return;
    const timer = setTimeout(() => go(i, "post"), fast ? 380 : 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when the match or speed changes
  }, [i, step, fast]);

  const level = before.contract!.level;
  const age = before.player.age;
  const myName = teamName(world, myClub.id, locale, level, age);
  const oppName = opp ? teamName(world, opp.id, locale, level, age) : "";
  const shownMatches = matches.slice(0, i + 1);
  const goals = shownMatches.reduce((s, x) => s + x.goals, 0);
  const assists = shownMatches.reduce((s, x) => s + x.assists, 0);
  const rated = shownMatches.filter((x) => x.rating);
  const avg = rated.length ? (rated.reduce((s, x) => s + x.rating!, 0) / rated.length).toFixed(2) : "–";

  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-4 py-4 md:grid-cols-[1fr_15rem]">
      {/* Full-screen moments between matches */}
      {current?.kind === "decision" && (
        <SituationTakeover
          save={save}
          situation={current.situation}
          t={t}
          onChoose={(opt) => {
            setSave(chooseSituation(saveRef.current, half, current.situation.id, opt));
            closeMoment();
          }}
        />
      )}
      {current?.kind === "injury" && <NewsTakeover icon="🩹" tone="bad" title={fill(t.injury.title, { kind: t.injury.kinds[current.injury] })} text={fill(t.injury.text, { n: current.n })} t={t} onClose={closeMoment} />}
      {current?.kind === "recovered" && <NewsTakeover icon="💪" tone="good" title={t.injury.backTitle} text={t.injury.backText} t={t} onClose={closeMoment} />}
      {current?.kind === "fans" && (
        <FanTakeover
          moment={current.moment}
          name={name}
          number={before.player.kit}
          kit={myKit}
          t={t}
          onClose={() => {
            const s = saveRef.current;
            setSave({ ...s, bars: { ...s.bars, fans: Math.min(100, s.bars.fans + 3), morale: Math.min(100, s.bars.morale + 2) } });
            closeMoment();
          }}
        />
      )}
      {current?.kind === "role" && (
        <NewsTakeover
          tone={current.up ? "good" : "bad"}
          face={<Face seed={coach.face} kind="manager" kit={myKit} className="size-full" />}
          title={`${t.seasonEnd.manager} · ${coach.name}`}
          text={fill(current.up ? t.roleNews.up : t.roleNews.down, { role: t.roles[current.to] })}
          t={t}
          onClose={closeMoment}
        />
      )}

      <div className="grid content-start gap-4">
        {/* Progress */}
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">{fill(t.play.matchOf, { n: Math.min(i + 1, matches.length), total: matches.length })}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((i + (step === "score" || step === "pre" ? 0.5 : 1)) / matches.length) * 100}%` }} />
          </div>
        </div>

        {m && step === "clip" && clips[clipIndex] && (
          <div className="grid gap-2">
            <HighlightClip
              key={clips[clipIndex].id}
              h={clips[clipIndex]}
              isKeeper={before.player.position === "GK"}
              myKit={myKit}
              oppKit={oppKit}
              playerNumber={before.player.kit}
              label={t.highlights.kinds[clips[clipIndex].kind]}
              caption={fill(t.highlights.lines[clips[clipIndex].kind][clips[clipIndex].seed % t.highlights.lines[clips[clipIndex].kind].length], { name })}
              scoreLine={(sc) => (
                <span className="flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-bold text-white sm:text-sm">
                  <span className="rounded bg-amber-400 px-1.5 text-black tabular-nums">{clips[clipIndex].minute}&apos;</span>
                  <span className="max-w-24 truncate sm:max-w-40">{myName}</span>
                  <span className="tabular-nums">
                    {sc[0]}–{sc[1]}
                  </span>
                  <span className="max-w-24 truncate sm:max-w-40">{oppName}</span>
                </span>
              )}
              onEnd={afterClip}
            />
            <Button variant="outline" className="justify-self-end" onClick={afterClip}>
              <SkipForwardIcon aria-hidden /> {t.highlights.skip}
            </Button>
          </div>
        )}

        {m && step === "setpiece" && m.setPiece && (
          <SetPieceGame
            key={`sp${i}`}
            sp={m.setPiece}
            t={t}
            myKit={myKit}
            oppKit={oppKit}
            minute={m.setPiece.minute}
            playerNumber={before.player.kit}
            playerName={before.player.name}
            onShoot={(zone: Zone, quality: number) => {
              const resolved = resolveSetPiece(saveRef.current, offset + i, zone, quality);
              setSave(resolved);
              return resolved.season!.matches[offset + i].setPiece!.result!;
            }}
            onDone={next}
          />
        )}

        {m && (step === "score" || step === "pre" || step === "post") && <MatchCard key={`m${i}`} m={m} myName={myName} oppName={oppName} myClub={myClub} opp={opp!} t={t} big />}

        {/* Results so far */}
        {done.length > 0 && (
          <ol className="grid gap-1.5">
            {[...done].reverse().map((x, k) => {
              const o = world.clubs.find((c) => c.id === x.opponentId)!;
              return <MatchCard key={done.length - k} m={x} myName={myName} oppName={teamName(world, o.id, locale, level, age)} myClub={myClub} opp={o} t={t} />;
            })}
          </ol>
        )}
      </div>

      {/* Side: the one speed button + live numbers (below on phones it sits on top) */}
      <aside className="order-first grid content-start gap-3 md:sticky md:top-16 md:order-none md:self-start">
        <Button size="lg" variant={fast ? "default" : "outline"} className="h-12 text-base" onClick={() => setFast(!fast)} aria-pressed={fast}>
          {fast ? <PlayIcon aria-hidden /> : <FastForwardIcon aria-hidden />}
          {fast ? t.play.normal : t.play.faster}
        </Button>
        <dl className="grid grid-cols-3 gap-2 text-center md:grid-cols-1">
          {[
            [t.dashboard.goals, goals],
            [t.dashboard.assists, assists],
            [t.dashboard.avg, avg],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border bg-card p-2">
              <dd key={String(value)} className="animate-pop font-heading text-2xl font-black tabular-nums">
                {value}
              </dd>
              <dt className="text-xs text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      </aside>
    </section>
  );
}

function MatchCard({ m, myName, oppName, myClub, opp, t, big }: { m: MatchResult; myName: string; oppName: string; myClub: { id: string; name: { en: string } }; opp: { id: string; name: { en: string } }; t: CareerDict; big?: boolean }) {
  const res = m.goalsFor > m.goalsAgainst ? "w" : m.goalsFor === m.goalsAgainst ? "d" : "l";
  const [hName, aName, hClub, aClub, hG, aG] = m.home ? [myName, oppName, myClub, opp, m.goalsFor, m.goalsAgainst] : [oppName, myName, opp, myClub, m.goalsAgainst, m.goalsFor];
  const sp = m.setPiece?.result;
  return (
    <li
      className={cn(
        "flex list-none items-center gap-2 rounded-xl border bg-card",
        big ? "animate-rise flex-col gap-3 p-5 shadow-lg" : "px-3 py-2 text-sm",
        !big && (res === "w" ? "border-s-4 border-s-emerald-500" : res === "d" ? "border-s-4 border-s-slate-400" : "border-s-4 border-s-rose-500"),
        m.out && "opacity-80",
      )}
    >
      <div className={cn("flex w-full items-center gap-2", big && "justify-center gap-4")}>
        <span className={cn("flex min-w-0 flex-1 items-center justify-end gap-2 text-end", m.home && "font-bold")}>
          <span className="truncate">{hName}</span>
          <Crest club={hClub} className={big ? "size-12" : "size-6"} />
        </span>
        <span className={cn("shrink-0 rounded-lg bg-foreground px-2 font-heading font-black text-background tabular-nums", big ? "animate-pop px-4 py-1 text-4xl" : "text-base")} dir="ltr" style={big ? { animationDelay: "0.35s" } : undefined}>
          {hG}–{aG}
        </span>
        <span className={cn("flex min-w-0 flex-1 items-center gap-2", !m.home && "font-bold")}>
          <Crest club={aClub} className={big ? "size-12" : "size-6"} />
          <span className="truncate">{aName}</span>
        </span>
      </div>
      <div className={cn("flex shrink-0 items-center gap-2 text-xs", big ? "text-sm" : "w-auto")}>
        {m.minutes ? (
          <>
            <span className={cn("rounded px-1.5 py-0.5 font-bold text-white tabular-nums", m.rating! >= 7.5 ? "bg-emerald-600" : m.rating! >= 6.5 ? "bg-amber-500" : "bg-rose-600")}>{m.rating}</span>
            {m.goals > 0 && <span>⚽×{m.goals}</span>}
            {m.assists > 0 && <span>🅰×{m.assists}</span>}
            {m.injured && <span className="font-semibold text-rose-600">🩹 {t.injury.kinds[m.injured]}</span>}
            {sp && <span>{sp.outcome === "goal" ? (m.setPiece!.kind === "penaltySave" ? "🥅✗" : "🎯✓") : m.setPiece!.kind === "penaltySave" ? "🧤✓" : "🎯✗"}</span>}
            {big && <span className="text-muted-foreground">{m.started ? t.play.started : fill(t.play.subOn, { min: m.minutes })}</span>}
          </>
        ) : m.out ? (
          <span className={cn("rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-700 dark:text-rose-300", big && "px-3 py-1 text-base")}>🩹 {t.injury.injured}</span>
        ) : (
          <span className="text-muted-foreground">{t.dashboard.didNotPlay}</span>
        )}
      </div>
    </li>
  );
}
