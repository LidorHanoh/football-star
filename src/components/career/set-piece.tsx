"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Kit } from "@/lib/engine/people";
import { zoneCol, zoneHigh } from "@/lib/engine/set-piece";
import type { SetPiece, Zone } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { CareerDict } from "./helpers";
import { Confetti } from "./highlights";

const ZONES: Zone[] = [0, 1, 2, 3, 4, 5];
const zx = (z: Zone) => [22, 60, 98][zoneCol(z)];
const zy = (z: Zone) => (zoneHigh(z) ? 13 : 33);

/**
 * Penalty / free kick seen from behind the ball. You tap a corner; the keeper
 * guesses. As a keeper facing a penalty, you tap where to dive.
 */
export function SetPieceGame({
  sp,
  t,
  myKit,
  oppKit,
  minute,
  onShoot,
  onDone,
}: {
  sp: SetPiece;
  t: CareerDict;
  myKit: Kit;
  oppKit: Kit;
  minute: number;
  /** Resolve with the chosen zone; returns the result to animate. */
  onShoot: (zone: Zone) => NonNullable<SetPiece["result"]>;
  onDone: () => void;
}) {
  const [result, setResult] = useState<SetPiece["result"] | null>(sp.result ?? null);
  const [flying, setFlying] = useState(false);
  const s = t.setPiece;
  const keeperMode = sp.kind === "penaltySave";
  const keeperKit = keeperMode ? myKit : oppKit;

  function choose(z: Zone) {
    if (result) return;
    setResult(onShoot(z));
    requestAnimationFrame(() => requestAnimationFrame(() => setFlying(true)));
  }

  // Ball target: zone centre; a miss flies over / wide.
  const target = result
    ? result.outcome === "miss"
      ? { x: zx(result.zone) + (zoneCol(result.zone) === 1 ? 0 : zoneCol(result.zone) === 0 ? -16 : 16), y: zoneHigh(result.zone) ? -10 : zy(result.zone) }
      : result.outcome === "saved"
        ? { x: zx(result.keeper), y: zy(result.keeper) }
        : { x: zx(result.zone), y: zy(result.zone) }
    : null;
  const keeperX = result && flying ? zx(result.keeper) : 60;
  const keeperTilt = result && flying ? [-62, 0, 62][zoneCol(result.keeper)] : 0;
  const keeperUp = result && flying && zoneHigh(result.keeper) ? -10 : 0;
  const good = result ? (keeperMode ? result.outcome !== "goal" : result.outcome === "goal") : false;
  const title = keeperMode ? s.penaltySaveTitle : sp.kind === "penalty" ? s.penaltyTitle : s.freekickTitle;

  return (
    <div className="animate-rise rounded-2xl border-2 border-amber-400 bg-card p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-heading text-xl font-extrabold">
          <span className="me-2 rounded bg-amber-400 px-1.5 text-sm text-black tabular-nums">{minute}&apos;</span>
          {title}
        </h3>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{keeperMode ? s.diveHint : sp.kind === "penalty" ? s.penaltyHint : s.freekickHint}</p>

      <div className="relative mx-auto max-w-lg overflow-hidden rounded-xl bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-600" dir="ltr">
        <svg viewBox="-20 -24 160 100" className="block w-full" style={{ direction: "ltr" }} aria-hidden>
          {/* Crowd */}
          <rect x={-20} y={-24} width={160} height={22} fill="#334155" />
          {Array.from({ length: 60 }, (_, i) => (
            <circle key={i} cx={-18 + (i % 30) * 5.4} cy={-20 + Math.floor(i / 30) * 7} r={1.8} fill={["#facc15", "#ef4444", "#f8fafc", "#3b82f6", "#22c55e"][(i * 7) % 5]} opacity={0.75} />
          ))}
          <rect x={-20} y={-2} width={160} height={4} fill="#0f172a" />
          {/* Grass */}
          <rect x={-20} y={46} width={160} height={30} fill="#15803d" />
          <path d="M-20 60 L140 60" stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} />
          {/* Goal */}
          <rect x={0} y={0} width={120} height={46} fill="rgba(255,255,255,0.15)" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={`v${i}`} x1={i * 10 + 5} y1={0} x2={i * 10 + 5} y2={46} stroke="rgba(255,255,255,0.3)" strokeWidth={0.3} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 9 + 4} x2={120} y2={i * 9 + 4} stroke="rgba(255,255,255,0.3)" strokeWidth={0.3} />
          ))}
          <path d="M0 46 L0 0 L120 0 L120 46" fill="none" stroke="#fff" strokeWidth={2.4} />

          {/* Keeper */}
          <g style={{ transform: `translate(${keeperX}px, ${46 + keeperUp}px) rotate(${keeperTilt}deg)`, transition: "transform 0.55s cubic-bezier(0.2,0.8,0.3,1)" }}>
            <line x1={-3} y1={-14} x2={-4} y2={0} stroke="#111827" strokeWidth={3} strokeLinecap="round" />
            <line x1={3} y1={-14} x2={4} y2={0} stroke="#111827" strokeWidth={3} strokeLinecap="round" />
            <rect x={-6} y={-30} width={12} height={17} rx={3} fill={keeperMode ? "#f59e0b" : keeperKit.secondary === "#ffffff" ? "#16a34a" : "#f59e0b"} />
            <line x1={-6} y1={-27} x2={-14} y2={-38} stroke="#d9a77c" strokeWidth={2.6} strokeLinecap="round" />
            <line x1={6} y1={-27} x2={14} y2={-38} stroke="#d9a77c" strokeWidth={2.6} strokeLinecap="round" />
            <circle cx={-14.5} cy={-39} r={2.4} fill="#e5e7eb" />
            <circle cx={14.5} cy={-39} r={2.4} fill="#e5e7eb" />
            <circle cx={0} cy={-35} r={4.5} fill="#d9a77c" />
          </g>

          {/* Wall for free kicks */}
          {sp.kind === "freekick" &&
            [40, 50, 60, 70].map((x, i) => (
              <g key={x} transform={`translate(${x + 4} 66)`}>
                <rect x={-4.5} y={-22} width={9} height={14} rx={2} fill={oppKit.primary} stroke="rgba(0,0,0,0.3)" strokeWidth={0.4} />
                <line x1={-2} y1={-8} x2={-2} y2={0} stroke={oppKit.secondary} strokeWidth={2.4} />
                <line x1={2} y1={-8} x2={2} y2={0} stroke={oppKit.secondary} strokeWidth={2.4} />
                <circle cx={0} cy={-25.5} r={3.4} fill={["#d9a77c", "#8a5432", "#f1c7a5", "#b97f51"][i]} />
              </g>
            ))}

          {/* Ball */}
          <g
            style={{
              transform: target && flying ? `translate(${target.x}px, ${target.y}px) scale(0.55)` : "translate(60px, 70px) scale(1)",
              transition: "transform 0.6s cubic-bezier(0.3,0.6,0.4,1)",
            }}
          >
            <circle r={3.4} fill="#fff" stroke="#111" strokeWidth={0.5} />
            <path d="M0 -1.4 L1.3 -0.4 L0.8 1.2 L-0.8 1.2 L-1.3 -0.4 Z" fill="#111" />
          </g>
        </svg>

        {/* Tap targets */}
        {!result && (
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "12.5% 1fr 1fr 1fr 12.5%", gridTemplateRows: "24% 1fr 1fr 30%" }}>
            {ZONES.filter((z) => !keeperMode || !zoneHigh(z)).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => choose(z)}
                aria-label={s.zones[z]}
                className={cn("m-1 rounded-lg border-2 border-dashed border-white/70 bg-white/10 transition hover:scale-105 hover:bg-amber-300/40 focus-visible:bg-amber-300/40", keeperMode && "row-span-2")}
                style={{ gridColumn: zoneCol(z) + 2, gridRow: keeperMode ? "2 / span 2" : zoneHigh(z) ? 2 : 3 }}
              >
                <span className="text-lg drop-shadow">{keeperMode ? ["⬅️", "⬆️", "➡️"][zoneCol(z)] : "🎯"}</span>
              </button>
            ))}
          </div>
        )}

        {result && flying && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className={cn("animate-pop rounded-xl px-4 py-1.5 font-heading text-3xl font-black text-white shadow-lg sm:text-5xl", good ? "bg-emerald-600/90" : "bg-rose-600/90")} style={{ animationDelay: "0.55s" }}>
              {keeperMode ? (result.outcome === "goal" ? s.conceded : s.saved) : s.outcome[result.outcome]}
            </span>
          </div>
        )}
        {result && flying && good && <Confetti count={28} />}
      </div>

      {result && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{good ? s.afterGood : s.afterBad}</p>
          <Button size="lg" className="h-11" onClick={onDone} autoFocus>
            {t.next}
          </Button>
        </div>
      )}
    </div>
  );
}
