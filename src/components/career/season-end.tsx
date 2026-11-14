"use client";

import { BriefcaseIcon, MessageCircleIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { agentTierFor, betterAgentAvailable, rollAgents, switchAgent } from "@/lib/engine/career";
import { agentReport, answerManager, type ManagerChoice, managerMood, mustRetire, seasonSummary, startNextSeason, type AgentReport } from "@/lib/engine/season-end";
import { clubKit, clubManager } from "@/lib/engine/people";
import type { ScreenProps } from "./career-app";
import { AgentCard } from "./agent-picker";
import { Celebration } from "./celebration";
import { TrophyArt } from "./trophy";
import { Face } from "./face";
import { fill, teamName } from "./helpers";
import { OfferCard } from "./offers";
import { StatusBars } from "./status-bars";

type Step = "review" | "manager" | "newAgent" | "agent";

export function SeasonEnd({ save, world, t, locale, onChange }: ScreenProps) {
  const s = t.seasonEnd;
  const newAgentPending = betterAgentAvailable(save) && !save.talks.newAgent;
  const [step, setStep] = useState<Step>(save.talks.manager ? (newAgentPending ? "newAgent" : "agent") : "review");
  const [reply, setReply] = useState<ManagerChoice | null>((save.talks.manager as ManagerChoice) ?? null);
  const [report, setReport] = useState<AgentReport | null>(null);
  const summary = seasonSummary(save);
  const trophies = summary.trophies ?? [];
  const [celebrating, setCelebrating] = useState(step === "review" && trophies.length > 0);
  const mood = managerMood(save);
  const contract = save.contract!;
  const club = world.clubs.find((c) => c.id === contract.clubId)!;
  const kit = clubKit(club);
  const coach = clubManager(club, world.leagues.find((l) => l.key === club.leagueKey)?.country === "Israel");
  const coachFace = <Face seed={coach.face} kind="manager" kit={kit} className="size-12 overflow-hidden rounded-full" title={coach.name} />;
  const agentFace = save.agent ? <Face seed={save.agent.face} kind="agent" className="size-12 overflow-hidden rounded-full" title={save.agent.name} /> : <BriefcaseIcon aria-hidden />;
  const meFace = <Face seed={save.player.face} kit={kit} className="size-10 overflow-hidden rounded-full" />;
  const seasonLabel = `${summary.year}/${String((summary.year + 1) % 100).padStart(2, "0")}`;
  const nextLabel = `${summary.year + 1}/${String((summary.year + 2) % 100).padStart(2, "0")}`;

  function openAgent(from = save) {
    const r = agentReport(from, world);
    setReport(r.report);
    onChange(r.save);
    setStep("agent");
  }

  // The agent report is generated once per season-end (stored offers survive a reload).
  const offers = save.offers;
  const contractOver = contract.until <= summary.year;
  const canStay = !contractOver && !(report?.released ?? false) && !(contract.level === "youth" && save.player.age + 1 >= 19);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      {celebrating && <Celebration trophies={trophies} t={t} subtitle={`${teamName(world, contract.clubId, locale, contract.level, save.player.age)} · ${seasonLabel}`} onClose={() => setCelebrating(false)} />}
      <h1 className="mb-1 flex items-center gap-2 font-heading text-3xl font-extrabold">
        <TrophyIcon className="text-amber-500" aria-hidden /> {fill(s.title, { year: seasonLabel })}
      </h1>
      <ol className="mb-6 flex gap-2 text-xs font-semibold text-muted-foreground" aria-label="steps">
        {(["review", "manager", "agent"] as Step[]).map((k, i) => (
          <li key={k} className={(step === "newAgent" ? "agent" : step) === k ? "text-primary" : ""}>
            {i + 1}. {k === "review" ? s.review : k === "manager" ? s.toManager : s.toAgent}
          </li>
        ))}
      </ol>

      {step === "review" && (
        <div className="grid gap-5">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              [t.dashboard.apps, summary.apps],
              [t.dashboard.goals, summary.goals],
              [t.dashboard.assists, summary.assists],
              [t.dashboard.avg, summary.avgRating ?? "–"],
              [s.position, summary.leaguePosition ?? "–"],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border bg-card p-4 text-center">
                <dd className="font-heading text-3xl font-black tabular-nums">{value}</dd>
                <dt className="text-sm text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          {trophies.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-4 rounded-2xl border border-amber-400/50 bg-gradient-to-b from-amber-400/15 to-transparent p-5">
              {trophies.map((k, i) => (
                <li key={k} className="animate-pop flex w-28 flex-col items-center gap-1 text-center" style={{ animationDelay: `${i * 120}ms` }}>
                  <TrophyArt kind={k} className="h-24 drop-shadow-lg" />
                  <span className="text-sm font-bold">{t.trophies[k]}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-2xl border bg-card p-5">
            <StatusBars bars={save.bars} t={t} />
          </div>
          <Button size="lg" className="h-12 justify-self-end" onClick={() => setStep("manager")}>
            <MessageCircleIcon aria-hidden /> {s.toManager}
          </Button>
        </div>
      )}

      {step === "manager" && (
        <div className="grid gap-4">
          <Bubble who={`${s.manager} · ${coach.name}`} icon={coachFace}>
            {s.managerSays[mood]}
          </Bubble>
          {!reply ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(s.managerChoices) as ManagerChoice[]).map((c) => (
                <Button
                  key={c}
                  size="lg"
                  variant="outline"
                  className="h-auto min-h-12 py-3 whitespace-normal"
                  onClick={() => {
                    setReply(c);
                    onChange(answerManager(save, c));
                  }}
                >
                  {s.managerChoices[c]}
                </Button>
              ))}
            </div>
          ) : (
            <>
              <Bubble who={save.player.name} mine icon={meFace}>
                {s.managerChoices[reply]}
              </Bubble>
              <Bubble who={`${s.manager} · ${coach.name}`} icon={coachFace}>
                {s.managerReplies[reply][mood]}
              </Bubble>
              <Button
                size="lg"
                className="h-12 justify-self-end"
                onClick={() => {
                  if (!newAgentPending) return openAgent();
                  onChange(rollAgents(save));
                  setStep("newAgent");
                }}
              >
                <BriefcaseIcon aria-hidden /> {s.toAgent}
              </Button>
            </>
          )}
        </div>
      )}

      {step === "newAgent" && (
        <div className="grid gap-5">
          <Bubble who={save.agent ? `${s.agentTitle} · ${save.agent.name}` : s.agentTitle} icon={agentFace}>
            {fill(s.newAgentSays, { rating: save.player.rating })}
          </Bubble>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {save.agentsOnOffer
              .filter((a) => a.quality > (save.agent?.quality ?? 0) && a.quality <= agentTierFor(save.player.rating))
              .sort((a, b) => b.quality - a.quality)
              .slice(0, 2)
              .map((a, i) => (
                <li key={a.id} className="animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
                  <AgentCard agent={a} t={t} hireLabel={s.switchAgent} onHire={() => {
                    const next = switchAgent(save, a.id);
                    onChange(next);
                    openAgent(next);
                  }} />
                </li>
              ))}
          </ul>
          <Button size="lg" variant="outline" className="h-12 justify-self-end" onClick={() => {
            const next = switchAgent(save, null);
            onChange(next);
            openAgent(next);
          }}>
            {save.agent ? fill(s.keepAgent, { name: save.agent.name }) : s.stayWithoutAgent}
          </Button>
        </div>
      )}

      {step === "agent" && (
        <div className="grid gap-5">
          {mustRetire(save) ? (
            <Bubble who={s.agentTitle} icon={agentFace}>
              {fill(s.retireForced, { age: save.player.age + 1 })}
            </Bubble>
          ) : (
            <>
              <Bubble who={save.agent ? `${s.agentTitle} · ${save.agent.name}` : s.agentTitle} icon={agentFace}>
                {!save.agent && <>{s.noAgent} </>}
                {report?.released ? s.released : contractOver ? (offers.some((o) => o.tag === "renew") ? s.renewal : s.noRenewal) : fill(s.underContract, { year: contract.until + 1 })}
              </Bubble>

              <h2 className="font-heading text-xl font-bold">{s.chooseClub}</h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {canStay && (
                  <li className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-primary bg-primary/5 p-5">
                    <p className="font-heading text-xl font-bold">{fill(s.stay, { club: teamName(world, contract.clubId, locale, contract.level, save.player.age + 1) })}</p>
                    <p className="text-sm text-muted-foreground">{fill(s.underContract, { year: contract.until + 1 })}</p>
                    <Button size="lg" className="h-11" onClick={() => onChange(startNextSeason(save, world, null))}>
                      {fill(s.startNext, { year: nextLabel })}
                    </Button>
                  </li>
                )}
                {offers.map((o) => (
                  <li key={o.id}>
                    <OfferCard offer={o} world={world} t={t} locale={locale} agent={save.agent} highlight={o.tag === "renew"} age={save.player.age + 1} onSign={() => onChange(startNextSeason(save, world, o.id))} />
                  </li>
                ))}
              </ul>
              {offers.length === 0 && <p className="text-muted-foreground">{s.noOffers}</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Bubble({ who, icon, mine, children }: { who: string; icon?: React.ReactNode; mine?: boolean; children: React.ReactNode }) {
  return (
    <div className={mine ? "animate-rise flex justify-end" : "animate-rise flex"}>
      <div className={mine ? "flex max-w-lg flex-row-reverse gap-3 rounded-2xl rounded-ee-sm bg-primary px-4 py-3 text-primary-foreground" : "flex max-w-xl gap-3 rounded-2xl rounded-es-sm border bg-card px-4 py-3 shadow-sm"}>
        {icon && <span className="mt-0.5 grid shrink-0 place-items-center rounded-full bg-muted">{icon}</span>}
        <div>
          <p className={mine ? "text-xs opacity-80" : "text-xs font-semibold text-muted-foreground"}>{who}</p>
          <p className="leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}
