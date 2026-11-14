"use client";

import { LockIcon, UserXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentTierFor, agentUnlockRating, hireAgent, rollAgents } from "@/lib/engine/career";
import type { Agent } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { ScreenProps } from "./career-app";
import { Face } from "./face";
import { type CareerDict, fill } from "./helpers";

export function AgentPicker({ save, t, onChange }: ScreenProps) {
  const agents = save.agentsOnOffer.length ? save.agentsOnOffer : rollAgents(save).agentsOnOffer;
  const tier = agentTierFor(save.player.rating);
  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-3xl font-extrabold">{t.agent.title}</h1>
      <p className="mb-2 text-muted-foreground">{t.agent.subtitle}</p>
      <p className="mb-6 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">{t.agent.lockedHint}</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a, i) => (
          <li key={a.id} className="animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
            <AgentCard agent={a} t={t} locked={a.quality > tier} onHire={() => onChange(hireAgent({ ...save, agentsOnOffer: agents }, a.id))} />
          </li>
        ))}
        <li className="flex flex-col gap-3 rounded-2xl border border-dashed p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-muted">
              <UserXIcon aria-hidden />
            </span>
            <p className="font-bold">{t.agent.none}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t.agent.noneHint}</p>
          <Button size="lg" variant="outline" className="mt-auto h-11" onClick={() => onChange(hireAgent(save, null))}>
            {t.next}
          </Button>
        </li>
      </ul>
    </section>
  );
}

export function AgentCard({ agent: a, t, locked, onHire, hireLabel }: { agent: Agent; t: CareerDict; locked?: boolean; onHire: () => void; hireLabel?: string }) {
  return (
    <article className={cn("relative flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 transition", locked ? "opacity-70" : "hover:-translate-y-1 hover:shadow-lg")}>
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <Face seed={a.face} kind="agent" className={cn("size-16 overflow-hidden rounded-xl shadow", locked && "blur-[3px] grayscale")} title={locked ? undefined : a.name} />
          {locked && (
            <span className="absolute inset-0 grid place-items-center">
              <LockIcon className="size-6 text-white drop-shadow" aria-hidden />
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold">{locked ? "???" : a.name}</p>
          <p className="text-sm text-amber-500" aria-label={`${t.agent.quality} ${a.quality}/5`}>
            {"★".repeat(a.quality)}
            <span className="text-muted-foreground/40">{"★".repeat(5 - a.quality)}</span>
          </p>
        </div>
      </div>
      <p className="text-sm">
        {t.agent.commission}: <strong className="tabular-nums">{a.commission}%</strong>
      </p>
      <p className="text-xs text-muted-foreground">{t.agent.pitch[a.quality - 1]}</p>
      {locked ? (
        <p className="mt-auto flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm font-semibold">
          <LockIcon className="size-4 shrink-0" aria-hidden /> {fill(t.agent.locked, { n: agentUnlockRating(a.quality) })}
        </p>
      ) : (
        <Button size="lg" className="mt-auto h-11" onClick={onHire}>
          {hireLabel ?? t.agent.hire}
        </Button>
      )}
    </article>
  );
}
