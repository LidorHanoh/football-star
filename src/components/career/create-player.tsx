"use client";

import { DicesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NewPlayerInput } from "@/lib/engine/career";
import { DEFAULT_KIT } from "@/lib/engine/attrs";
import { newSeed } from "@/lib/engine/rng";
import { type Position } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Face, faceCount } from "./face";
import { type CareerDict, FLAGS } from "./helpers";
import { KIT_STYLES, KitPreview } from "./kit-preview";
import { CountryFlag } from "./region-picker";

/** Where each position sits on the mini pitch (x: 0 left → 100 right, y: 0 attack → 100 own goal). */
const SPOTS: Record<Position, { x: number; y: number }> = {
  ST: { x: 50, y: 12 }, LW: { x: 16, y: 22 }, RW: { x: 84, y: 22 }, AM: { x: 50, y: 34 },
  CM: { x: 50, y: 50 }, DM: { x: 50, y: 64 }, LB: { x: 14, y: 72 }, RB: { x: 86, y: 72 }, CB: { x: 50, y: 78 }, GK: { x: 50, y: 92 },
};

const NATIONS = Object.keys(FLAGS);

export function CreatePlayer({ t, onDone }: { t: CareerDict; onDone: (input: NewPlayerInput) => void }) {
  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("Israel");
  const [position, setPosition] = useState<Position>("ST");
  const [foot, setFoot] = useState<"right" | "left">("right");
  const [kit, setKit] = useState<number | null>(null);
  const [face, setFace] = useState(() => newSeed() % faceCount());
  const [page, setPage] = useState(() => Math.floor(face / 6));
  const [style, setStyle] = useState(0);
  const number = kit ?? DEFAULT_KIT[position];

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-heading text-3xl font-extrabold">{t.create.title}</h1>
      <form
        className="grid gap-6 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onDone({ name: name.trim().slice(0, 30), nationality, position, foot, kit: number, face });
        }}
      >
        <div className="grid content-start gap-5">
          <div className="grid gap-3 rounded-2xl border bg-card p-3">
            <div className="flex items-center gap-4">
              <Face key={face} seed={face} number={number} className="animate-pop size-24 shrink-0 rounded-2xl shadow-md" title={t.create.face} />
              <div className="grid gap-2">
                <p className="text-sm font-medium">{t.create.face}</p>
                <Button type="button" variant="outline" onClick={() => setPage(page + 1)}>
                  <DicesIcon aria-hidden /> {t.create.newFace}
                </Button>
              </div>
            </div>
            <div key={page} className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={t.create.face}>
              {Array.from({ length: 6 }, (_, i) => (page * 6 + i) % faceCount()).map((f, i) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={face % faceCount() === f}
                  onClick={() => setFace(f)}
                  className={cn("animate-pop overflow-hidden rounded-lg ring-offset-2 ring-offset-card transition hover:scale-105", face % faceCount() === f ? "ring-2 ring-primary" : "opacity-80")}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Face seed={f} className="aspect-square w-full" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pname">{t.create.name}</Label>
            <Input id="pname" required maxLength={30} value={name} placeholder={t.create.namePlaceholder} onChange={(e) => setName(e.target.value)} className="h-11 text-base" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pnat">{t.create.nationality}</Label>
            <div className="flex items-center gap-2">
            <CountryFlag country={nationality} className="h-7 w-10 rounded shadow-sm" />
            <select id="pnat" value={nationality} onChange={(e) => setNationality(e.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-base">
              {NATIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pkit">{t.create.kit}</Label>
            <Input id="pkit" type="number" inputMode="numeric" min={1} max={99} value={number} onChange={(e) => setKit(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} className="h-11 w-28 text-center font-heading text-xl font-bold" />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t.create.foot}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["right", "left"] as const).map((f) => (
                <Button key={f} type="button" variant={foot === f ? "default" : "outline"} className="h-11" onClick={() => setFoot(f)} aria-pressed={foot === f}>
                  {t.create[f]}
                </Button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid content-start gap-5">
        {/* Your shirt, live: name + number printed on the back */}
        <div className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_50%_30%,#334155_0%,#0b1220_75%)] p-4 shadow-sm">
          <span aria-hidden className="absolute inset-x-1/4 top-0 h-2/3 rounded-full bg-white/10 blur-2xl" />
          <KitPreview name={name} number={number} kit={KIT_STYLES[style]} className="relative mx-auto w-full max-w-[15rem] drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]" />
          <div className="relative mt-3 flex justify-center gap-2" role="radiogroup" aria-label={t.create.kitStyle}>
            {KIT_STYLES.map((k, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={style === i}
                aria-label={`${t.create.kitStyle} ${i + 1}`}
                onClick={() => setStyle(i)}
                className={cn("size-7 rounded-full border-2 transition hover:scale-110", style === i ? "scale-110 border-white ring-2 ring-primary" : "border-white/40")}
                style={{ background: `linear-gradient(135deg, ${k.primary} 0 55%, ${k.secondary} 55% 100%)` }}
              />
            ))}
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            {t.create.position}: <strong>{t.positions[position]}</strong>
          </legend>
          {/* Mini pitch, always drawn left-to-right so LW is on the left in every language */}
          <div dir="ltr" className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-xl border-2 border-white/30 bg-gradient-to-b from-emerald-700 to-emerald-800 shadow-inner">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
            <div className="absolute top-1/2 left-1/2 size-20 -translate-1/2 rounded-full border border-white/30" />
            <div className="absolute bottom-0 left-1/2 h-[16%] w-1/2 -translate-x-1/2 border border-b-0 border-white/30" />
            <div className="absolute top-0 left-1/2 h-[16%] w-1/2 -translate-x-1/2 border border-t-0 border-white/30" />
            {(Object.keys(SPOTS) as Position[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(p)}
                aria-pressed={position === p}
                aria-label={t.positions[p]}
                style={{ left: `${SPOTS[p].x}%`, top: `${SPOTS[p].y}%` }}
                className={cn(
                  "absolute grid h-9 min-w-12 -translate-1/2 place-items-center rounded-full px-2 text-xs font-bold shadow transition",
                  position === p ? "scale-110 bg-white text-emerald-900 ring-4 ring-amber-300" : "bg-emerald-950/70 text-white hover:bg-emerald-950",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>
        </div>

        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="submit" size="lg" className="h-12 px-8" disabled={!name.trim()}>
            {t.next}
          </Button>
        </div>
      </form>
    </section>
  );
}
