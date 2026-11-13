"use client";

import { UserXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hireAgent, rollAgents } from "@/lib/engine/career";
import type { ScreenProps } from "./career-app";
import { Face } from "./face";
import { fill } from "./helpers";

export function AgentPicker({ save, t, onChange }: ScreenProps) {
  const agents = save.agentsOnOffer.length ? save.agentsOnOffer : rollAgents(save).agentsOnOffer;
  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-3xl font-extrabold">{t.agent.title}</h1>
      <p className="mb-6 text-muted-foreground">{t.agent.subtitle}</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a, i) => (
          <li key={a.id} className="animate-rise flex flex-col gap-3 rounded-2xl border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-3">
              <Face seed={a.face} kind="agent" className="size-16 shrink-0 overflow-hidden rounded-xl shadow" title={a.name} />
              <div>
                <p className="font-bold">{a.name}</p>
                <p className="text-sm text-amber-500" aria-label={`${t.agent.quality} ${a.quality}/5`}>
                  {"★".repeat(a.quality)}
                  <span className="text-muted-foreground/40">{"★".repeat(5 - a.quality)}</span>
                </p>
              </div>
            </div>
            <p className="text-sm">
              {t.agent.commission}: <strong className="tabular-nums">{a.commission}%</strong>
            </p>
            <p className="text-xs text-muted-foreground">{fill(t.agent.pitch[a.quality - 1], {})}</p>
            <Button size="lg" className="mt-auto h-11" onClick={() => onChange(hireAgent({ ...save, agentsOnOffer: agents }, a.id))}>
              {t.agent.hire}
            </Button>
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
