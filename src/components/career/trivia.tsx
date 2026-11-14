"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { factAnswer, factText, TOPICS, type TriviaData, type TriviaQuestion } from "@/lib/engine/trivia";
import type { TriviaTopic } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Crest } from "./crest";
import { type CareerDict, fill } from "./helpers";
import { Takeover } from "./situations";

let cache: Promise<TriviaData | null> | null = null;
/** The trivia data, loaded once (it's a static file). */
export function loadTrivia() {
  cache ??= fetch("/trivia/data.json")
    .then((r) => (r.ok ? (r.json() as Promise<TriviaData>) : null))
    .catch(() => null);
  return cache;
}

export function useTriviaData(enabled: boolean) {
  const [data, setData] = useState<TriviaData | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadTrivia().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return data;
}

const name = (x: { en: string; he?: string } | undefined, locale: Locale) => (x ? (locale === "he" ? (x.he ?? x.en) : x.en) : "?");
const TopicIcon: Record<TriviaTopic, string> = { general: "🌍", cl: "⭐", top5: "🏆", israel: "🇮🇱" };

function TmCrest({ tm, data, className }: { tm: number; data: TriviaData; className?: string }) {
  return <Crest club={{ id: `tm${tm}`, name: { en: data.clubs[tm]?.en ?? "?" }, tmId: tm }} className={className} />;
}

