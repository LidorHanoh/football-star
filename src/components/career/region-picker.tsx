"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { getDir, type Locale } from "@/i18n/config";
import { COUNTRY_NAMES, countriesOf, FLAG_CODE } from "@/lib/engine/regions";
import type { World } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { type CareerDict, fill, localized } from "./helpers";

export function Flag({ code, className }: { code: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG
  return <img src={`/flags/${code}.svg`} alt="" className={cn("shrink-0 object-cover", className)} draggable={false} />;
}

/** Flag for a country name, or nothing if we don't have it. */
export function CountryFlag({ country, className }: { country: string; className?: string }) {
  const code = FLAG_CODE[country];
  return code ? <Flag code={code} className={className} /> : null;
}

/** Start of a career: pick a country; the academy offers come from its leagues. */
export function RegionPicker({ t, world, locale, onPick }: { t: CareerDict; world: World; locale: Locale; onPick: (leagueKeys: string[]) => void }) {
  const r = t.region;
  const Arrow = getDir(locale) === "rtl" ? ChevronLeftIcon : ChevronRightIcon;
  const countries = countriesOf(world);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="animate-rise font-heading text-3xl font-extrabold sm:text-4xl">{r.title}</h1>
      <p className="animate-rise mb-6 text-muted-foreground" style={{ animationDelay: "60ms" }}>
        {r.subtitle}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {countries.map(({ country, leagues }, i) => {
          const name = COUNTRY_NAMES[country]?.[locale === "he" ? "he" : "en"] ?? country;
          const code = FLAG_CODE[country];
          const top = leagues[0];
          const stars = Math.max(1, Math.min(5, Math.round((top.strength - 50) / 9)));
          return (
            <li key={country} className={cn("animate-rise", i === 0 && "col-span-2")} style={{ animationDelay: `${80 + Math.min(i, 14) * 45}ms` }}>
              <button
                type="button"
                onClick={() => onPick(leagues.map((l) => l.key))}
                className="group relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 text-start shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                {/* The flag washes the card */}
                {code && <Flag code={code} className="pointer-events-none absolute inset-0 size-full opacity-[0.12] blur-[1px] transition duration-500 group-hover:scale-110 group-hover:opacity-20" />}
                <span className="relative flex items-center gap-3">
                  {code && <Flag code={code} className={cn("rounded-full shadow-md ring-[3px] ring-card transition duration-300 group-hover:scale-110 group-hover:-rotate-6", i === 0 ? "size-16" : "size-12")} />}
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-heading font-black leading-tight", i === 0 ? "text-3xl" : "text-xl")}>{name}</span>
                    <span className="text-xs text-amber-500" aria-label={`${t.league.strength} ${stars}/5`}>
                      {"★".repeat(stars)}
                      <span className="text-muted-foreground/40">{"★".repeat(5 - stars)}</span>
                    </span>
                  </span>
                  <Arrow className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary rtl:group-hover:-translate-x-0.5" aria-hidden />
                </span>
                <span className="relative flex flex-wrap gap-1">
                  {leagues.map((l) => (
                    <span key={l.key} className="max-w-full truncate rounded-full border bg-background/75 px-2 py-0.5 text-[0.7rem] font-medium backdrop-blur">
                      {localized(l.name, locale)}
                    </span>
                  ))}
                  {leagues.length > 1 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.7rem] font-bold text-primary">{fill(r.leagues, { n: leagues.length })}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
