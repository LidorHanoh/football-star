"use client";

import { DumbbellIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { keyAttrs } from "@/lib/engine/attrs";
import { attrWeight, canTrain, train } from "@/lib/engine/career";
import { ATTRS, type Attrs, type CareerSave } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { type CareerDict, fill } from "./helpers";
import { PerMatch } from "./per-match";

const tone = (v: number) => (v >= 80 ? "bg-emerald-500" : v >= 65 ? "bg-lime-500" : v >= 50 ? "bg-amber-400" : "bg-rose-500");

/** The attribute list with a + button each: spend training points. */
export function TrainingList({ save, t, onChange }: { save: CareerSave; t: CareerDict; onChange: (s: CareerSave) => void }) {
  const [flash, setFlash] = useState<{ k: keyof Attrs; n: number } | null>(null);
  const p = save.player;
  const labels = p.position === "GK" ? t.attrs.gk : t.attrs.outfield;
  const best = new Set(keyAttrs(p.position).slice(0, 3));
  return (
    <>
      <ul className="grid gap-2.5">
        {ATTRS.map((k) => {
          const raw = p.attrs[k];
          const v = Math.floor(raw);
          const frac = Math.round((raw - v) * 10);
          const allowed = canTrain(save, k);
          return (
            <li key={k} className="grid grid-cols-[6.5rem_1fr_3rem_2.75rem] items-center gap-2.5">
              <span className="flex items-center gap-1 truncate text-sm font-medium">
                {labels[k]}
                {best.has(k) && (
                  <span className="text-amber-500" title={t.training.key}>
                    ★
                  </span>
                )}
              </span>
              <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all duration-700", tone(v))} style={{ width: `${v}%` }} />
              </div>
              <span key={v} className={cn("text-end font-heading text-lg font-extrabold tabular-nums", flash?.k === k && "animate-pop text-emerald-500")}>
                {v}
                {frac > 0 && <sup className="text-[0.6rem] font-bold text-muted-foreground">.{frac}</sup>}
              </span>
              <Button
                size="icon"
                variant={allowed ? "default" : "outline"}
                disabled={!allowed}
                aria-label={fill(t.training.improve, { attr: labels[k] })}
                onClick={() => {
                  onChange(train(save, k));
                  setFlash({ k, n: Date.now() });
                }}
              >
                <PlusIcon aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {t.training.hint} {flash && fill(t.training.weight, { pct: Math.round(attrWeight(p.position, flash.k) * 100) })}
      </p>
    </>
  );
}

/** Points badge: big and glowing while there are points to spend. */
export function PointsBadge({ n, t, className }: { n: number; t: CareerDict; className?: string }) {
  return (
    <span key={n} className={cn("animate-pop inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black tabular-nums", n ? "animate-glow bg-primary text-primary-foreground" : "bg-muted text-muted-foreground", className)}>
      <DumbbellIcon className="size-4" aria-hidden /> {fill(t.training.points, { n })}
    </span>
  );
}

/** Training as a sheet over the dashboard. */
export function TrainingSheet({ save, t, onChange, onClose }: { save: CareerSave; t: CareerDict; onChange: (s: CareerSave) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={t.training.title}>
      <button type="button" aria-label={t.close} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet-up relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <DumbbellIcon className="size-5 text-primary" aria-hidden /> {t.training.title}
          </h2>
          <PointsBadge n={save.player.trainingPoints} t={t} />
        </div>
        {save.player.trainingPoints > 0 && <p className="mb-3 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">{fill(t.training.spend, { n: save.player.trainingPoints })}</p>}
        <TrainingList save={save} t={t} onChange={onChange} />
        <Button size="lg" variant={save.player.trainingPoints ? "outline" : "default"} className="mt-4 h-12 w-full" onClick={onClose}>
          {save.player.trainingPoints ? t.training.later : t.training.done}
        </Button>
      </div>
    </div>
  );
}

/** Attributes + training: spend points earned on the pitch to improve. */
export function PlayerStats({ save, t, onChange }: { save: CareerSave; t: CareerDict; onChange: (s: CareerSave) => void }) {
  const p = save.player;
  const totals = save.history.reduce((s, h) => ({ apps: s.apps + h.apps, goals: s.goals + h.goals, assists: s.assists + h.assists }), { apps: 0, goals: 0, assists: 0 });
  const cur = save.season?.matches ?? [];
  totals.apps += cur.filter((m) => m.minutes).length;
  totals.goals += cur.reduce((s, m) => s + m.goals, 0);
  totals.assists += cur.reduce((s, m) => s + m.assists, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className={cn("rounded-2xl border bg-card p-4 sm:p-5", p.trainingPoints > 0 && "border-primary/60 ring-2 ring-primary/20")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <DumbbellIcon className="size-5 text-primary" aria-hidden /> {t.training.title}
          </h2>
          <PointsBadge n={p.trainingPoints} t={t} />
        </div>
        <TrainingList save={save} t={t} onChange={onChange} />
      </div>

      <div className="grid content-start gap-3">
        <PerMatch save={save} t={t} />
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 font-bold">{t.training.careerTotals}</h3>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              [t.dashboard.apps, totals.apps],
              [t.dashboard.goals, totals.goals],
              [t.dashboard.assists, totals.assists],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-muted/60 p-2">
                <dd className="font-heading text-2xl font-black tabular-nums">{value}</dd>
                <dt className="text-xs text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border bg-card p-5 text-sm">
          <dl className="grid grid-cols-2 gap-y-1.5">
            <dt className="text-muted-foreground">{t.create.position}</dt>
            <dd className="font-medium">{t.positions[p.position]}</dd>
            <dt className="text-muted-foreground">{t.create.foot}</dt>
            <dd className="font-medium">{t.create[p.foot]}</dd>
            <dt className="text-muted-foreground">{t.create.kit}</dt>
            <dd className="font-medium tabular-nums">#{p.kit}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
