"use client";

import { ArrowRightLeftIcon, DicesIcon, PenLineIcon, StarHalfIcon, StarIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { type Advice, agentAdvice } from "@/lib/engine/advice";
import { ROLE_START } from "@/lib/engine/attrs";
import { askForMore, clubStars, lastSeasonPlace, netWage, SEASON_START_YEAR, signOffer } from "@/lib/engine/career";
import { clubKit } from "@/lib/engine/people";
import type { Agent, CareerSave, Offer, World, WorldClub } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { ScreenProps } from "./career-app";
import { Crest } from "./crest";
import { Face } from "./face";
import { type CareerDict, fill, money, teamName } from "./helpers";
import { CountryFlag } from "./region-picker";

/** "3 years" (and "1 year", not "1 years"). */
export const yearsLabel = (t: CareerDict, n: number) => (n === 1 ? t.offers.oneYear : fill(t.offers.yearsShort, { n }));

const TAG_COLOR: Record<Offer["tag"], string> = {
  big: "bg-amber-500 text-black",
  steady: "bg-sky-600 text-white",
  fast: "bg-emerald-600 text-white",
  renew: "bg-violet-600 text-white",
  transfer: "bg-rose-600 text-white",
  talent: "bg-fuchsia-600 text-white",
  loan: "bg-cyan-600 text-white",
};

/** How good a club is, in half stars. */
export function ClubStars({ club, className }: { club: WorldClub; className?: string }) {
  const n = clubStars(club);
  return (
    <span className={cn("inline-flex shrink-0 items-center text-amber-400", className)} title={`${n}/5`} aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) =>
        n >= i ? <StarIcon key={i} className="size-3 fill-current" aria-hidden /> : n >= i - 0.5 ? <StarHalfIcon key={i} className="size-3 fill-current rtl:-scale-x-100" aria-hidden /> : <StarIcon key={i} className="size-3 text-muted-foreground/40" aria-hidden />,
      )}
    </span>
  );
}

/** The season a new contract starts in. */
const startYear = (save: CareerSave) => (save.season ? save.season.year + (save.season.halvesPlayed === 2 ? 1 : 0) : SEASON_START_YEAR);
const ROLE_COLOR = { star: "bg-amber-500", starter: "bg-emerald-600", rotation: "bg-sky-600", bench: "bg-slate-500" } as const;

export function OffersScreen({ save, world, t, locale, onChange }: ScreenProps) {
  return (
    <section className="mx-auto max-w-3xl px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-6">
      <h1 className="font-heading text-2xl font-extrabold">{fill(t.offers.title, {})}</h1>
      <p className="mb-3 text-sm text-muted-foreground">{fill(t.offers.subtitle, { n: save.offers.length })}</p>
      <OfferBoard
        save={save}
        offers={save.offers}
        world={world}
        t={t}
        locale={locale}
        age={save.player.age}
        onSign={(id) => onChange(signOffer(save, id, world))}
        onAskMore={(id) => {
          const r = askForMore(save, id);
          onChange(r.save);
          return r;
        }}
      />
    </section>
  );
}

/**
 * Every offer as a compact row (all of them fit on a phone screen). Tap one to
 * open its contract in a sheet: the details, "ask for more", and Sign — tapped
 * twice — which plays the signing animation.
 */
