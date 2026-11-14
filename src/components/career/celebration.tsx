"use client";

import type { Trophy } from "@/lib/engine/types";
import { Button } from "@/components/ui/button";
import { type CareerDict, fill } from "./helpers";
import { TrophyArt } from "./trophy";

const COLORS = ["#fbbf24", "#f43f5e", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#f97316"];
// Deterministic "random" so render stays pure.
const r = (i: number, k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;

/** Full-screen trophy lift: rays, fireworks, confetti, then the trophies one by one. */
export function Celebration({ trophies, t, subtitle, onClose }: { trophies: Trophy[]; t: CareerDict; subtitle?: string; onClose: () => void }) {
  const c = t.celebrate;
  const main = trophies[0];
  return (
    <div role="dialog" aria-modal="true" aria-label={c.title} className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#3b2a05_0%,#0b0b14_65%)] p-4 text-white">
      {/* rotating rays */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-30 motion-safe:animate-[rays_24s_linear_infinite]"
        style={{ background: "repeating-conic-gradient(from 0deg, #fbbf24 0deg 6deg, transparent 6deg 20deg)", maskImage: "radial-gradient(circle, black 0%, transparent 55%)" }}
      />
      {/* fireworks */}
      {[0, 1, 2, 3, 4].map((f) => (
        <div key={f} aria-hidden className="pointer-events-none absolute" style={{ left: `${12 + r(f, 1) * 76}%`, top: `${8 + r(f, 2) * 40}%` }}>
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="absolute size-1.5 rounded-full motion-safe:animate-[burst_1.4s_ease-out_infinite]"
              style={{ background: COLORS[(f + i) % COLORS.length], ["--a" as string]: `${i * (360 / 14)}deg`, ["--d" as string]: `${50 + r(f, 3) * 40}px`, animationDelay: `${0.3 + f * 0.55}s`, boxShadow: `0 0 8px ${COLORS[(f + i) % COLORS.length]}` }}
            />
          ))}
        </div>
      ))}
      {/* confetti */}
      {Array.from({ length: 70 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute -top-6 block motion-safe:animate-[confetti_linear_infinite]"
          style={{
            left: `${r(i, 4) * 100}%`,
            width: 6 + r(i, 5) * 6,
            height: 10 + r(i, 6) * 8,
            background: COLORS[i % COLORS.length],
            animationDuration: `${2.6 + r(i, 7) * 2.8}s`,
            animationDelay: `${r(i, 8) * 3}s`,
            borderRadius: i % 3 ? 2 : 999,
          }}
        />
      ))}

      <div className="relative flex max-w-lg flex-col items-center text-center">
        <p className="animate-pop font-heading text-5xl font-black tracking-tight text-amber-300 drop-shadow-[0_4px_20px_rgba(251,191,36,0.6)] sm:text-6xl">{c.title}</p>
        {subtitle && <p className="animate-rise mt-1 text-white/70">{subtitle}</p>}
        <div className="animate-lift relative mt-4" style={{ animationDelay: "0.25s" }}>
          <TrophyArt kind={main} className="h-56 drop-shadow-[0_10px_40px_rgba(251,191,36,0.55)] sm:h-72" title={t.trophies[main]} />
          {[0, 1, 2].map((g) => (
            <span key={g} aria-hidden className="absolute text-2xl text-white motion-safe:animate-[glint_2.6s_ease-in-out_infinite]" style={{ left: `${20 + g * 28}%`, top: `${10 + (g % 2) * 22}%`, animationDelay: `${1 + g * 0.7}s` }}>
              ✦
            </span>
          ))}
        </div>
        <p className="animate-rise mt-2 font-heading text-2xl font-extrabold" style={{ animationDelay: "0.8s" }}>
          {t.trophies[main]}
        </p>
        {trophies.length > 1 && (
          <>
            <p className="animate-rise mt-1 text-amber-200" style={{ animationDelay: "1s" }}>
              {fill(c.many, { n: trophies.length })}
            </p>
            <ul className="mt-3 flex flex-wrap justify-center gap-3">
              {trophies.slice(1).map((k, i) => (
                <li key={k} className="animate-pop flex w-24 flex-col items-center gap-1" style={{ animationDelay: `${1.2 + i * 0.25}s` }}>
                  <TrophyArt kind={k} className="h-20" />
                  <span className="text-xs font-semibold text-white/85">{t.trophies[k]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <Button size="lg" className="animate-rise mt-6 h-12 bg-amber-400 px-8 text-base font-bold text-black hover:bg-amber-300" style={{ animationDelay: "1.4s" }} onClick={onClose} autoFocus>
          {c.continue}
        </Button>
      </div>
    </div>
  );
}
