"use client";

import { BriefcaseIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { officeAnswer, officeTopic, type OfficeReaction } from "@/lib/engine/office";
import type { Kit } from "@/lib/engine/people";
import type { CareerSave, WorldClub } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Crest } from "./crest";
import { Face } from "./face";
import { type CareerDict, fill } from "./helpers";

/** Your words go in quotes; an action like "(slams the door)" doesn't. */
const quote = (s: string) => (s.startsWith("(") ? s : `"${s}"`);

type TopicText = { says: string; reactions: Record<string, string>; replies: Record<string, string> };

/** The manager's office: window onto the stadium, a trophy shelf, the club crest, him behind the desk. */
function OfficeScene({ coach, kit, club, talking }: { coach: { name: string; face: number }; kit: Kit; club: WorldClub; talking: boolean }) {
  return (
    <div className="relative -mx-3 aspect-[16/11] overflow-hidden border-y bg-[#2b2118] shadow-xl sm:mx-0 sm:aspect-[16/9] sm:rounded-2xl sm:border">
      {/* wall + floor */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#3b2f25_0%,#4a3a2c_62%,#2a1f17_62%,#1c140f_100%)]" />
      {/* window onto the stadium at night */}
      <div className="absolute start-[6%] top-[9%] h-[42%] w-[38%] overflow-hidden rounded-md border-4 border-[#1b140e] bg-[linear-gradient(180deg,#0b1d3a_0%,#1e3a5f_70%,#14532d_70%,#166534_100%)] shadow-inner">
        <div className="absolute inset-x-[8%] top-[18%] flex justify-between" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-amber-100 shadow-[0_0_14px_6px_rgba(254,243,199,0.6)] motion-safe:animate-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-[30%] h-[22%] bg-[repeating-linear-gradient(90deg,#1f2937_0_6px,#374151_6px_12px)] opacity-80" />
        <div className="absolute inset-y-0 start-1/2 w-1 -translate-x-1/2 bg-[#1b140e]" />
      </div>
      {/* club crest on the wall */}
      <div className="absolute end-[8%] top-[10%] grid size-[22%] place-items-center rounded-full bg-black/25 p-2 ring-4" style={{ ["--tw-ring-color" as string]: kit.primary }}>
        <Crest club={club} className="size-full" />
      </div>
      {/* trophy shelf */}
      <div className="absolute end-[6%] top-[42%] w-[30%]">
        <div className="flex items-end justify-around text-xl sm:text-2xl" aria-hidden>
          <span>🏆</span>
          <span className="text-base">🥇</span>
          <span>🏆</span>
        </div>
        <div className="h-1.5 rounded bg-[#1b140e]" />
      </div>
      {/* the manager */}
      <div className={cn("absolute bottom-[14%] start-1/2 h-[62%] -translate-x-1/2 transition-transform duration-300 rtl:translate-x-1/2", talking && "motion-safe:animate-[float_1.6s_ease-in-out_infinite]")}>
        <Face seed={coach.face} kind="manager" kit={kit} plain className="aspect-[3/4] h-full" title={coach.name} />
      </div>
      {/* desk */}
      <div className="absolute inset-x-[10%] bottom-[8%] h-[22%] rounded-t-lg bg-[linear-gradient(180deg,#6b4a2f_0%,#4e3420_100%)] shadow-[0_-6px_20px_rgba(0,0,0,0.4)]">
        <div className="absolute start-[12%] -top-3 h-3 w-10 rounded-sm bg-slate-200/80" aria-hidden />
        <div className="absolute end-[14%] -top-5 text-lg" aria-hidden>
          ☕
        </div>
      </div>
      <span className="absolute start-3 bottom-2 rounded bg-black/50 px-2 py-0.5 text-xs font-semibold text-white">{coach.name}</span>
    </div>
  );
}

function Typing() {
  return (
    <span className="flex h-6 items-center gap-1" aria-label="…">
      {[0, 1, 2].map((d) => (
        <span key={d} className="size-2 rounded-full bg-slate-400 motion-safe:animate-[dots_1s_ease-in-out_infinite]" style={{ animationDelay: `${d * 0.15}s` }} />
      ))}
    </span>
  );
}

/**
 * End-of-season talk in the manager's office. He says one thing about your
 * season; you pick how to react (effects are hidden until you've said it).
 */
export function OfficeTalk({ save, coach, kit, club, t, onReact, onNext }: { save: CareerSave; coach: { name: string; face: number }; kit: Kit; club: WorldClub; t: CareerDict; onReact: (reactionId: string) => void; onNext: () => void }) {
  const o = t.office;
  const topic = officeTopic(save);
  const text = (o.topics as Record<string, TopicText>)[topic.id];
  const answered = officeAnswer(save);
  const [intro, setIntro] = useState(!answered);
  const [replyTyping, setReplyTyping] = useState(!answered);
  const picked: OfficeReaction | null = answered?.reaction ?? null;

  useEffect(() => {
    if (!intro) return;
    const timer = setTimeout(() => setIntro(false), 1100);
    return () => clearTimeout(timer);
  }, [intro]);
  useEffect(() => {
    if (!picked || !replyTyping) return;
    const timer = setTimeout(() => setReplyTyping(false), 1200);
    return () => clearTimeout(timer);
  }, [picked, replyTyping]);

  const chips = picked
    ? [
        { label: `${picked.trust > 0 ? "+" : ""}${picked.trust} ${o.trust}`, good: picked.trust >= 0 },
        ...Object.entries(picked.bars ?? {}).map(([k, v]) => ({ label: `${v > 0 ? "+" : ""}${v} ${t.bars[k as keyof typeof t.bars]}`, good: v > 0 })),
        ...(picked.raise ? [{ label: o.raise, good: true }] : []),
        ...(picked.leave ? [{ label: o.leave, good: false }] : []),
      ]
    : [];

  return (
    <div className="grid gap-4">
      <OfficeScene coach={coach} kit={kit} club={club} talking={intro || (!!picked && replyTyping)} />

      {/* What he says */}
      <div className="animate-rise rounded-2xl rounded-ss-sm border bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground">
          {t.seasonEnd.manager} · {coach.name}
        </p>
        {intro ? <Typing /> : <p className="animate-rise mt-1 text-lg leading-relaxed font-semibold">{text.says}</p>}
      </div>

      {/* How you react */}
      {!intro && !picked && (
        <div className="grid gap-2.5">
          <p className="text-sm font-semibold text-muted-foreground">{o.howReact}</p>
          {topic.reactions.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setReplyTyping(true);
                onReact(r.id);
              }}
              className="animate-rise min-h-14 rounded-2xl border-2 bg-card px-4 py-3 text-start text-base font-bold transition hover:border-primary active:scale-[0.98]"
              style={{ animationDelay: `${i * 110}ms` }}
            >
              {quote(text.reactions[r.id])}
            </button>
          ))}
        </div>
      )}

      {picked && (
        <>
          <div className="animate-rise flex justify-end">
            <p className="max-w-md rounded-2xl rounded-se-sm bg-primary px-4 py-3 font-semibold text-primary-foreground">{quote(text.reactions[picked.id])}</p>
          </div>
          <div className={cn("animate-rise rounded-2xl rounded-ss-sm border-2 p-4", replyTyping ? "bg-card" : picked.good ? "border-emerald-500/60 bg-emerald-500/10" : "border-rose-500/60 bg-rose-500/10")}>
            <p className="text-xs font-semibold text-muted-foreground">
              {t.seasonEnd.manager} · {coach.name}
            </p>
            {replyTyping ? <Typing /> : <p className="animate-rise mt-1 text-lg leading-relaxed font-semibold">{text.replies[picked.id]}</p>}
          </div>
          {!replyTyping && (
            <>
              <p className={cn("animate-pop text-center font-heading text-xl font-black", picked.good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{picked.good ? o.wentWell : o.wentBadly}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {chips.map((c, i) => (
                  <span key={c.label} className={cn("animate-pop rounded-full px-3 py-1 text-sm font-bold tabular-nums", c.good ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300")} style={{ animationDelay: `${i * 90}ms` }}>
                    {c.label}
                  </span>
                ))}
              </div>
              <Button size="lg" className="h-14 w-full sm:w-auto sm:justify-self-end" onClick={onNext}>
                <BriefcaseIcon aria-hidden /> {fill(t.seasonEnd.toAgent, {})}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
