"use client";

import { FastForwardIcon, PlayIcon, SkipForwardIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { afterLeaguePhase, CUP_STAGES, EURO_KO, euroPoints, wonTie } from "@/lib/engine/competitions";
import { clubKit, clubManager, hash } from "@/lib/engine/people";
import { Rng } from "@/lib/engine/rng";
import type { HalfEvent } from "@/lib/engine/season";
import { resolveSetPiece } from "@/lib/engine/set-piece";
import { chooseSituation, halfSituations, type Situation } from "@/lib/engine/situations";
import { makeQuestion, triviaSlots, type TriviaQuestion } from "@/lib/engine/trivia";
import type { CareerSave, EuroComp, InjuryKind, KnockoutStage, MatchResult, Role, Trophy, World, WorldClub, Zone } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Celebration } from "./celebration";
import { Crest } from "./crest";
import { Face } from "./face";
import { type CareerDict, clubName, fill, teamName } from "./helpers";
import { HighlightClip } from "./highlights";
import { SetPieceGame } from "./set-piece";
import { DrawTakeover, FAN_MOMENTS, type FanMoment, FanTakeover, NewsTakeover, SituationTakeover, type Toast, Toasts } from "./situations";
import { TriviaTakeover, useTriviaData } from "./trivia";

type Step = "pre" | "score" | "post" | "clip" | "setpiece" | "end";

/** Something that takes over the screen between matches. */
type Moment =
  | { kind: "decision"; situation: Situation }
  | { kind: "draw"; comp: EuroComp; clubs: string[] }
  | { kind: "trivia"; q: TriviaQuestion; slot: number }
  | { kind: "injury"; injury: InjuryKind; n: number }
  | { kind: "recovered" }
  | { kind: "fans"; moment: FanMoment }
  | { kind: "trophy"; trophy: Trophy; subtitle: string }
  | { kind: "news"; icon: string; title: string; text: string; good: boolean }
  | { kind: "role"; up: boolean; to: Role };

const STAGE_ICON: Record<KnockoutStage, string> = { po: "🎟️", r16: "🎯", qf: "🔥", sf: "⚡", final: "🏆" };