/** Start of a career: pick the trivia you want along the way (or none). */
export function TopicPicker({ t, onDone }: { t: CareerDict; onDone: (topics: TriviaTopic[]) => void }) {
  const tr = t.trivia;
  const [picked, setPicked] = useState<TriviaTopic[]>([...TOPICS]);
  const toggle = (k: TriviaTopic) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-lg flex-col px-4 py-6">
      <h1 className="font-heading text-3xl font-extrabold">{tr.pickTitle}</h1>
      <p className="mt-1 text-muted-foreground">{tr.pickText}</p>
      <div className="mt-6 grid gap-3">
        {TOPICS.map((k, i) => {
          const on = picked.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(k)}
              className={cn("animate-rise flex min-h-20 items-center gap-4 rounded-2xl border-2 p-4 text-start transition active:scale-[0.98]", on ? "border-primary bg-primary/10 shadow-md" : "border-border bg-card")}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-3xl" aria-hidden>
                {TopicIcon[k]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{tr.topics[k].title}</span>
                <span className="block text-sm text-muted-foreground">{tr.topics[k].text}</span>
              </span>
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>{on && <CheckIcon className="size-4" aria-hidden />}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{tr.reward}</p>
      <div className="sticky bottom-0 mt-auto grid gap-2 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button size="lg" className="h-14 text-base" onClick={() => onDone(picked)} disabled={!picked.length}>
          {t.next}
        </Button>
      </div>
    </section>
  );
}

/** One question, full screen. Wrong answer: yours goes red and the right one green. */
export function TriviaTakeover({ data, q, t, locale, onDone }: { data: TriviaData; q: TriviaQuestion; t: CareerDict; locale: Locale; onDone: (right: boolean) => void }) {
  const tr = t.trivia;
  const [pick, setPick] = useState<number | null>(null);
  const right = pick === q.answer;
  const he = locale === "he";
  const label = (id: number) => (q.kind === "fact" ? factAnswer(q.fact, id, he) : q.kind === "transfer" ? name(data.players[id], locale) : name(data.clubs[id], locale));
  const fee = q.kind === "transfer" ? (q.fee === -1 ? tr.loan : q.fee === 0 ? tr.free : q.fee ? `€${q.fee >= 1e6 ? `${Math.round(q.fee / 1e5) / 10}M` : `${Math.round(q.fee / 1e3)}K`}` : null) : null;

  return (
    <Takeover tone={pick === null ? "blue" : right ? "good" : "bad"} label={tr.title}>
      <p className="text-center text-xs font-bold tracking-[0.2em] text-white/60 uppercase">🧠 {tr.title}</p>

      {q.kind === "transfer" ? (
        <>
          <div className="mt-5 flex items-center justify-center gap-3">
            <div className="flex w-28 flex-col items-center gap-2 text-center">
              <span className="animate-pop grid size-20 place-items-center rounded-2xl bg-white shadow-xl">
                <TmCrest tm={q.from} data={data} className="size-14" />
              </span>
              <span className="text-sm leading-tight font-semibold">{name(data.clubs[q.from], locale)}</span>
            </div>
            <div className="flex flex-col items-center gap-1 pb-6">
              <span className="font-heading text-2xl font-black text-amber-300 tabular-nums">{q.year}</span>
              <ArrowRightIcon className="size-8 text-white motion-safe:animate-[float_1.4s_ease-in-out_infinite] rtl:rotate-180" aria-hidden />
              {fee && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">{fee}</span>}
            </div>
            <div className="flex w-28 flex-col items-center gap-2 text-center">
              <span className="animate-pop grid size-20 place-items-center rounded-2xl bg-white shadow-xl" style={{ animationDelay: "150ms" }}>
                <TmCrest tm={q.to} data={data} className="size-14" />
              </span>
              <span className="text-sm leading-tight font-semibold">{name(data.clubs[q.to], locale)}</span>
            </div>
          </div>
          <p className="mt-5 text-center font-heading text-2xl font-bold">{tr.whoTransfer}</p>
        </>
      ) : q.kind === "fact" ? (
        <>
          <div className="animate-pop mx-auto mt-4 grid size-20 place-items-center rounded-full bg-white/10 text-5xl" aria-hidden>
            ⚽
          </div>
          <p className="mt-4 text-center font-heading text-2xl leading-snug font-bold">{factText(q.fact, he)}</p>
        </>
      ) : (
        <p className="mt-6 text-center font-heading text-2xl leading-snug font-bold">{fill(q.comp === "cl" ? tr.whoWonCl : tr.whoWonIsr, { year: `${q.year - 1}/${String(q.year % 100).padStart(2, "0")}` })}</p>
      )}

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {q.options.map((id, i) => {
          const isAnswer = id === q.answer;
          const state = pick === null ? "idle" : isAnswer ? "right" : id === pick ? "wrong" : "dim";
          return (
            <button
              key={id}
              type="button"
              disabled={pick !== null}
              onClick={() => setPick(id)}
              className={cn(
                "animate-rise flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start text-lg font-bold transition duration-300",
                state === "idle" && "border-white/20 bg-white/10 hover:bg-white/15 active:scale-[0.98]",
                state === "right" && "animate-pop border-emerald-300 bg-emerald-500 text-white",
                state === "wrong" && "border-rose-300 bg-rose-600 text-white motion-safe:animate-[shake_0.4s]",
                state === "dim" && "border-white/10 bg-white/5 opacity-40",
              )}
              style={pick === null ? { animationDelay: `${120 + i * 70}ms` } : undefined}
            >
              {q.kind === "champion" && <TmCrest tm={id} data={data} className="size-8" />}
              <span className="min-w-0 flex-1">{label(id)}</span>
              {state === "right" && <CheckIcon className="size-6 shrink-0" aria-hidden />}
              {state === "wrong" && <XIcon className="size-6 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>

      {pick !== null && (
        <div className="animate-rise mt-5 text-center">
          <p className="font-heading text-2xl font-black">{right ? tr.right : tr.wrong}</p>
          <p className="mt-1 text-white/80">{right ? tr.rewardWon : fill(tr.itWas, { answer: label(q.answer) })}</p>
          <Button size="lg" className="mt-5 h-14 w-full bg-white text-base font-bold text-black hover:bg-white/90" onClick={() => onDone(right)} autoFocus>
            {t.next}
          </Button>
        </div>
      )}
    </Takeover>
  );
}
