"use client";

import { BriefcaseIcon, MessageCircleIcon, TrophyIcon, UserRoundIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { agentReport, answerManager, type ManagerChoice, managerMood, mustRetire, seasonSummary, startNextSeason, type AgentReport } from "@/lib/engine/season-end";
import type { ScreenProps } from "./career-app";
import { clubName, fill } from "./helpers";
import { OfferCard } from "./offers";
import { StatusBars } from "./status-bars";

type Step = "review" | "manager" | "agent";

export function SeasonEnd({ save, world, t, locale, onChange }: ScreenProps) {
  const s = t.seasonEnd;
  const [step, setStep] = useState<Step>(save.talks.manager ? "agent" : "review");
  const [reply, setReply] = useState<ManagerChoice | null>((save.talks.manager as ManagerChoice) ?? null);
  const [report, setReport] = useState<AgentReport | null>(null);
  const summary = seasonSummary(save);
  const mood = managerMood(save);
  const contract = save.contract!;
  const seasonLabel = `${summary.year}/${String((summary.year + 1) % 100).padStart(2, "0")}`;
  const nextLabel = `${summary.year + 1}/${String((summary.year + 2) % 100).padStart(2, "0")}`;

  function openAgent() {
    const r = agentReport(save, world);
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
      <h1 className="mb-1 flex items-center gap-2 font-heading text-3xl font-extrabold">
        <TrophyIcon className="text-amber-500" aria-hidden /> {fill(s.title, { year: seasonLabel })}
      </h1>
      <ol className="mb-6 flex gap-2 text-xs font-semibold text-muted-foreground" aria-label="steps">
        {(["review", "manager", "agent"] as Step[]).map((k, i) => (
          <li key={k} className={step === k ? "text-primary" : ""}>
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
          <Bubble who={s.manager} icon={<UserRoundIcon aria-hidden />}>
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
              <Bubble who={save.player.name} mine>
                {s.managerChoices[reply]}
              </Bubble>
              <Bubble who={s.manager} icon={<UserRoundIcon aria-hidden />}>
                {s.managerReplies[reply][mood]}
              </Bubble>
              <Button size="lg" className="h-12 justify-self-end" onClick={openAgent}>
                <BriefcaseIcon aria-hidden /> {s.toAgent}
              </Button>
            </>
          )}
        </div>
      )}

      {step === "agent" && (
        <div className="grid gap-5">
          {mustRetire(save) ? (
            <Bubble who={s.agentTitle} icon={<BriefcaseIcon aria-hidden />}>
              {fill(s.retireForced, { age: save.player.age + 1 })}
            </Bubble>
          ) : (
            <>
              <Bubble who={save.agent ? `${s.agentTitle} · ${save.agent.name}` : s.agentTitle} icon={<BriefcaseIcon aria-hidden />}>
                {!save.agent && <>{s.noAgent} </>}
                {report?.released ? s.released : contractOver ? (offers.some((o) => o.tag === "renew") ? s.renewal : s.noRenewal) : fill(s.underContract, { year: contract.until + 1 })}
              </Bubble>

              <h2 className="font-heading text-xl font-bold">{s.chooseClub}</h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {canStay && (
                  <li className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-primary bg-primary/5 p-5">
                    <p className="font-heading text-xl font-bold">{fill(s.stay, { club: clubName(world, contract.clubId, locale) })}</p>
                    <p className="text-sm text-muted-foreground">{fill(s.underContract, { year: contract.until + 1 })}</p>
                    <Button size="lg" className="h-11" onClick={() => onChange(startNextSeason(save, world, null))}>
                      {fill(s.startNext, { year: nextLabel })}
                    </Button>
                  </li>
                )}
                {offers.map((o) => (
                  <li key={o.id}>
                    <OfferCard offer={o} world={world} t={t} locale={locale} agent={save.agent} highlight={o.tag === "renew"} onSign={() => onChange(startNextSeason(save, world, o.id))} />
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
    <div className={mine ? "flex justify-end" : "flex"}>
      <div className={mine ? "max-w-lg rounded-2xl rounded-ee-sm bg-primary px-4 py-3 text-primary-foreground" : "flex max-w-xl gap-3 rounded-2xl rounded-es-sm border bg-card px-4 py-3"}>
        {icon && <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted">{icon}</span>}
        <div>
          <p className={mine ? "text-xs opacity-80" : "text-xs font-semibold text-muted-foreground"}>{who}</p>
          <p className="leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}
