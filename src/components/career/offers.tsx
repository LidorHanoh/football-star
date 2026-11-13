"use client";

import { DicesIcon, PenLineIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { ROLE_START } from "@/lib/engine/attrs";
import { askForMore, netWage, signOffer } from "@/lib/engine/career";
import type { Agent, Offer, World } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { ScreenProps } from "./career-app";
import { Crest } from "./crest";
import { type CareerDict, clubName, fill, FLAGS, money } from "./helpers";

export function OffersScreen({ save, world, t, locale, onChange }: ScreenProps) {
  const [spin, setSpin] = useState<{ offerId: string; won: boolean; wage: number } | null>(null);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-3xl font-extrabold">{t.offers.title}</h1>
      <p className="mb-6 text-muted-foreground">{t.offers.subtitle}</p>
      <ul className="grid gap-4 md:grid-cols-3">
        {save.offers.map((offer, i) => (
          <li key={offer.id} className="animate-rise" style={{ animationDelay: `${i * 110}ms` }}>
            <OfferCard
              offer={offer}
              world={world}
              t={t}
              locale={locale}
              agent={save.agent}
              onSign={() => onChange(signOffer(save, offer.id, world))}
              onAskMore={() => {
                const result = askForMore(save, offer.id);
                setSpin({ offerId: offer.id, won: result.won, wage: result.offer.wage });
                onChange(result.save);
              }}
            />
          </li>
        ))}
      </ul>
      {spin && <Roulette won={spin.won} t={t} message={spin.won ? fill(t.offers.won, { wage: money(spin.wage, locale) }) : t.offers.lost} onClose={() => setSpin(null)} />}
    </section>
  );
}

export function OfferCard({
  offer,
  world,
  t,
  locale,
  agent,
  onSign,
  onAskMore,
  highlight,
}: {
  offer: Offer;
  world: World;
  t: CareerDict;
  locale: Locale;
  agent: Agent | null;
  onSign: () => void;
  onAskMore?: () => void;
  highlight?: boolean;
}) {
  const club = world.clubs.find((c) => c.id === offer.clubId)!;
  const league = world.leagues.find((l) => l.key === club.leagueKey);
  const tagColor = { big: "bg-amber-500/15 text-amber-600 dark:text-amber-300", steady: "bg-sky-500/15 text-sky-600 dark:text-sky-300", fast: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", renew: "bg-violet-500/15 text-violet-600 dark:text-violet-300", transfer: "bg-rose-500/15 text-rose-600 dark:text-rose-300" }[offer.tag];
  return (
    <article className={cn("flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg", highlight && "border-primary ring-2 ring-primary/30")}>
      <div className="flex items-start gap-3">
        <Crest club={club} className="size-12" />
        <div className="min-w-0">
          <h2 className="truncate font-heading text-xl font-bold">{clubName(world, offer.clubId, locale)}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {league ? `${FLAGS[league.country] ?? ""} ${league.name[locale] ?? league.name.en}` : ""}
          </p>
        </div>
      </div>
      <div>
        <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-bold", tagColor)}>{t.offers.tags[offer.tag]}</span>
        <p className="mt-1 text-xs text-muted-foreground">{t.offers.tagHints[offer.tag]}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t.offers.wage}</dt>
          <dd className="font-heading text-lg font-extrabold tabular-nums">
            {money(offer.wage, locale)}
            <span className="text-xs font-medium text-muted-foreground">{t.offers.perWeek}</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t.offers.level[offer.level]}</dt>
          <dd className="font-medium">{fill(t.offers.years, { n: offer.years })}</dd>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2">
          <dt className="text-muted-foreground">{t.offers.role}</dt>
          <dd className="text-end">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold text-white", { star: "bg-amber-500", starter: "bg-emerald-600", rotation: "bg-sky-600", bench: "bg-slate-500" }[offer.role])}>{t.roles[offer.role]}</span>
            <span className="ms-2 text-xs text-muted-foreground">{fill(t.offers.startChance, { pct: Math.round(ROLE_START[offer.role] * 100) })}</span>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="mb-1 flex justify-between text-muted-foreground">
            <span>{t.offers.trust}</span>
            <span className="tabular-nums">{offer.trust}</span>
          </dt>
          <dd className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${offer.trust}%` }} />
          </dd>
        </div>
        {agent && (
          <p className="col-span-2 text-xs text-muted-foreground">{fill(t.offers.afterAgent, { pct: agent.commission, wage: money(netWage(offer.wage, agent), locale) })}</p>
        )}
      </dl>
      <div className="mt-auto grid gap-2">
        <Button size="lg" className="h-11" onClick={onSign}>
          <PenLineIcon aria-hidden /> {t.offers.sign}
        </Button>
        {onAskMore && (
          <Button size="lg" variant="outline" className="h-11" disabled={!!offer.negotiated} onClick={onAskMore} title={t.offers.askMoreHint}>
            <DicesIcon aria-hidden /> {offer.negotiated ? t.offers.alreadyAsked : t.offers.askMore}
          </Button>
        )}
        {onAskMore && !offer.negotiated && <p className="text-center text-xs text-muted-foreground">{t.offers.askMoreHint}</p>}
      </div>
    </article>
  );
}

/** 50/50 wheel. The result is already decided; the wheel just lands on it. */
function Roulette({ won, t, message, onClose }: { won: boolean; t: CareerDict; message: string; onClose: () => void }) {
  const [done, setDone] = useState(false);
  // Gradient starts at the top: green 0–180° (right half), red 180–360° (left half).
  // Rotating the wheel by −θ puts the slice at θ under the top pointer.
  const [target] = useState(() => 360 * 6 + (won ? 0 : 180) + 20 + Math.random() * 140);
  return (
    <div role="dialog" aria-modal="true" aria-live="polite" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-2xl">
        <p className="mb-4 font-heading text-lg font-bold">{done ? (won ? "💰" : "😬") : t.offers.spinning}</p>
        <div dir="ltr" className="relative mx-auto mb-5 size-56">
          <div className="absolute -top-2 left-1/2 z-10 size-0 -translate-x-1/2 border-x-[12px] border-t-[22px] border-x-transparent border-t-foreground" aria-hidden />
          <div
            className="size-full rounded-full border-4 border-foreground/80 shadow-lg motion-reduce:transition-none"
            style={{
              background: "conic-gradient(from 0deg, #16a34a 0 180deg, #dc2626 180deg 360deg)",
              transform: `rotate(${-target}deg)`,
              transition: "transform 2.6s cubic-bezier(0.15, 0.85, 0.25, 1)",
            }}
            ref={(el) => {
              // Start the spin on the next frame so the transition runs.
              if (el && !el.dataset.spun) {
                el.dataset.spun = "1";
                el.style.transform = "rotate(0deg)";
                requestAnimationFrame(() => requestAnimationFrame(() => (el.style.transform = `rotate(${-target}deg)`)));
              }
            }}
            onTransitionEnd={() => setDone(true)}
          >
            <span className="absolute top-1/2 right-[18%] -translate-y-1/2 text-3xl" aria-hidden>
              💰
            </span>
            <span className="absolute top-1/2 left-[18%] -translate-y-1/2 text-3xl" aria-hidden>
              👎
            </span>
          </div>
        </div>
        {done && (
          <>
            <p className={cn("mb-4 font-bold", won ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{message}</p>
            <Button size="lg" onClick={onClose} autoFocus>
              {t.next}
            </Button>
          </>
        )}
        {!done && (
          <Button variant="ghost" size="sm" onClick={() => setDone(true)}>
            {t.highlights.skip}
          </Button>
        )}
      </div>
    </div>
  );
}
