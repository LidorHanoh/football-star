"use client";

import { NewspaperIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { fairWage } from "@/lib/engine/advice";
import { netWage, teamStrength } from "@/lib/engine/career";
import { clubKit, hash } from "@/lib/engine/people";
import { Rng } from "@/lib/engine/rng";
import type { CareerSave, Signing, World } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Crest } from "./crest";
import { Face } from "./face";
import { type CareerDict, fill, money, teamName } from "./helpers";

type PressKey = "talent" | "renewal" | "goodFit" | "bargain" | "youth" | "abroad" | "bigStep" | "bench" | "bigMoney" | "standard";
type Persona = "fan" | "critic" | "analyst";

/** What the press can talk about for this contract. */
function pressKeys(save: CareerSave, world: World, s: Signing): PressKey[] {
  const club = world.clubs.find((c) => c.id === s.clubId)!;
  const keys: PressKey[] = [];
  const countryOf = (id?: string) => world.leagues.find((l) => l.key === world.clubs.find((c) => c.id === id)?.leagueKey)?.country;
  if (s.tag === "talent") keys.push("talent");
  if (s.tag === "renew") keys.push("renewal");
  if (s.role === "star" || s.role === "starter") keys.push("goodFit");
  if (s.role === "bench") keys.push("bench");
  if (s.level === "youth") keys.push("youth");
  if (s.fromClubId && countryOf(s.fromClubId) !== countryOf(s.clubId)) keys.push("abroad");
  if (teamStrength(club, s.level) - save.player.rating >= 6) keys.push("bigStep");
  const ratio = s.wage / fairWage(world, { clubId: s.clubId, level: s.level } as never, save.player.rating);
  if (ratio > 1.15) keys.push("bigMoney");
  if (ratio < 0.9) keys.push("bargain");
  keys.push("standard");
  return keys;
}

const PREFER: Record<Persona, PressKey[]> = {
  fan: ["talent", "renewal", "goodFit", "bargain", "youth", "abroad", "bigStep", "standard"],
  critic: ["bench", "bigMoney", "bigStep", "abroad", "youth", "goodFit", "standard"],
  analyst: ["bigStep", "goodFit", "youth", "abroad", "bigMoney", "bargain", "bench", "talent", "renewal", "standard"],
};
const TONE: Record<Persona, number> = { fan: 0, critic: 1, analyst: 2 };

/**
 * You just signed: the contract on screen, then three journalists give their
 * take on the move, and off you go to the pitch.
 */
export function ContractScreen({ save, world, t, locale, onDone }: { save: CareerSave; world: World; t: CareerDict; locale: Locale; onDone: () => void }) {
  const s = save.signed!;
  const c = t.contractScreen;
  const club = world.clubs.find((x) => x.id === s.clubId)!;
  const kit = clubKit(club);
  const keys = pressKeys(save, world, s);
  const rng = new Rng(hash(`${save.id}:${s.year}:${s.clubId}:press`));
  // Three of the six journalists, each with their own angle.
  const writers = rng.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
  const personas: Persona[] = rng.shuffle(["fan", "critic", "analyst"] as Persona[]);
  const used = new Set<PressKey>();
  const pieces = writers.map((w, k) => {
    const persona = personas[k];
    const key = PREFER[persona].find((x) => keys.includes(x) && (!used.has(x) || x === "standard")) ?? "standard";
    used.add(key);
    const line = c.press[key][TONE[persona]];
    return { w, persona, text: fill(line, { name: save.player.name.split(" ").at(-1)!, club: teamName(world, club.id, locale, s.level, save.player.age), years: s.years, role: t.roles[s.role] }) };
  });

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-lg flex-col px-4 py-5">
      {/* The contract */}
      <div className="animate-rise relative overflow-hidden rounded-3xl text-white shadow-2xl" style={{ background: `linear-gradient(135deg, ${kit.primary} 0%, #0b1220 85%)` }}>
        <div aria-hidden className="absolute -end-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative p-5">
          <p className="text-xs font-bold tracking-[0.2em] text-white/70 uppercase">{s.fromClubId ? c.transfer : c.title}</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="animate-pop grid size-20 shrink-0 place-items-center rounded-2xl bg-white shadow-lg">
              <Crest club={club} className="size-14" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-2xl leading-tight font-black">{teamName(world, club.id, locale, s.level, save.player.age)}</p>
              <p className="mt-1 text-sm text-white/80">
                {t.offers.level[s.level]} · {t.roles[s.role]}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {[
              [c.wage, fill(t.dashboard.wage, { wage: money(s.wage, locale) })],
              [c.net, fill(t.dashboard.wage, { wage: money(netWage(s.wage, save.agent), locale) })],
              [c.length, fill(c.years, { n: s.years })],
              [c.until, `${s.year + s.years}`],
            ].map(([k, v], i) => (
              <div key={k} className="animate-rise rounded-xl bg-black/25 p-2.5 backdrop-blur" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <dt className="text-xs text-white/60">{k}</dt>
                <dd className="font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-center gap-3">
            <Face seed={save.player.face} kit={kit} number={save.player.kit} className="size-14 rounded-xl ring-2 ring-white/30" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{save.player.name}</p>
              <p className="text-xs text-white/70">
                #{save.player.kit} · {t.positions[save.player.position]}
              </p>
            </div>
            <span className="animate-pop -rotate-12 rounded-lg border-2 border-emerald-300 px-2 py-1 font-heading text-lg font-black text-emerald-300 uppercase" style={{ animationDelay: "700ms" }}>
              {c.signed}
            </span>
          </div>
        </div>
      </div>

      {/* The press */}
      <h2 className="mt-6 mb-3 flex items-center gap-2 font-heading text-xl font-bold">
        <NewspaperIcon className="size-5" aria-hidden /> {c.pressTitle}
      </h2>
      <ul className="grid gap-3">
        {pieces.map((p, k) => {
          const j = c.journalists[p.w];
          return (
            <li key={p.w} className="animate-rise flex gap-3 rounded-2xl border bg-card p-3.5 shadow-sm" style={{ animationDelay: `${500 + k * 220}ms` }}>
              <Face seed={hash(`journalist:${p.w}`)} kind="manager" className="size-12 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <strong>{j.name}</strong>
                  <span className="text-xs text-muted-foreground">{j.outlet}</span>
                </p>
                <p className={cn("mt-1 leading-snug", p.persona === "critic" && "text-foreground/90")}>“{p.text}”</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background to-transparent pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button size="lg" className="shine h-14 w-full text-lg font-bold" onClick={onDone}>
          ⚽ {c.toPitch}
        </Button>
      </div>
    </section>
  );
}
