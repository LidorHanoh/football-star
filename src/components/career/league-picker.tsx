"use client";

import type { Locale } from "@/i18n/config";
import type { World } from "@/lib/engine/types";
import { type CareerDict, FLAGS, localized } from "./helpers";

export function LeaguePicker({ t, world, locale, onPick }: { t: CareerDict; world: World; locale: Locale; onPick: (key: string) => void }) {
  // Israel first (top flight, then lower divisions), then by strength.
  const israel = (k: string) => (k === "isr" ? 0 : k.startsWith("isr") ? 1 : 2);
  const leagues = [...world.leagues].sort((a, b) => israel(a.key) - israel(b.key) || b.strength - a.strength);
  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-3xl font-extrabold">{t.league.title}</h1>
      <p className="mb-6 text-muted-foreground">{t.league.subtitle}</p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map((l, i) => {
          const stars = Math.max(1, Math.min(5, Math.round((l.strength - 50) / 9)));
          return (
            <li key={l.key}>
              <button
                onClick={() => onPick(l.key)}
                className="animate-rise flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-start transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <span className="text-3xl" aria-hidden>
                  {FLAGS[l.country] ?? "⚽"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{localized(l.name, locale)}</span>
                  {l.tier > 1 && <span className="me-1 rounded bg-muted px-1.5 text-xs font-semibold">{t.league.tier2}</span>}
                  <span className="text-sm text-amber-500" aria-label={`${t.league.strength} ${stars}/5`}>
                    {"★".repeat(stars)}
                    <span className="text-muted-foreground/40">{"★".repeat(5 - stars)}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