/**
 * Plays the half season match by match — a live ticker for every game, your
 * goals, highlights and penalties — and everything in between: decisions,
 * trivia, injuries, the fans, cup runs and European nights, the manager.
 * One button speeds it up; decisions and trivia always wait for you.
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const offset = before.season!.matches.length;
  const half = after.season!.halvesPlayed as 1 | 2;
  const year = after.season!.year;
  const myClub = world.clubs.find((c) => c.id === after.contract!.clubId)!;
  const myKit = clubKit(myClub);
  const country = world.leagues.find((l) => l.key === myClub.leagueKey)?.country ?? "";
  const matches = save.season!.matches.slice(offset);
  const prior = before.season!.matches;
  const m = matches[i];
  const done = matches.slice(0, i);
  const opp = m ? world.clubs.find((c) => c.id === m.opponentId) : undefined;
  const oppKit = opp ? clubKit(opp) : myKit;
  const name = before.player.name;
  const surname = name.split(" ").at(-1)!;
  const coach = clubManager(myClub, country === "Israel");
  const level = before.contract!.level;
  const age = before.player.age;
  const myName = teamName(world, myClub.id, locale, level, age);
  const nameOf = (id: string) => teamName(world, id, locale, level, age);
  const cupName = (t.cupNames as Record<string, string>)[country] ?? t.comps.cup;
  const compName = (x: MatchResult) => (x.comp === "cup" ? cupName : x.comp === "cl" || x.comp === "el" ? t.comps[x.comp] : null);
  const triviaOn = !!before.trivia?.topics.length;
  const trivia = useTriviaData(triviaOn);

  // What happens in between matches is fixed for the half (seeded, so a reload is the same).
  const [plan] = useState(() => {
    const ms = after.season!.matches.slice(offset);
    const at = (f: number) => Math.min(ms.length - 1, Math.floor(f * ms.length));
    const decisions = halfSituations(before, half, { clubCountry: country }).map((d) => ({ ...d, index: at(d.at) }));
    // The fans only go all out after a huge game (one moment a half at most).
    const fanAfter = new Map<number, FanMoment>();
    ms.forEach((x, k) => {
      if (fanAfter.size >= 1 || !x.minutes || !x.rating) return;
      const h = hash(`${after.id}:${half}:${k}`);
      if ((x.rating >= 8.6 || x.goals >= 3 || (x.goals >= 2 && x.rating >= 8.2)) && h % 100 < 80) fanAfter.set(k, FAN_MOMENTS[h % FAN_MOMENTS.length]);
    });
    // Trivia: two a half, not on the same stop as a decision.
    const taken = new Set(decisions.map((d) => d.index));
    const triviaAt = triviaSlots(after.id, year, half).map((f) => {
      let k = at(f);
      while (taken.has(k) && k < ms.length - 1) k++;
      taken.add(k);
      return k;
    });
    // The European draw comes before your first European night.
    const firstEuro = ms.findIndex((x) => x.comp === "cl" || x.comp === "el");
    const draw = after.season!.europe && !prior.some((x) => x.comp === "cl" || x.comp === "el") && firstEuro >= 0 ? { index: firstEuro, comp: after.season!.europe.comp, clubs: after.season!.europe.draw } : null;
    return { decisions, fanAfter, triviaAt, draw };
  });
  const { decisions, fanAfter, triviaAt, draw } = plan;

  const questions = useMemo(() => {
    if (!trivia || !before.trivia) return [];
    const seen = [...before.trivia.seen];
    return triviaAt.map((_, j) => {
      const q = makeQuestion(trivia, before.trivia!.topics, `${before.id}:${year}:${half}:${j}`, seen);
      if (q) seen.push(q.id);
      return q;
    });
  }, [trivia, before, triviaAt, year, half]);

  /** All competition matches up to and including match k of this half. */
  const upTo = (k: number) => [...prior, ...matches.slice(0, k + 1)];

  /** News after a cup / European match: through, out, a trophy. */
  function compMoments(k: number): Moment[] {
    const x = matches[k];
    if (!x.comp || x.comp === "league") return [];
    const comp = compName(x)!;
    if (x.stage) {
      const won = wonTie(x);
      if (won && x.stage === "final") return [{ kind: "trophy", trophy: x.comp as Trophy, subtitle: `${comp} ${year}/${String((year + 1) % 100).padStart(2, "0")}` }];
      if (!won) return [{ kind: "news", icon: "💔", good: false, title: fill(t.compNews.outTitle, { comp }), text: fill(t.compNews.outText, { comp, stage: t.stages[x.stage], club: nameOf(x.opponentId) }) }];
      return [];
    }
    // The last league-phase night: through or out?
    if ((x.comp === "cl" || x.comp === "el") && upTo(k).filter((y) => y.comp === x.comp && !y.stage).length === 6) {
      const pts = euroPoints(upTo(k));
      const next = afterLeaguePhase(pts);
      return [next ? { kind: "news", icon: next === "r16" ? "🌟" : "🎟️", good: true, title: fill(t.compNews.throughTitle, { comp }), text: fill(next === "r16" ? t.compNews.toR16 : t.compNews.toPo, { pts }) } : { kind: "news", icon: "💔", good: false, title: fill(t.compNews.outTitle, { comp }), text: fill(t.compNews.leagueOut, { pts }) }];
    }
    return [];
  }

  const queue = (k: number, which: "pre" | "post"): Moment[] => {
    const x = matches[k];
    if (!x) return [];
    const q: Moment[] = [];
    if (which === "pre") {
      for (const d of decisions) if (d.index === k) q.push({ kind: "decision", situation: d.situation });
      triviaAt.forEach((at, j) => {
        if (at === k && questions[j]) q.push({ kind: "trivia", q: questions[j]!, slot: j });
      });
      if (draw && draw.index === k) q.push({ kind: "draw", comp: draw.comp, clubs: draw.clubs });
      if (k > 0 && matches[k - 1].out && !x.out) q.push({ kind: "recovered" });
    } else {
      if (x.injured) {
        let n = 0;
        for (let j = k + 1; j < matches.length && matches[j].out; j++) n++;
        if (k + 1 + n >= matches.length) n += after.player.injury?.matches ?? 0;
        q.push({ kind: "injury", injury: x.injured, n: Math.max(1, n) });
      }
      q.push(...compMoments(k));
      const fan = fanAfter.get(k);
      if (fan && !fast) q.push({ kind: "fans", moment: fan });
    }
    return q;
  };
  const endQueue: Moment[] = [
    ...events.filter((e) => e.key === "roleDown" || e.key === "roleUp").map((e): Moment => ({ kind: "role", up: e.key === "roleUp", to: e.params!.to as Role })),
    ...events.filter((e) => e.key === "qualifiedCl" || e.key === "qualifiedEl").map((e): Moment => ({ kind: "news", icon: e.key === "qualifiedCl" ? "⭐" : "🟠", good: true, title: t.compNews.qualifiedTitle, text: fill(t.compNews.qualifiedText, { comp: t.comps[e.key === "qualifiedCl" ? "cl" : "el"] }) })),
  ];
  const clipsOf = (k: number) => {
    const x = matches[k];
    return x ? save.season!.highlights.filter((h) => h.half === half && h.round === x.round && h.opponentId === x.opponentId) : [];
  };

  function toast(items: Omit<Toast, "id">[]) {
    if (!items.length) return;
    const withIds = items.map((x, j) => ({ ...x, id: `${Date.now()}-${j}` }));
    setToasts((all) => [...all, ...withIds].slice(-3));
    setTimeout(() => setToasts((all) => all.filter((x) => !withIds.includes(x))), 2700);
  }

  /** Little notifications at kick-off: a knockout draw, a European night. */
  function kickoffToasts(k: number) {
    const x = matches[k];
    if (!x?.comp || x.comp === "league") return;
    const comp = compName(x)!;
    if (x.stage) toast([{ icon: STAGE_ICON[x.stage], tone: x.comp === "cl" ? "blue" : "gold", text: fill(t.toasts.koDraw, { comp, stage: t.stages[x.stage], club: nameOf(x.opponentId) }) }]);
    else toast([{ icon: x.comp === "cl" ? "⭐" : "🟠", tone: "blue", text: fill(t.toasts.euroNight, { comp, club: nameOf(x.opponentId) }) }]);
  }

  /** After the final whistle: first goal of the season, a brace, a milestone, through to the next round… */
  function fullTimeToasts(k: number) {
    const x = matches[k];
    const out: Omit<Toast, "id">[] = [];
    const seasonBefore = [...prior, ...matches.slice(0, k)].reduce((s, y) => s + y.goals, 0);
    const careerBefore = before.history.reduce((s, h) => s + h.goals, 0) + seasonBefore;
    if (x.goals >= 3) out.push({ icon: "🎩", text: fill(t.toasts.hatTrick, { name: surname }) });
    else if (x.goals === 2) out.push({ icon: "✌️", text: fill(t.toasts.brace, { name: surname }) });
    if (x.goals && seasonBefore === 0) out.push({ icon: "⚽", tone: "green", text: t.toasts.firstGoal });
    for (const n of [10, 20, 30]) if (seasonBefore < n && seasonBefore + x.goals >= n) out.push({ icon: "🔥", text: fill(t.toasts.seasonGoals, { n }) });
    for (const n of [25, 50, 100, 150, 200, 300]) if (careerBefore < n && careerBefore + x.goals >= n) out.push({ icon: "🐐", text: fill(t.toasts.careerGoals, { n }) });
    if (x.minutes && !before.history.length && !prior.some((y) => y.minutes) && !matches.slice(0, k).some((y) => y.minutes) && level === "first") out.push({ icon: "🌟", tone: "green", text: t.toasts.debut });
    if (x.stage && wonTie(x) && x.stage !== "final") {
      const list = x.comp === "cup" ? CUP_STAGES : EURO_KO;
      const nextStage = list[list.indexOf(x.stage) + 1];
      if (nextStage) out.push({ icon: "✅", tone: "green", text: fill(x.pens === "won" ? t.toasts.throughPens : t.toasts.through, { comp: compName(x)!, stage: t.stages[nextStage] }) });
    }
    toast(out);
  }

  /** Move to a point in the flow, skipping past anything with nothing to show. */
  function go(k: number, st: Step, q = 0) {
    for (;;) {
      if (st === "pre" && !queue(k, "pre")[q]) {
        st = "score";
        kickoffToasts(k);
      } else if (st === "post" && !queue(k, "post")[q]) {
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

  const shownMatches = matches.slice(0, i + (step === "pre" || step === "score" ? 0 : 1));
  const goals = shownMatches.reduce((s, x) => s + x.goals, 0);
  const assists = shownMatches.reduce((s, x) => s + x.assists, 0);
  const rated = shownMatches.filter((x) => x.rating);
  const avg = rated.length ? (rated.reduce((s, x) => s + x.rating!, 0) / rated.length).toFixed(2) : "–";

  return (
    <section className="mx-auto max-w-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Toasts items={toasts} />

      {/* Full-screen moments between matches */}
      {current?.kind === "decision" && (
        <SituationTakeover
          key={current.situation.id}
          save={save}
          situation={current.situation}
          t={t}
          kit={myKit}
          coach={coach}
          onChoose={(opt) => {
            setSave(chooseSituation(saveRef.current, half, current.situation.id, opt));
            closeMoment();
          }}
        />
      )}
      {current?.kind === "trivia" && trivia && (
        <TriviaTakeover
          key={current.q.id}
          data={trivia}
          q={current.q}
          t={t}
          locale={locale}
          onDone={(right) => {
            const s = saveRef.current;
            const tv = s.trivia ?? { topics: [], seen: [], right: 0, asked: 0 };
            setSave({
              ...s,
              trivia: { ...tv, seen: [...tv.seen, current.q.id].slice(-400), asked: tv.asked + 1, right: tv.right + (right ? 1 : 0) },
              player: right ? { ...s.player, trainingPoints: s.player.trainingPoints + 1 } : s.player,
              season: { ...s.season!, trivia: { ...s.season!.trivia, [`${half}:${current.slot}`]: right } },
            });
            closeMoment();
          }}
        />
      )}
      {current?.kind === "draw" && <DrawTakeover comp={current.comp} clubs={current.clubs.map((id) => world.clubs.find((c) => c.id === id)!).filter(Boolean)} names={current.clubs.map((id) => clubName(world, id, locale))} t={t} onClose={closeMoment} />}
      {current?.kind === "injury" && <NewsTakeover icon="🩹" tone="bad" title={fill(t.injury.title, { kind: t.injury.kinds[current.injury] })} text={fill(t.injury.text, { n: current.n })} t={t} onClose={closeMoment} />}
      {current?.kind === "recovered" && <NewsTakeover icon="💪" tone="good" title={t.injury.backTitle} text={t.injury.backText} t={t} onClose={closeMoment} />}
      {current?.kind === "news" && <NewsTakeover icon={current.icon} tone={current.good ? "good" : "bad"} title={current.title} text={current.text} t={t} onClose={closeMoment} />}
      {current?.kind === "trophy" && <Celebration trophies={[current.trophy]} t={t} subtitle={current.subtitle} onClose={closeMoment} />}
      {current?.kind === "fans" && (
        <FanTakeover
          moment={current.moment}
          name={name}
          number={before.player.kit}
          kit={myKit}
          club={clubName(world, myClub.id, locale)}
          t={t}
          onClose={() => {
            const s = saveRef.current;
            setSave({ ...s, bars: { ...s.bars, fans: Math.min(100, s.bars.fans + 4) } });
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

      {/* Top bar: progress, your numbers, the speed button — always in reach */}
      <div className="sticky top-14 z-30 border-b bg-background/90 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span>{fill(t.play.matchOf, { n: Math.min(i + 1, matches.length), total: matches.length })}</span>
              <span className="flex gap-2.5 tabular-nums">
                <span key={`g${goals}`} className="animate-pop">
                  ⚽ {goals}
                </span>
                <span key={`a${assists}`} className="animate-pop">
                  🅰 {assists}
                </span>
                <span>★ {avg}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((i + (step === "score" || step === "pre" ? 0.5 : 1)) / matches.length) * 100}%` }} />
            </div>
          </div>
          <Button size="sm" variant={fast ? "default" : "outline"} className="h-10 shrink-0 px-3" onClick={() => setFast(!fast)} aria-pressed={fast} aria-label={fast ? t.play.normal : t.play.faster}>
            {fast ? <PlayIcon aria-hidden /> : <FastForwardIcon aria-hidden />}
            <span className="hidden sm:inline">{fast ? t.play.normal : t.play.faster}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 px-4 pt-4">
        {m && step === "clip" && clips[clipIndex] && (
          <div className="-mx-4 grid gap-2 sm:mx-0">
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
                  <span className="max-w-24 truncate sm:max-w-40">{opp ? nameOf(opp.id) : ""}</span>
                </span>
              )}
              onEnd={afterClip}
            />
            <Button size="lg" variant="outline" className="mx-4 h-12 sm:mx-0 sm:justify-self-end" onClick={afterClip}>
              <SkipForwardIcon aria-hidden /> {t.highlights.skip}
            </Button>
          </div>
        )}

        {m && step === "setpiece" && m.setPiece && (
          <div className="-mx-4 sm:mx-0">
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
          </div>
        )}

        {m && opp && (step === "score" || step === "pre") && (
          <LiveMatch
            key={`live${i}`}
            m={m}
            myClub={myClub}
            opp={opp}
            myName={myName}
            oppName={nameOf(opp.id)}
            comp={compName(m)}
            stage={m.stage ? t.stages[m.stage] : null}
            surname={surname}
            seed={hash(`${after.id}:${half}:${i}`)}
            goalMinutes={save.season!.highlights.filter((h) => h.half === half && h.round === m.round && h.opponentId === m.opponentId && h.kind === "goal").map((h) => h.minute)}
            fast={fast}
            running={step === "score"}
            t={t}
            onDone={() => {
              fullTimeToasts(i);
              go(i, "post");
            }}
          />
        )}
        {m && opp && step === "post" && <MatchCard m={m} myName={myName} oppName={nameOf(opp.id)} myClub={myClub} opp={opp} comp={compName(m)} t={t} big />}

        {/* Results so far */}
        {done.length > 0 && (
          <ol className="grid gap-1.5">
            {[...done].reverse().map((x, k) => {
              const o = world.clubs.find((c) => c.id === x.opponentId)!;
              return <MatchCard key={done.length - k} m={x} myName={myName} oppName={nameOf(o.id)} myClub={myClub} opp={o} comp={compName(x)} t={t} />;
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

/**
 * The match, live: the clock runs to 90', goals pop in at their minute
 * (yours with your name), then your rating. A few seconds; faster when sped up.
 */
function LiveMatch({ m, myClub, opp, myName, oppName, comp, stage, surname, seed, goalMinutes, fast, running, t, onDone }: { m: MatchResult; myClub: WorldClub; opp: WorldClub; myName: string; oppName: string; comp: string | null; stage: string | null; surname: string; seed: number; goalMinutes: number[]; fast: boolean; running: boolean; t: CareerDict; onDone: () => void }) {
  const [minute, setMinute] = useState(0);
  const [finished, setFinished] = useState(false);
  // When the goals go in (seeded): yours at your highlight minutes, the rest spread out.
  const timeline = useMemo(() => {
    const rng = new Rng(seed);
    const r = () => rng.next();
    const mine = [...goalMinutes].slice(0, m.goals);
    while (mine.length < m.goals) mine.push(1 + Math.floor(r() * 89));
    const ours = mine.map((min) => ({ min, us: true, me: true }));
    while (ours.length < m.goalsFor) ours.push({ min: 1 + Math.floor(r() * 89), us: true, me: false });
    const theirs = Array.from({ length: m.goalsAgainst }, () => ({ min: 1 + Math.floor(r() * 89), us: false, me: false }));
    return [...ours, ...theirs].sort((a, b) => a.min - b.min);
  }, [seed, goalMinutes, m.goals, m.goalsFor, m.goalsAgainst]);

  useEffect(() => {
    if (!running) return;
    if (finished) {
      const timer = setTimeout(onDone, fast ? 250 : 1100);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(
      () => {
        if (minute >= 90) setFinished(true);
        else setMinute((x) => Math.min(90, x + (fast ? 3 : 1)));
      },
      fast ? 8 : 34,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a clock: re-run on every tick
  }, [minute, running, finished, fast]);

  const scored = timeline.filter((g) => g.min <= minute);
  const gf = scored.filter((g) => g.us).length;
  const ga = scored.length - gf;
  const last = scored.at(-1);
  const flash = last && minute - last.min < 6 ? last : null;
  const [hName, aName, hClub, aClub, hG, aG] = m.home ? [myName, oppName, myClub, opp, gf, ga] : [oppName, myName, opp, myClub, ga, gf];
  const res = m.goalsFor > m.goalsAgainst ? "w" : m.goalsFor === m.goalsAgainst ? "d" : "l";

  return (
    <div
      className={cn(
        "animate-rise relative overflow-hidden rounded-3xl p-5 text-white shadow-xl",
        m.comp === "cl" ? "bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950" : m.comp === "el" ? "bg-gradient-to-br from-orange-800 via-stone-900 to-stone-950" : m.comp === "cup" ? "bg-gradient-to-br from-amber-700 via-stone-900 to-stone-950" : "bg-gradient-to-br from-emerald-800 via-slate-900 to-slate-950",
      )}
    >
      {/* pitch stripes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ background: "repeating-linear-gradient(90deg, #fff 0 24px, transparent 24px 48px)" }} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs font-bold text-white/70">
          <span className="truncate">{comp ? `${comp}${stage ? ` · ${stage}` : ""}` : t.comps.league}</span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 tabular-nums", finished ? "bg-white/15" : "bg-rose-600 text-white")}>{finished ? t.play.fullTime : `${minute}'`}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <Crest club={hClub} className="size-14 sm:size-16" />
            <span className={cn("line-clamp-2 text-sm leading-tight", m.home && "font-bold")}>{hName}</span>
          </div>
          <div className="flex flex-col items-center">
            {/* Follows the page direction, so each number sits next to its team. */}
            <span key={`${hG}-${aG}`} className="animate-pop flex gap-1.5 font-heading text-5xl font-black tabular-nums">
              <span>{hG}</span>
              <span>–</span>
              <span>{aG}</span>
            </span>
            {finished && m.pens && <span className="mt-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">{m.pens === "won" ? t.play.pensWon : t.play.pensLost}</span>}
          </div>
          <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <Crest club={aClub} className="size-14 sm:size-16" />
            <span className={cn("line-clamp-2 text-sm leading-tight", !m.home && "font-bold")}>{aName}</span>
          </div>
        </div>
        {/* Goal flash, then your rating */}
        <div className="mt-3 flex min-h-9 items-center justify-center">
          {flash && !finished && (
            <span key={`${flash.min}${flash.us}`} className={cn("rounded-full px-4 py-1.5 font-heading text-lg font-black motion-safe:animate-[goal-flash_1.2s_ease-out_both]", flash.us ? "bg-emerald-500" : "bg-rose-600")}>
              {flash.me ? `⚽ ${t.play.goal} ${surname}!` : flash.us ? `⚽ ${t.play.goal}!` : `😖 ${t.play.conceded}`}
            </span>
          )}
          {finished && (
            <span className="animate-pop flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
              {m.out ? (
                <span className="rounded-full bg-rose-500/30 px-3 py-1">🩹 {t.injury.injured}</span>
              ) : m.minutes ? (
                <>
                  <span className={cn("rounded-lg px-2 py-0.5 text-base text-white tabular-nums", m.rating! >= 7.5 ? "bg-emerald-500" : m.rating! >= 6.5 ? "bg-amber-500" : "bg-rose-600")}>{m.rating}</span>
                  <span className="text-white/80">{m.started ? t.play.started : fill(t.play.subOn, { min: m.minutes })}</span>
                </>
              ) : (
                <span className="text-white/70">{t.dashboard.didNotPlay}</span>
              )}
              <span className={cn("rounded px-1.5 text-xs", res === "w" ? "bg-emerald-500" : res === "d" ? "bg-slate-500" : "bg-rose-600")}>{t.play.result[res]}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ m, myName, oppName, myClub, opp, comp, t, big }: { m: MatchResult; myName: string; oppName: string; myClub: WorldClub; opp: WorldClub; comp: string | null; t: CareerDict; big?: boolean }) {
  const res = m.goalsFor > m.goalsAgainst ? "w" : m.goalsFor === m.goalsAgainst ? "d" : "l";
  const [hName, aName, hClub, aClub, hG, aG] = m.home ? [myName, oppName, myClub, opp, m.goalsFor, m.goalsAgainst] : [oppName, myName, opp, myClub, m.goalsAgainst, m.goalsFor];
  const sp = m.setPiece?.result;
  return (
    <li
      className={cn(
        "flex min-w-0 list-none flex-col gap-1 rounded-xl border bg-card",
        big ? "animate-rise gap-3 p-5 shadow-lg" : "px-3 py-2 text-sm",
        !big && (res === "w" ? "border-s-4 border-s-emerald-500" : res === "d" ? "border-s-4 border-s-slate-400" : "border-s-4 border-s-rose-500"),
        m.out && "opacity-80",
      )}
    >
      {comp && <span className={cn("self-start rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", m.comp === "cl" ? "bg-blue-600 text-white" : m.comp === "el" ? "bg-orange-600 text-white" : "bg-amber-500 text-black")}>{comp}</span>}
      <div className={cn("flex w-full items-center gap-2", big && "justify-center gap-4")}>
        <span className={cn("flex min-w-0 flex-1 items-center justify-end gap-2 text-end", m.home && "font-bold")}>
          <span className="min-w-0 truncate">{hName}</span>
          <Crest club={hClub} className={big ? "size-12" : "size-5"} />
        </span>
        <span className={cn("flex shrink-0 gap-1 rounded-lg bg-foreground px-2 font-heading font-black text-background tabular-nums", big ? "px-4 py-1 text-4xl" : "text-base")}>
          <span>{hG}</span>
          <span>–</span>
          <span>{aG}</span>
        </span>
        <span className={cn("flex min-w-0 flex-1 items-center gap-2", !m.home && "font-bold")}>
          <Crest club={aClub} className={big ? "size-12" : "size-5"} />
          <span className="min-w-0 truncate">{aName}</span>
        </span>
      </div>
      <div className={cn("flex flex-wrap items-center gap-2 text-xs", big ? "justify-center text-sm" : "justify-end")}>
        {m.pens && <span className="text-muted-foreground">{m.pens === "won" ? t.play.pensWon : t.play.pensLost}</span>}
        {m.minutes ? (
          <>
            <span className={cn("rounded px-1.5 py-0.5 font-bold text-white tabular-nums", m.rating! >= 7.5 ? "bg-emerald-600" : m.rating! >= 6.5 ? "bg-amber-500" : "bg-rose-600")}>{m.rating}</span>
            {m.goals > 0 && <span>⚽×{m.goals}</span>}
            {m.assists > 0 && <span>🅰×{m.assists}</span>}
            {m.injured && <span className="font-semibold text-rose-600">🩹 {t.injury.kinds[m.injured]}</span>}
            {sp && <span>{sp.outcome === "goal" ? (m.setPiece!.kind === "penaltySave" ? "🥅✗" : "🎯✓") : m.setPiece!.kind === "penaltySave" ? "🧤✓" : "🎯✗"}</span>}
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
