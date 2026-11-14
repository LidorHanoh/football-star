"use client";

import { FastForwardIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { clubKit } from "@/lib/engine/people";
import { resolveSetPiece } from "@/lib/engine/set-piece";
import type { CareerSave, MatchResult, World, Zone } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Crest } from "./crest";
import { type CareerDict, fill, teamName } from "./helpers";
import { HighlightClip } from "./highlights";
import { SetPieceGame } from "./set-piece";

type Step = "score" | "clip" | "setpiece";

/**
 * Plays the half season match by match: every score, your rating, your goals,
 * the 2D highlights and the set pieces you take. One button speeds it up
 * (highlights are skipped, scores still roll by); set pieces always wait for you.
 */
export function SeasonPlay({ before, after, world, t, locale, onFinish }: { before: CareerSave; after: CareerSave; world: World; t: CareerDict; locale: Locale; onFinish: (save: CareerSave) => void }) {
  const [save, setSave] = useState(after);
  const [i, setI] = useState(0);
  const [step, setStep] = useState<Step>("score");
  const [clipIndex, setClipIndex] = useState(0);
  const [fast, setFast] = useState(false);
  const offset = before.season!.matches.length;
  const half = after.season!.halvesPlayed;
  const myClub = world.clubs.find((c) => c.id === after.contract!.clubId)!;
  const myKit = clubKit(myClub);
  const matches = save.season!.matches.slice(offset);
  const m = matches[i];
  const done = matches.slice(0, i);
  const opp = m ? world.clubs.find((c) => c.id === m.opponentId) : undefined;
  const oppKit = opp ? clubKit(opp) : myKit;
  const clips = m ? save.season!.highlights.filter((h) => h.half === half && h.round === m.round && h.opponentId === m.opponentId) : [];
  const name = before.player.name;

  function next() {
    if (i + 1 >= matches.length) onFinish(save);
    else {
      setI(i + 1);
      setStep("score");
    }
  }

  function afterClip() {
    if (clipIndex + 1 < clips.length && !fast) setClipIndex(clipIndex + 1);
    else if (m!.setPiece && !m!.setPiece.result) setStep("setpiece");
    else next();
  }

  // Advance through the steps of the current match.
  useEffect(() => {
    if (!m || step !== "score") return;
    const wait = fast ? 380 : 1500;
    const timer = setTimeout(() => {
      if (clips.length && !fast) {
        setClipIndex(0);
        setStep("clip");
      } else if (m.setPiece && !m.setPiece.result) setStep("setpiece");
      else next();
    }, wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when the match or speed changes
  }, [i, step, fast]);

  const level = before.contract!.level; // the level these matches were played at
  const age = before.player.age;
  const myName = teamName(world, myClub.id, locale, level, age);
  const oppName = opp ? teamName(world, opp.id, locale, level, age) : "";
  const goals = matches.slice(0, i + 1).reduce((s, x) => s + x.goals, 0);
  const assists = matches.slice(0, i + 1).reduce((s, x) => s + x.assists, 0);
  const rated = matches.slice(0, i + 1).filter((x) => x.rating);
  const avg = rated.length ? (rated.reduce((s, x) => s + x.rating!, 0) / rated.length).toFixed(2) : "–";

  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-4 py-4 md:grid-cols-[1fr_15rem]">
      <div className="grid content-start gap-4">
        {/* Progress */}
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">{fill(t.play.matchOf, { n: Math.min(i + 1, matches.length), total: matches.length })}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((i + (step === "score" ? 0.5 : 1)) / matches.length) * 100}%` }} />
          </div>
        </div>

        {m && step === "clip" && clips[clipIndex] && (
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
        )}

        {m && step === "setpiece" && m.setPiece && (
          <SetPieceGame
            key={`sp${i}`}
            sp={m.setPiece}
            t={t}
            myKit={myKit}
            oppKit={oppKit}
            minute={m.setPiece.minute}
            onShoot={(zone: Zone) => {
              const resolved = resolveSetPiece(save, offset + i, zone);
              setSave(resolved);
              return resolved.season!.matches[offset + i].setPiece!.result!;
            }}
            onDone={next}
          />
        )}

        {m && step === "score" && <MatchCard key={`m${i}`} m={m} myName={myName} oppName={oppName} myClub={myClub} opp={opp!} t={t} big />}

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
            {sp && <span>{sp.outcome === "goal" ? (m.setPiece!.kind === "penaltySave" ? "🥅✗" : "🎯✓") : m.setPiece!.kind === "penaltySave" ? "🧤✓" : "🎯✗"}</span>}
            {big && <span className="text-muted-foreground">{m.started ? t.play.started : fill(t.play.subOn, { min: m.minutes })}</span>}
          </>
        ) : (
          <span className="text-muted-foreground">{t.dashboard.didNotPlay}</span>
        )}
      </div>
    </li>
  );
}
