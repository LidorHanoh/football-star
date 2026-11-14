"use client";

import { CheckIcon } from "lucide-react";
import { choiceOf, chooseSituation, resolveAttr, type SituationOption, upcomingSituations } from "@/lib/engine/situations";
import type { CareerSave } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { CareerDict } from "./helpers";

const ICON: Record<string, string> = {
  welcomeNight: "🍻",
  teamDinner: "🍝",
  sponsorShoot: "📸",
  extraGym: "🏋️",
  tvInterview: "🎙️",
  videoSession: "📺",
  friendParty: "🎉",
  mentorKid: "🤝",
  socialMedia: "📱",
  gamingNight: "🎮",
  finishingDrills: "🎯",
  keeperDrills: "🧤",
  schoolExams: "📚",
  playThroughPain: "🩹",
};

/** Off-the-pitch decisions before the next half season. */
export function Situations({ save, t, onChange }: { save: CareerSave; t: CareerDict; onChange: (s: CareerSave) => void }) {
  const list = upcomingSituations(save);
  if (!list.length) return null;
  const st = t.situations;
  const attrLabels = save.player.position === "GK" ? t.attrs.gk : t.attrs.outfield;

  const effects = (o: SituationOption) => {
    const out: { label: string; good: boolean }[] = [];
    for (const [k, v] of Object.entries(o.attrs ?? {})) out.push({ label: `${v > 0 ? "+" : ""}${v} ${attrLabels[resolveAttr(save, k as never)]}`, good: v > 0 });
    for (const [k, v] of Object.entries(o.bars ?? {})) out.push({ label: `${v > 0 ? "+" : ""}${v} ${t.bars[k as keyof typeof t.bars]}`, good: v > 0 });
    if (o.risk) out.push({ label: st.risk, good: false });
    return out;
  };

  return (
    <div className="grid gap-3">
      <h3 className="font-heading text-lg font-bold">{st.title}</h3>
      {list.map((sit, i) => {
        const chosen = choiceOf(save, sit.id);
        const text = (st.items as Record<string, { text: string; options: Record<string, string> }>)[sit.id];
        return (
          <article key={sit.id} className={cn("animate-rise rounded-xl border p-4", chosen ? "bg-muted/40" : "border-primary/40 bg-primary/5 shadow-sm")} style={{ animationDelay: `${i * 100}ms` }}>
            <p className="flex items-start gap-2 font-semibold">
              <span className="text-2xl leading-none" aria-hidden>
                {ICON[sit.id] ?? "💬"}
              </span>
              <span>{text.text}</span>
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sit.options.map((o) => {
                const picked = chosen === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={!!chosen}
                    onClick={() => onChange(chooseSituation(save, sit.id, o.id))}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-lg border bg-card p-3 text-start transition",
                      !chosen && "hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
                      picked && "border-primary ring-2 ring-primary/40",
                      chosen && !picked && "opacity-45",
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      {picked && <CheckIcon className="size-4 text-primary" aria-hidden />}
                      {text.options[o.id]}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {effects(o).map((e) => (
                        <span key={e.label} className={cn("rounded px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums", e.good ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300")}>
                          {e.label}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
