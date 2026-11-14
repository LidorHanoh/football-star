"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Kit } from "@/lib/engine/people";
import { zoneCol, zoneHigh } from "@/lib/engine/set-piece";
import type { SetPiece, Zone } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { CareerDict } from "./helpers";
import { Confetti } from "./highlights";

// ---------------------------------------------------------------------------
// Penalty, seen from behind the taker (or from behind your own goal when
// you're the keeper). 1) tap a corner, 2) stop the power bar, 3) watch.
// Scene units: 160 × 100. Goal mouth: x 40..120, crossbar y 24, line y 54.
// ---------------------------------------------------------------------------
const ZONES: Zone[] = [0, 1, 2, 3, 4, 5];
const GX = [52, 80, 108];
const zx = (z: Zone) => GX[zoneCol(z)];
const zy = (z: Zone) => (zoneHigh(z) ? 31 : 47);
const SPOT = { x: 80, y: 84 };

type Stage = "aim" | "power" | "runup" | "flight" | "done";
const RUNUP = 750;
const FLIGHT = 620;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function SetPieceGame({
  sp,
  t,
  myKit,
  oppKit,
  minute,
  playerNumber = 9,
  playerName = "",
  onShoot,
  onDone,
}: {
  sp: SetPiece;
  t: CareerDict;
  myKit: Kit;
  oppKit: Kit;
  minute: number;
  playerNumber?: number;
  playerName?: string;
  /** Resolve with the chosen zone and timing (0..1); returns the result to animate. */
  onShoot: (zone: Zone, quality: number) => NonNullable<SetPiece["result"]>;
  onDone: () => void;
}) {
  const s = t.setPiece;
  const keeperMode = sp.kind === "penaltySave";
  const [stage, setStage] = useState<Stage>(sp.result ? "done" : "aim");
  const [zone, setZone] = useState<Zone | null>(null);
  const [result, setResult] = useState<SetPiece["result"] | null>(sp.result ?? null);
  const [clock, setClock] = useState(0); // ms since the current stage began
  const [quality, setQuality] = useState<number | null>(null);
  const raf = useRef(0);
  const shootRef = useRef(onShoot);
  useEffect(() => {
    shootRef.current = onShoot;
  });

  // One animation loop drives the idle bounce, the meter, the run-up and the flight.
  useEffect(() => {
    if (stage === "done") return;
    const start = performance.now();
    const loop = (now: number) => {
      const ms = now - start;
      setClock(ms);
      if (stage === "runup" && ms >= RUNUP) setStage("flight");
      else if (stage === "flight" && ms >= FLIGHT + 900) setStage("done");
      else raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [stage]);

  const meter = stage === "power" ? (Math.sin(clock / 230 - Math.PI / 2) + 1) / 2 : 0; // 0..1 power bar position

  function pick(z: Zone) {
    if (stage !== "aim") return;
    setZone(z);
    setStage("power");
  }

  function strike() {
    if (stage !== "power" || zone === null) return;
    const q = clamp(1 - Math.abs(meter - 0.5) * 2, 0, 1);
    setQuality(q);
    setResult(shootRef.current(zone, q));
    setClock(0);
    setStage("runup");
  }

  // --- Where everything is right now ------------------------------------------
  const flightK = stage === "flight" ? clamp(clock / FLIGHT, 0, 1) : stage === "done" ? 1 : 0;
  const afterK = stage === "flight" ? clamp((clock - FLIGHT) / 600, 0, 1) : stage === "done" ? 1 : 0;
  const target = result
    ? result.outcome === "miss"
      ? { x: zx(result.zone) + [-22, 0, 22][zoneCol(result.zone)], y: zoneHigh(result.zone) || zoneCol(result.zone) === 1 ? 12 : zy(result.zone) }
      : result.outcome === "saved"
        ? { x: zx(result.keeper) + [8, 0, -8][zoneCol(result.keeper)] * 0.3, y: zy(result.keeper) }
        : { x: zx(result.zone), y: zy(result.zone) }
    : SPOT;
  // Curve: the ball bends a little towards the middle on the way.
  const bend = result ? [-9, 0, 9][zoneCol(result.zone)] : 0;
  const k = ease(flightK);
  let ball = {
    x: lerp(SPOT.x, target.x, k) - bend * Math.sin(Math.PI * k) * 0.4,
    y: lerp(SPOT.y, target.y, k) - 10 * Math.sin(Math.PI * k) * (result && zoneHigh(result.zone) ? 1 : 0.4),
    r: lerp(3.4, 1.55, k),
  };
  if (result && afterK > 0) {
    if (result.outcome === "goal") ball = { x: ball.x + (80 - ball.x) * 0.08 * afterK, y: lerp(ball.y, 52, ease(afterK)), r: 1.5 };
    else if (result.outcome === "saved") ball = { x: ball.x + [-30, 0, 30][zoneCol(result.keeper)] * ease(afterK) + (zoneCol(result.keeper) === 1 ? 20 * afterK : 0), y: ball.y - 14 * Math.sin(Math.PI * afterK) + 18 * afterK, r: lerp(1.6, 2.4, afterK) };
    else ball = { x: ball.x + (ball.x - 80) * 0.3 * afterK, y: ball.y - 8 * afterK, r: lerp(1.55, 1.2, afterK) };
  }
  const shadowY = lerp(SPOT.y + 2.5, 54, k);

  // Keeper: bounces on the line, dives when the ball is struck.
  const diveK = result ? (stage === "flight" ? ease(clamp(clock / (FLIGHT * 0.8), 0, 1)) : stage === "done" ? 1 : 0) : 0;
  const keeperCol = result ? zoneCol(result.keeper) : 1;
  const keeperHigh = result ? zoneHigh(result.keeper) : false;
  const idle = stage === "aim" || stage === "power" || stage === "runup" ? Math.sin(clock / 160) : 0;
  const kx = 80 + (GX[keeperCol] - 80) * diveK * 0.95;
  const ky = 54 - (keeperHigh ? 9 : 2) * Math.sin(Math.PI * Math.min(1, diveK * 1.15)) * (keeperCol === 1 ? 0.6 : 1);
  const kTilt = [-72, 0, 72][keeperCol] * diveK;

  // Taker: runs up from behind, plants and swings.
  const runK = stage === "runup" ? clamp(clock / RUNUP, 0, 1) : stage === "aim" || stage === "power" ? 0 : 1;
  const taker = { x: lerp(SPOT.x - 13, SPOT.x - 4, ease(runK)), y: lerp(SPOT.y + 12, SPOT.y + 4, ease(runK)) };
  const kicking = stage === "flight" && clock < 260;
  const goalHit = result?.outcome === "goal" && afterK > 0;
  const good = result ? (keeperMode ? result.outcome !== "goal" : result.outcome === "goal") : false;
  const shooterKit = keeperMode ? oppKit : myKit;
  const keeperShirt = keeperMode ? "#f59e0b" : "#22c55e";
  const netPush = goalHit ? Math.sin(Math.PI * Math.min(1, afterK * 1.4)) * 2.2 : 0;

  return (
    <div className="animate-rise overflow-hidden rounded-2xl border-2 border-amber-400 bg-card shadow-xl">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-400 to-amber-300 px-4 py-2 text-black">
        <h3 className="font-heading text-lg font-extrabold sm:text-xl">
          <span className="me-2 rounded bg-black px-1.5 text-sm text-amber-300 tabular-nums">{minute}&apos;</span>
          {keeperMode ? s.penaltySaveTitle : s.penaltyTitle}
        </h3>
      </div>

      <div className={cn("relative select-none", goalHit && "animate-[shake_0.4s_ease-in-out_2]")} dir="ltr">
        <svg viewBox="0 0 160 100" className="block w-full" style={{ direction: "ltr" }} aria-hidden>
          <defs>
            <linearGradient id="pk-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1530" />
              <stop offset="1" stopColor="#1e3a5f" />
            </linearGradient>
            <radialGradient id="pk-light" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pk-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2e7d32" />
              <stop offset="1" stopColor="#43a047" />
            </linearGradient>
            <radialGradient id="pk-ball" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#fff" />
              <stop offset="0.75" stopColor="#e5e7eb" />
              <stop offset="1" stopColor="#94a3b8" />
            </radialGradient>
            <pattern id="pk-net" width="2.6" height="2.6" patternUnits="userSpaceOnUse">
              <path d="M0 0 L2.6 2.6 M2.6 0 L0 2.6" stroke="rgba(255,255,255,0.45)" strokeWidth="0.18" />
            </pattern>
          </defs>

          {/* Night sky, floodlights, stands */}
          <rect width="160" height="56" fill="url(#pk-sky)" />
          {[12, 148].map((x) => (
            <g key={x}>
              <circle cx={x} cy={4} r={14} fill="url(#pk-light)" opacity={0.5} />
              <rect x={x - 4} y={1} width={8} height={4} rx={0.6} fill="#f8fafc" />
            </g>
          ))}
          {Array.from({ length: 4 }, (_, row) => (
            <g key={row} className={good && stage === "done" ? "animate-[crowd_0.4s_ease-in-out_infinite]" : undefined} style={{ animationDelay: `${row * 0.1}s` }}>
              {Array.from({ length: 46 }, (_, i) => (
                <circle key={i} cx={2 + i * 3.5 + (row % 2) * 1.7} cy={10 + row * 3.4} r={1.25} fill={[shooterKit.primary, "#e2e8f0", "#64748b", oppKit.primary, "#334155", "#fbbf24"][(i * 7 + row * 3) % 6]} opacity={0.85} />
              ))}
            </g>
          ))}
          {/* Camera flashes */}
          {stage === "flight" &&
            [18, 47, 66, 101, 133, 150].map((x, i) => <circle key={x} cx={x} cy={11 + (i % 3) * 3} r={1.4} fill="#fff" opacity={(clock / 90 + i) % 2 < 1 ? 0.95 : 0} />)}
          {/* Ad boards */}
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={i * 20} y={22.5} width={19.6} height={3.6} fill={["#0ea5e9", "#f59e0b", "#e11d48", "#10b981"][i % 4]} opacity={0.9} />
          ))}

          {/* Pitch with mowing stripes and perspective lines */}
          <rect y="26" width="160" height="74" fill="url(#pk-grass)" />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M0 ${54 + i * i * 1.1} L160 ${54 + i * i * 1.1} L160 ${54 + (i + 1) * (i + 1) * 1.1} L0 ${54 + (i + 1) * (i + 1) * 1.1} Z`} fill={i % 2 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"} />
          ))}
          <g fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.5">
            <path d="M0 54 L160 54" />
            <path d="M28 54 L20 61 L140 61 L132 54" />
            <path d="M2 54 L-30 100 M158 54 L190 100" />
            <path d="M-10 74 L170 74" />
            <path d="M58 74 Q80 81 102 74" />
          </g>
          <ellipse cx={SPOT.x} cy={SPOT.y + 2.6} rx={1.3} ry={0.5} fill="#fff" />

          {/* Net (depth), posts and crossbar */}
          <g transform={`translate(0 ${netPush * 0.2})`}>
            <path d={`M40 24 L48 ${29 + netPush} L112 ${29 + netPush} L120 24 Z`} fill="url(#pk-net)" />
            <path d={`M48 ${29 + netPush} L48 52 L112 52 L112 ${29 + netPush} Z`} fill="rgba(15,23,42,0.35)" />
            <path d={`M48 ${29 + netPush} L48 52 L112 52 L112 ${29 + netPush} Z`} fill="url(#pk-net)" />
            <path d="M40 24 L48 29 L48 52 L40 54 Z" fill="url(#pk-net)" />
            <path d="M120 24 L112 29 L112 52 L120 54 Z" fill="url(#pk-net)" />
          </g>
          <path d="M40 54 L40 24 L120 24 L120 54" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M40 54 L40 24 L120 24 L120 54" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.4" transform="translate(0.6 0.6)" />

          {/* Keeper */}
          <g transform={`translate(${kx} ${ky}) rotate(${kTilt} 0 -9)`}>
            <ellipse cx={0} cy={0.5} rx={5} ry={1.1} fill="rgba(0,0,0,0.25)" transform={`rotate(${-kTilt} 0 -9)`} />
            <CartoonBody shirt={keeperShirt} shorts="#111827" socks="#111827" skin="#e0ac83" hair="#2b1b12" size={1} pose={diveK > 0.05 ? "dive" : "ready"} bob={idle} gloves front />
          </g>

          {/* Ball shadow + ball */}
          <ellipse cx={ball.x} cy={stage === "flight" || stage === "done" ? Math.max(shadowY, ball.y + 1) : SPOT.y + 2.6} rx={ball.r * 0.9} ry={ball.r * 0.3} fill="rgba(0,0,0,0.3)" />
          <g transform={`translate(${ball.x} ${ball.y}) rotate(${flightK * 900 + afterK * 300})`}>
            <circle r={ball.r} fill="url(#pk-ball)" stroke="#0f172a" strokeWidth={0.25} />
            <path d={`M0 ${-ball.r * 0.45} L${ball.r * 0.42} ${-ball.r * 0.12} L${ball.r * 0.26} ${ball.r * 0.38} L${-ball.r * 0.26} ${ball.r * 0.38} L${-ball.r * 0.42} ${-ball.r * 0.12} Z`} fill="#0f172a" />
          </g>

          {/* Taker from behind (you, unless you're the keeper) */}
          <g transform={`translate(${taker.x} ${taker.y})`}>
            <ellipse cx={0} cy={0.6} rx={5.5} ry={1.3} fill="rgba(0,0,0,0.3)" />
            <CartoonBody shirt={shooterKit.primary} shorts={shooterKit.secondary === shooterKit.primary ? "#111827" : shooterKit.secondary} socks={shooterKit.primary} skin="#d9a27a" hair="#1f140d" size={1.45} pose={kicking ? "kick" : stage === "runup" ? "run" : "stand"} bob={stage === "runup" ? Math.sin(clock / 70) : 0} back number={keeperMode ? 10 : playerNumber} numberColor={shooterKit.text} name={keeperMode ? "" : playerName} />
          </g>
        </svg>

        {/* Step 1: pick a corner */}
        {stage === "aim" && (
          <div className="absolute" style={{ left: "23%", right: "23%", top: "22%", bottom: "44%" }}>
            <div className="grid size-full grid-cols-3 grid-rows-2 gap-1">
              {ZONES.filter((z) => !keeperMode || zoneHigh(z)).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => pick(z)}
                  aria-label={s.zones[z]}
                  className={cn("group grid place-items-center rounded-md border-2 border-dashed border-white/60 bg-white/5 transition hover:border-amber-300 hover:bg-amber-300/30", keeperMode && "row-span-2")}
                  style={{ gridColumn: zoneCol(z) + 1, gridRow: keeperMode ? "1 / span 2" : zoneHigh(z) ? 1 : 2 }}
                >
                  <span className="grid size-7 place-items-center rounded-full border-2 border-white/80 text-sm transition group-hover:scale-125 group-hover:border-amber-300 sm:size-9">
                    {keeperMode ? ["⬅", "⬆", "➡"][zoneCol(z)] : <span className="size-2 rounded-full bg-white" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Aim marker */}
        {zone !== null && stage === "power" && !keeperMode && (
          <span className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-[3px] border-amber-300 shadow-[0_0_12px_#fcd34d]" style={{ left: `${(zx(zone) / 160) * 100}%`, top: `${(zy(zone) / 100) * 100}%` }} />
        )}

        {/* Result banner */}
        {result && (stage === "done" || (stage === "flight" && clock > FLIGHT)) && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className={cn("animate-pop rounded-2xl px-5 py-2 font-heading text-4xl font-black tracking-wide text-white shadow-2xl sm:text-6xl", good ? "bg-emerald-600/90" : "bg-rose-600/90")}>
              {keeperMode ? (result.outcome === "goal" ? s.conceded : s.saved) : s.outcome[result.outcome]}
            </span>
          </div>
        )}
        {result && stage === "done" && good && <Confetti count={40} />}
      </div>

      {/* Controls */}
      <div className="grid gap-3 p-4">
        {stage === "aim" && <p className="text-sm text-muted-foreground">{keeperMode ? s.diveHint : s.penaltyHint}</p>}
        {stage === "power" && (
          <>
            <p className="text-sm font-medium">{keeperMode ? s.reactHint : s.powerHint}</p>
            <div className="relative h-5 overflow-hidden rounded-full bg-gradient-to-r from-rose-500 via-emerald-500 to-rose-500" role="presentation">
              <div className="absolute inset-y-0 left-[38%] w-[24%] border-x-2 border-white/80 bg-emerald-300/40" />
              <div className="absolute inset-y-[-2px] w-1.5 -translate-x-1/2 rounded bg-white shadow-[0_0_6px_#000]" style={{ left: `${meter * 100}%` }} />
            </div>
            <Button size="lg" className="h-14 text-lg font-black" onClick={strike} autoFocus>
              {keeperMode ? s.dive : s.shoot}
            </Button>
          </>
        )}
        {(stage === "runup" || stage === "flight") && quality !== null && (
          <p className="text-center text-sm font-bold">{quality > 0.8 ? s.perfect : quality > 0.5 ? s.good : s.poor}</p>
        )}
        {stage === "done" && result && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{good ? s.afterGood : s.afterBad}</p>
            <Button size="lg" className="h-11" onClick={onDone} autoFocus>
              {t.next}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A chunky cartoon footballer (big head, outlines). Origin at the feet.
// ---------------------------------------------------------------------------
function CartoonBody({
  shirt,
  shorts,
  socks,
  skin,
  hair,
  size,
  pose,
  bob,
  back,
  front,
  gloves,
  number,
  numberColor,
  name,
}: {
  shirt: string;
  shorts: string;
  socks: string;
  skin: string;
  hair: string;
  size: number;
  pose: "stand" | "run" | "kick" | "ready" | "dive";
  bob: number;
  back?: boolean;
  front?: boolean;
  gloves?: boolean;
  number?: number;
  numberColor?: string;
  name?: string;
}) {
  const o = "#1a1a1a";
  const sw = 0.55;
  const y = -Math.abs(bob) * 0.8;
  const legL = pose === "kick" ? -10 : pose === "run" ? bob * 22 : pose === "ready" ? -12 : pose === "dive" ? -18 : -4;
  const legR = pose === "kick" ? 55 : pose === "run" ? -bob * 22 : pose === "ready" ? 12 : pose === "dive" ? 18 : 4;
  const armL = pose === "ready" ? -50 : pose === "dive" ? -150 : pose === "kick" ? -60 : pose === "run" ? -bob * 30 - 15 : -12;
  const armR = pose === "ready" ? 50 : pose === "dive" ? 150 : pose === "kick" ? 45 : pose === "run" ? bob * 30 + 15 : 12;
  return (
    <g transform={`scale(${size}) translate(0 ${y})`}>
      {/* legs */}
      {[
        [-1.6, legL],
        [1.6, legR],
      ].map(([x, a], i) => (
        <g key={i} transform={`translate(${x} -8) rotate(${a})`}>
          <rect x={-1.1} y={0} width={2.2} height={4.2} rx={1} fill={skin} stroke={o} strokeWidth={sw} />
          <rect x={-1.15} y={3.4} width={2.3} height={4.2} rx={1} fill={socks} stroke={o} strokeWidth={sw} />
          <ellipse cx={0.2} cy={7.8} rx={1.6} ry={0.9} fill="#111" stroke={o} strokeWidth={sw * 0.6} />
        </g>
      ))}
      {/* shorts */}
      <path d="M-4 -11 L4 -11 L4.4 -6.8 L0.6 -6.8 L0 -8 L-0.6 -6.8 L-4.4 -6.8 Z" fill={shorts} stroke={o} strokeWidth={sw} strokeLinejoin="round" />
      {/* arms */}
      {[
        [-4, armL],
        [4, armR],
      ].map(([x, a], i) => (
        <g key={i} transform={`translate(${x} -17.5) rotate(${a})`}>
          <rect x={-1} y={0} width={2} height={3} rx={0.9} fill={shirt} stroke={o} strokeWidth={sw} />
          <rect x={-0.85} y={2.4} width={1.7} height={3.6} rx={0.8} fill={skin} stroke={o} strokeWidth={sw} />
          {gloves && <circle cx={0} cy={6.4} r={1.4} fill="#f8fafc" stroke={o} strokeWidth={sw} />}
        </g>
      ))}
      {/* torso */}
      <path d="M-4.4 -18.5 Q0 -20 4.4 -18.5 L4.2 -10.6 L-4.2 -10.6 Z" fill={shirt} stroke={o} strokeWidth={sw} strokeLinejoin="round" />
      {back && number !== undefined && (
        <>
          {name && (
            <text x={0} y={-16.6} textAnchor="middle" fontSize={1.5} fontWeight={900} fill={numberColor} style={{ textTransform: "uppercase" }}>
              {name.split(" ").slice(-1)[0].slice(0, 10)}
            </text>
          )}
          <text x={0} y={-11.8} textAnchor="middle" fontSize={4.4} fontWeight={900} fill={numberColor} stroke={o} strokeWidth={0.2}>
            {number}
          </text>
        </>
      )}
      {/* head (big, cartoon) */}
      <g transform="translate(0 -23.5)">
        <circle cx={-4.1} cy={0.6} r={1.1} fill={skin} stroke={o} strokeWidth={sw} />
        <circle cx={4.1} cy={0.6} r={1.1} fill={skin} stroke={o} strokeWidth={sw} />
        <ellipse cx={0} cy={0} rx={4.2} ry={4.6} fill={skin} stroke={o} strokeWidth={sw} />
        {back ? (
          <path d="M-4.2 0.5 Q-4.6 -5 0 -5.2 Q4.6 -5 4.2 0.5 Q2 -1 0 1.8 Q-2 -1 -4.2 0.5 Z" fill={hair} stroke={o} strokeWidth={sw} />
        ) : (
          <>
            <path d="M-4.2 -0.6 Q-4.4 -5.4 0 -5.3 Q4.4 -5.4 4.2 -0.6 Q3.5 -3 1 -3 Q-1.5 -3.4 -4.2 -0.6 Z" fill={hair} stroke={o} strokeWidth={sw} />
            {front && (
              <>
                <ellipse cx={-1.5} cy={0.3} rx={0.9} ry={1.1} fill="#fff" stroke={o} strokeWidth={0.3} />
                <ellipse cx={1.5} cy={0.3} rx={0.9} ry={1.1} fill="#fff" stroke={o} strokeWidth={0.3} />
                <circle cx={pose === "dive" ? -1.2 : -1.4} cy={0.5} r={0.45} fill={o} />
                <circle cx={pose === "dive" ? 1.8 : 1.6} cy={0.5} r={0.45} fill={o} />
                <path d={pose === "dive" ? "M-1 2.6 Q0 3.8 1 2.6 Z" : "M-1.2 2.5 Q0 3.2 1.2 2.5"} fill={pose === "dive" ? o : "none"} stroke={o} strokeWidth={0.4} strokeLinecap="round" />
              </>
            )}
          </>
        )}
      </g>
    </g>
  );
}