export function OfferBoard({
  save,
  offers,
  world,
  t,
  locale,
  age,
  best,
  stay,
  onSign,
  onAskMore,
}: {
  save: CareerSave;
  offers: Offer[];
  world: World;
  t: CareerDict;
  locale: Locale;
  /** Player age when the contract starts (names the youth side: U17 / U19…) */
  age: number;
  /** The offer your agent would take (gets a star). */
  best?: string | null;
  /** "Stay at your club" as the first row. */
  stay?: { title: string; text: string; button: string; onStay: () => void };
  onSign: (offerId: string) => void;
  onAskMore: (offerId: string) => { won: boolean; offer: Offer };
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [spin, setSpin] = useState<{ won: boolean; wage: number } | null>(null);
  const [signing, setSigning] = useState<Offer | null>(null);
  const open = offers.find((o) => o.id === openId) ?? null;
  const maxWage = Math.max(...offers.map((o) => o.wage), 1);

  return (
    <>
      <ul className="grid grid-cols-1 gap-2">
        {stay && (
          <li className="animate-rise flex items-center gap-3 rounded-2xl border-2 border-primary bg-primary/5 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading font-bold">{stay.title}</p>
              <p className="truncate text-xs text-muted-foreground">{stay.text}</p>
            </div>
            <Button className="h-11 shrink-0" onClick={stay.onStay}>
              {stay.button}
            </Button>
          </li>
        )}
        {offers.map((o, i) => {
          const club = world.clubs.find((c) => c.id === o.clubId)!;
          const league = world.leagues.find((l) => l.key === club.leagueKey);
          const kit = clubKit(club);
          const starred = best === o.id || o.tag === "renew";
          const loanClub = o.loan ? world.clubs.find((c) => c.id === o.loan!.clubId) : undefined;
          const place = lastSeasonPlace(world, club, startYear(save));
          return (
            <li key={o.id} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
              <button
                type="button"
                onClick={() => setOpenId(o.id)}
                className={cn("relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border bg-card p-2.5 pe-3 text-start shadow-sm transition active:scale-[0.98] md:hover:shadow-md", starred && "border-primary ring-2 ring-primary/25")}
              >
                {/* club colours down the side */}
                <span aria-hidden className="absolute inset-y-0 start-0 w-1.5" style={{ background: `linear-gradient(${kit.primary}, ${kit.secondary})` }} />
                <span className="ms-1 grid size-12 shrink-0 place-items-center rounded-xl bg-muted/60">
                  <Crest club={club} className="size-10" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-heading text-base font-bold">{teamName(world, o.clubId, locale, o.level, age)}</span>
                    {starred && <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label={t.advice.best} />}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {league && <CountryFlag country={league.country} className="size-3.5 shrink-0 rounded-full" />}
                    <span className="truncate">{league ? (league.name[locale] ?? league.name.en) : ""}</span>
                    <ClubStars club={club} />
                  </span>
                  {loanClub ? (
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                      <ArrowRightLeftIcon className="size-3 shrink-0" aria-hidden />
                      <Crest club={loanClub} className="size-3.5" />
                      <span className="truncate">{fill(t.offers.loanTo, { club: teamName(world, loanClub.id, locale, "first", age) })}</span>
                    </span>
                  ) : null}
                  <span className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-bold">
                    <span className={cn("rounded-full px-2 py-px", TAG_COLOR[o.tag])}>{t.offers.tags[o.tag]}</span>
                    <span className={cn("rounded-full px-2 py-px text-white", ROLE_COLOR[o.role])}>{t.roles[o.role]}</span>
                    {!loanClub && <span className="rounded-full bg-muted px-2 py-px text-muted-foreground">{t.offers.level[o.level]}</span>}
                    <span className="rounded-full bg-muted px-2 py-px text-muted-foreground tabular-nums">{fill(t.offers.lastSeason, { pos: place.pos })}</span>
                  </span>
                </span>
                <span className="shrink-0 text-end">
                  <span className="block font-heading text-lg leading-tight font-black tabular-nums">{money(o.wage, locale)}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t.offers.perWeek} · {yearsLabel(t, o.years)}
                  </span>
                  <span className="mt-1 ms-auto block h-1 w-14 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((o.wage / maxWage) * 100)}%` }} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t.offers.tapHint}</p>

      {open && (
        <OfferSheet
          key={open.id}
          offer={open}
          save={save}
          world={world}
          t={t}
          locale={locale}
          age={age}
          agent={save.agent}
          onClose={() => setOpenId(null)}
          onAskMore={() => {
            const r = onAskMore(open.id);
            setSpin({ won: r.won, wage: r.offer.wage });
          }}
          onSign={() => {
            setSigning(open);
            setOpenId(null);
          }}
        />
      )}
      {spin && <Roulette won={spin.won} t={t} message={spin.won ? fill(t.offers.won, { wage: money(spin.wage, locale) }) : t.offers.lost} onClose={() => setSpin(null)} />}
      {signing && <SigningScene offer={signing} save={save} world={world} t={t} locale={locale} age={age} onDone={() => onSign(signing.id)} />}
    </>
  );
}

/** One offer's full contract, in a sheet from the bottom. Sign needs a second tap. */
function OfferSheet({ offer, save, world, t, locale, age, agent, onClose, onAskMore, onSign }: { offer: Offer; save: CareerSave; world: World; t: CareerDict; locale: Locale; age: number; agent: Agent | null; onClose: () => void; onAskMore: () => void; onSign: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(timer);
  }, [armed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const club = world.clubs.find((c) => c.id === offer.clubId)!;
  const league = world.leagues.find((l) => l.key === club.leagueKey);
  const kit = clubKit(club);
  const advice = agentAdvice(save, world, offer);
  const place = lastSeasonPlace(world, club, startYear(save));
  const loanClub = offer.loan ? world.clubs.find((c) => c.id === offer.loan!.clubId) : undefined;
  const loanLeague = loanClub ? world.leagues.find((l) => l.key === loanClub.leagueKey) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={teamName(world, offer.clubId, locale, offer.level, age)}>
      <button type="button" aria-label={t.close} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="animate-sheet-up relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        {/* Header in club colours */}
        <div className="relative overflow-hidden px-4 pt-4 pb-5 text-white" style={{ background: `linear-gradient(135deg, ${kit.primary} 0%, #0b1220 90%)` }}>
          <span aria-hidden className="absolute -end-8 -top-8 size-36 rounded-full bg-white/10 blur-2xl" />
          <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/40 sm:hidden" />
          <button type="button" onClick={onClose} aria-label={t.close} className="absolute end-3 top-3 grid size-9 place-items-center rounded-full bg-black/30">
            <XIcon className="size-4" aria-hidden />
          </button>
          <div className="relative flex items-center gap-3">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-lg">
              <Crest club={club} className="size-12" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-xl font-black">{teamName(world, offer.clubId, locale, offer.level, age)}</p>
              <p className="flex items-center gap-1.5 text-sm text-white/80">
                {league && <CountryFlag country={league.country} className="size-4 rounded-full" />}
                <span className="truncate">{league ? (league.name[locale] ?? league.name.en) : ""}</span>
                <ClubStars club={club} />
              </p>
              <p className="text-xs text-white/75 tabular-nums">{fill(t.offers.lastSeasonLong, { pos: place.pos, of: place.of })}</p>
              <p className="mt-1 text-xs text-white/75">
                <span className={cn("me-1.5 rounded-full px-2 py-px font-bold", TAG_COLOR[offer.tag])}>{t.offers.tags[offer.tag]}</span>
                {t.offers.tagHints[offer.tag]}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4">
          {loanClub && (
            <div className="flex items-center gap-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-2.5 text-sm">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white">
                <Crest club={loanClub} className="size-9" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-bold">
                  <ArrowRightLeftIcon className="size-4 shrink-0 text-cyan-600" aria-hidden />
                  <span className="truncate">{fill(t.offers.loanTo, { club: teamName(world, loanClub.id, locale, "first", age) })}</span>
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate">{loanLeague ? (loanLeague.name[locale] ?? loanLeague.name.en) : ""}</span>
                  <ClubStars club={loanClub} />
                </p>
                <p className="mt-0.5 text-xs">{fill(t.offers.loanText, { n: offer.loan!.years, club: teamName(world, offer.clubId, locale, "first", age) })}</p>
              </div>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-muted/60 p-2.5">
              <dt className="text-xs text-muted-foreground">{t.offers.wage}</dt>
              <dd className="font-heading text-xl font-black tabular-nums">
                {money(offer.wage, locale)}
                <span className="text-xs font-medium text-muted-foreground">{t.offers.perWeek}</span>
              </dd>
              {agent && <dd className="text-[11px] text-muted-foreground">{fill(t.offers.afterAgent, { pct: agent.commission, wage: money(netWage(offer.wage, agent), locale) })}</dd>}
            </div>
            <div className="rounded-xl bg-muted/60 p-2.5">
              <dt className="text-xs text-muted-foreground">{t.offers.level[offer.level]}</dt>
              <dd className="font-heading text-xl font-black">{yearsLabel(t, offer.years)}</dd>
              <dd className="text-[11px] text-muted-foreground">{fill(t.offers.years, { n: offer.years })}</dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-2.5">
              <dt className="text-xs text-muted-foreground">{t.offers.role}</dt>
              <dd className="mt-0.5">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold text-white", ROLE_COLOR[offer.role])}>{t.roles[offer.role]}</span>
              </dd>
              <dd className="mt-1 text-[11px] text-muted-foreground">{fill(t.offers.startChance, { pct: Math.round(ROLE_START[offer.role] * 100) })}</dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-2.5">
              <dt className="flex justify-between text-xs text-muted-foreground">
                <span>{t.offers.trust}</span>
                <span className="font-bold text-foreground tabular-nums">{offer.trust}</span>
              </dt>
              <dd className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${offer.trust}%` }} />
              </dd>
            </div>
          </dl>

          {advice && agent && <AgentTip advice={advice} agent={agent} t={t} />}

          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button size="lg" variant={advice?.verdict === "askMore" && !offer.negotiated ? "secondary" : "outline"} className={cn("h-14", advice?.verdict === "askMore" && !offer.negotiated && "ring-2 ring-amber-400")} disabled={!!offer.negotiated} onClick={onAskMore} title={t.offers.askMoreHint}>
              <DicesIcon aria-hidden /> {offer.negotiated ? t.offers.alreadyAsked : t.offers.askMore}
            </Button>
            <Button size="lg" className={cn("h-14 text-base font-bold transition", armed ? "animate-glow bg-amber-500 text-black hover:bg-amber-500" : "shine")} onClick={() => (armed ? onSign() : setArmed(true))}>
              <PenLineIcon aria-hidden /> {armed ? t.offers.confirmSign : t.offers.sign}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">{armed ? t.offers.confirmHint : offer.negotiated ? "" : t.offers.askMoreHint}</p>
        </div>
      </div>
    </div>
  );
}

/** The contract on the desk: your signature is written across it, then the club stamps it. */
function SigningScene({ offer, save, world, t, locale, age, onDone }: { offer: Offer; save: CareerSave; world: World; t: CareerDict; locale: Locale; age: number; onDone: () => void }) {
  const club = world.clubs.find((c) => c.id === offer.clubId)!;
  const kit = clubKit(club);
  const done = useRef(onDone);
  const fired = useRef(false);
  const finish = () => {
    if (fired.current) return;
    fired.current = true;
    done.current();
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fired.current) {
        fired.current = true;
        done.current();
      }
    }, 3300);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label={t.offers.signing} className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#3b2f25_0%,#120d09_80%)] p-5" onClick={finish}>
      <p className="animate-rise absolute top-[max(1.5rem,env(safe-area-inset-top))] inset-x-0 text-center text-xs font-bold tracking-[0.25em] text-white/60 uppercase">{t.offers.signing}</p>
      <div className="animate-paper-in relative w-full max-w-sm rounded-md bg-[#fbf7ee] p-5 text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <span aria-hidden className="absolute inset-x-0 top-0 h-2 rounded-t-md" style={{ background: `linear-gradient(90deg, ${kit.primary} 0 50%, ${kit.secondary} 50% 100%)` }} />
        <div className="flex items-center gap-3 border-b border-slate-300 pb-3">
          <Crest club={club} className="size-12" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">{t.contractScreen.title}</p>
            <p className="truncate font-heading text-lg font-black">{teamName(world, club.id, locale, offer.level, age)}</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {[
            [t.offers.wage, `${money(offer.wage, locale)}${t.offers.perWeek}`],
            [t.contractScreen.length, yearsLabel(t, offer.years)],
            [t.offers.role, t.roles[offer.role]],
          ].map(([k, v]) => (
            <div key={k} className="rounded bg-slate-200/70 px-1 py-1.5">
              <dt className="text-slate-500">{k}</dt>
              <dd className="truncate font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {offer.loan && <p className="mt-2 rounded bg-cyan-100 px-2 py-1 text-center text-xs font-bold text-cyan-800">{fill(t.offers.loanTo, { club: teamName(world, offer.loan.clubId, locale, "first", age) })}</p>}
        <div aria-hidden className="mt-3 grid gap-1.5">
          {[92, 100, 84, 96, 60].map((w, i) => (
            <span key={i} className="h-1.5 rounded bg-slate-300/80" style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* Signature */}
        <div className="relative mt-6 h-12 border-b-2 border-dashed border-slate-400">
          <span className="animate-write absolute inset-x-0 bottom-1 truncate px-1 font-serif text-3xl leading-none text-blue-900 italic">{save.player.name}</span>
          <span aria-hidden className="animate-pen absolute -top-3 text-3xl">
            ✒️
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">{save.player.name}</p>
        <span className="animate-stamp absolute end-4 bottom-10 rounded-lg border-4 border-emerald-600 px-3 py-1 font-heading text-2xl font-black text-emerald-600 uppercase opacity-0 mix-blend-multiply">{t.contractScreen.signed}</span>
      </div>
      <p className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] inset-x-0 text-center text-xs text-white/50">{t.highlights.skip}</p>
    </div>
  );
}

/** Your agent's take on the offer: verdict, reasons, and their favourite. */
function AgentTip({ advice, agent, t }: { advice: Advice; agent: Agent; t: CareerDict }) {
  const a = t.advice;
  const tone = { sign: "border-emerald-500/50 bg-emerald-500/10", askMore: "border-amber-400/60 bg-amber-400/10", maybe: "border-sky-500/40 bg-sky-500/10", avoid: "border-rose-500/50 bg-rose-500/10" }[advice.verdict];
  return (
    <div className={cn("relative flex items-start gap-2.5 rounded-xl border p-2.5 text-sm", tone)}>
      <Face seed={agent.face} kind="agent" className="size-9 rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <strong>{a.verdicts[advice.verdict]}</strong>
          {advice.best && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-px text-[0.7rem] font-bold text-black">
              <StarIcon className="size-3 fill-current" aria-hidden /> {a.best}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{advice.reasons.map((r) => a.reasons[r]).join(" · ")}</p>
      </div>
    </div>
  );
}

/** Wheel for "ask for more". The result is already decided; the wheel just lands on it. */
export function Roulette({ won, t, message, onClose }: { won: boolean; t: CareerDict; message: string; onClose: () => void }) {
  const [done, setDone] = useState(false);
  // Gradient starts at the top: green 0–180° (right half), red 180–360° (left half).
  // Rotating the wheel by −θ puts the slice at θ under the top pointer.
  const [target] = useState(() => 360 * 6 + (won ? 0 : 180) + 20 + Math.random() * 140);
  return (
    <div role="dialog" aria-modal="true" aria-live="polite" className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
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
