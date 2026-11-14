"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { getDir, type Locale } from "@/i18n/config";
import { FLAG_CODE, REGIONS, regionLeagues } from "@/lib/engine/regions";
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

/** Start of a career: pick a region; the academy offers come from its leagues. */
export function RegionPicker({ t, world, locale, onPick }: { t: CareerDict; world: World; locale: Locale; onPick: (leagueKeys: string[]) => void }) {
  const r = t.region;
  const Arrow = getDir(locale) === "rtl" ? ChevronLeftIcon : ChevronRightIcon;
  const regions = REGIONS.map((region) => ({ region, leagues: regionLeagues(world, region.key) })).filter((x) => x.leagues.length);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="animate-rise font-heading text-3xl font-extrabold sm:text-4xl">{r.title}</h1>
      <p className="animate-rise mb-6 text-muted-foreground" style={{ animationDelay: "60ms" }}>
        {r.subtitle}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {regions.map(({ region, leagues }, i) => (
          <li key={region.key} className={cn("animate-rise", i === 0 && "sm:col-span-2")} style={{ animationDelay: `${100 + i * 70}ms` }}>
            <button
              type="button"
              onClick={() => onPick(leagues.map((l) => l.key))}
              className="group relative flex h-full w-full flex-col gap-4 overflow-hidden rounded-3xl border bg-card p-5 text-start shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              {/* Colour wash + big blurred flag in the background */}
              <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16] transition-opacity duration-300 group-hover:opacity-25" style={{ background: `linear-gradient(135deg, ${region.colors[0]}, ${region.colors[1]})` }} />
              <Flag code={region.flags[0]} className="pointer-events-none absolute -end-10 -top-10 size-44 rotate-12 rounded-full opacity-15 blur-[2px] transition duration-500 group-hover:scale-110 group-hover:rotate-6" />

              <span className="relative flex items-center gap-4">
                <span className="flex -space-x-3 rtl:space-x-reverse">
                  {region.flags.map((code) => (
                    <Flag key={code} code={code} className="size-12 rounded-full shadow-md ring-[3px] ring-card transition duration-300 group-hover:-translate-y-0.5 sm:size-14" />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-2xl font-black leading-tight">{r.names[region.key]}</span>
                  <span className="text-sm text-muted-foreground">{fill(r.leagues, { n: leagues.length })}</span>
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow transition duration-300 group-hover:scale-110">
                  <Arrow aria-hidden />
                </span>
              </span>

              <span className="relative text-sm">{r.blurbs[region.key]}</span>

              <span className="relative flex flex-wrap gap-1.5">
                {leagues.map((l) => {
                  const stars = Math.max(1, Math.min(5, Math.round((l.strength - 50) / 9)));
                  return (
                    <span key={l.key} className="flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-xs font-medium backdrop-blur">
                      <CountryFlag country={l.country} className="size-4 rounded-full" />
                      <span className="max-w-36 truncate">{localized(l.name, locale)}</span>
                      <span className="text-amber-500" aria-label={`${t.league.strength} ${stars}/5`}>
                        {"★".repeat(stars)}
                      </span>
                    </span>
                  );
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
