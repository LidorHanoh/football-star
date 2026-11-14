"use client";

import { useEffect, useRef, useState } from "react";
import type { Kit } from "@/lib/engine/people";
import { zoneCol, zoneHigh } from "@/lib/engine/set-piece";
import type { SetPiece, Zone } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { CareerDict } from "./helpers";

// ---------------------------------------------------------------------------
// Penalty, broadcast view from behind the spot. Tap where to shoot (or where
// to dive when you're the keeper) — the kick is taken right away and the
// match moves on by itself once the ball is in (or out).
// Scene units: 160 × 100. Goal mouth: x 40..120, crossbar y 26, goal line y 56.
// ---------------------------------------------------------------------------
const ZONES: Zone[] = [0, 1, 2, 3, 4, 5];
const GOAL = { l: 40, r: 120, top: 26, line: 56 };
const GX = [52, 80, 108];
const zx = (z: Zone) => GX[zoneCol(z)];
const zy = (z: Zone) => (zoneHigh(z) ? 33 : 49);
const SPOT = { x: 80, y: 86 };

const RUN = 620; // run-up
const FLIGHT = 480; // ball in the air
const AFTER = 750; // ball in the net / parried
const HOLD = 1300; // result on screen before the match continues

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
  /** Resolve with the chosen zone (quality is fixed); returns the result to animate. */
  onShoot: (zone: Zone, quality: number) => NonNullable<SetPiece["result"]>;
  onDone: () => void;
}) {
  const s = t.setPiece;
  const keeperMode = sp.kind === "penaltySave";
  const [result, setResult] = useState<SetPiece["result"] | null>(sp.result ?? null);
  const [clock, setClock] = useState(sp.result ? RUN + FLIGHT + AFTER : 0);
  const [idle, setIdle] = useState(0);
  const raf = useRef(0);
  const doneRef = useRef(onDone);
  const shootRef = useRef(onShoot);
  useEffect(() => {
    doneRef.current = onDone;
    shootRef.current = onShoot;
  });

  // Idle sway of the keeper while you choose.
  useEffect(() => {
    if (result) return;
    const start = performance.now();
    const loop = (now: number) => {
      setIdle(now - start);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [result]);

  // The kick plays out, then the match continues on its own.
  useEffect(() => {
    if (!result) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = RUN + FLIGHT + AFTER;
    const start = performance.now() - (reduced ? total : clock);
    let timer: ReturnType<typeof setTimeout>;
    const loop = (now: number) => {
      const ms = Math.min(total, now - start);
      setClock(ms);
      if (ms < total) raf.current = requestAnimationFrame(loop);
      else timer = setTimeout(() => doneRef.current(), HOLD);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per result
  }, [result]);

  function pick(z: Zone) {
    if (result) return;
    setClock(0);
    setResult(shootRef.current(z, 0.72));
  }

  // --- Timeline ---------------------------------------------------------------
  const runK = result ? clamp(clock / RUN, 0, 1) : 0;
  const flyK = result ? clamp((clock - RUN) / FLIGHT, 0, 1) : 0;
  const afterK = result ? clamp((clock - RUN - FLIGHT) / AFTER, 0, 1) : 0;
  const shown = afterK > 0.05;

  // Where the ball ends up.
  const target = result
    ? result.outcome === "miss"
      ? { x: zx(result.zone) + [-20, 0, 20][zoneCol(result.zone)], y: zoneHigh(result.zone) || zoneCol(result.zone) === 1 ? GOAL.top - 9 : zy(result.zone) }
      : result.outcome === "saved"
        ? { x: zx(result.keeper) * 0.85 + 80 * 0.15, y: zy(result.keeper) }
        : { x: zx(result.zone), y: zy(result.zone) }
    : SPOT;
  const bend = result ? [-6, 0, 6][zoneCol(result.zone)] : 0;
  const k = ease(flyK);
  let ball = {
    x: lerp(SPOT.x, target.x, k) - bend * Math.sin(Math.PI * k) * 0.5,
    y: lerp(SPOT.y, target.y, k) - 7 * Math.sin(Math.PI * k) * (result && zoneHigh(result.zone) ? 1 : 0.35),
    r: lerp(2.1, 1.05, k),
  };
  if (result && afterK > 0) {
    const a = ease(afterK);
    if (result.outcome === "goal") ball = { x: lerp(ball.x, ball.x + (80 - ball.x) * 0.1, a), y: lerp(ball.y, GOAL.line - 1, a), r: 1 };
    else if (result.outcome === "saved") {
      const dir = zoneCol(result.keeper) === 0 ? -1 : zoneCol(result.keeper) === 2 ? 1 : (result.zone % 2 ? 1 : -1);
      ball = { x: ball.x + dir * 34 * a, y: ball.y + 26 * a - 16 * Math.sin(Math.PI * afterK), r: lerp(1.1, 1.8, a) };
    } else ball = { x: ball.x + (ball.x - 80) * 0.35 * a, y: ball.y - 10 * a, r: lerp(1.05, 0.8, a) };
  }
  const ballZ = result ? 6 * Math.sin(Math.PI * k) * (result && zoneHigh(result.zone) ? 1 : 0.3) : 0;

  // Keeper: sways, then dives late (reacts as the ball is struck).
  const diveK = result ? ease(clamp((clock - RUN + 120) / (FLIGHT + 80), 0, 1)) : 0;
  const keeperZone = result?.keeper ?? 4;
  const keeperTo = { x: zx(keeperZone), y: zoneHigh(keeperZone) ? 44 : 55 };
  const keeperDir = zoneCol(keeperZone) === 0 ? -1 : zoneCol(keeperZone) === 2 ? 1 : 0;
  const sway = result ? 0 : Math.sin(idle / 420) * 2.2;
  const keeper = { x: lerp(80 + sway, keeperTo.x, diveK), y: lerp(GOAL.line, keeperTo.y, diveK * (keeperDir ? 1 : 0.3)) };

  // Taker: walks in from behind-left and strikes.
  const taker = { x: lerp(66, 76, ease(runK)), y: lerp(104, 92, ease(runK)) };
  const kicking = runK > 0.85 && flyK < 0.35;

  // Net bulge where the ball hits.
  const netHit = result?.outcome === "goal" && afterK > 0 ? { x: target.x, y: target.y, a: Math.sin(Math.PI * Math.min(1, afterK * 1.4)) } : null;

  const good = result ? (result.outcome === "goal") !== keeperMode : false;
  const keeperKit = keeperMode ? { shirt: "#f59e0b", shorts: "#111827" } : { shirt: "#16a34a", shorts: "#111827" };
  const takerKit = keeperMode ? oppKit : myKit;

  return (
    <div className="animate-rise grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-xl font-extrabold sm:text-2xl">
          <span className="me-2 rounded bg-amber-400 px-1.5 text-base text-black tabular-nums">{minute}&apos;</span>
          {keeperMode ? s.penaltySaveTitle : s.penaltyTitle}
        </h2>
        {!result && <p className="text-sm text-muted-foreground">{keeperMode ? s.pickDive : s.pickSide}</p>}
      </div>

      <div className={cn("relative overflow-hidden rounded-2xl border-4 border-black/40 bg-[#0d1a12] shadow-xl", netHit && netHit.a > 0.5 && "motion-safe:animate-[shake_0.3s_ease-in-out]")}>
        <svg viewBox="0 0 160 100" className="block aspect-[16/10] w-full" role="img" aria-label={keeperMode ? s.penaltySaveTitle : s.penaltyTitle}>
          <defs>
            <linearGradient id="pk-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#05070c" />
              <stop offset="1" stopColor="#1a2433" />
            </linearGradient>
            <linearGradient id="pk-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#245a28" />
              <stop offset="1" stopColor="#327a35" />
            </linearGradient>
            <radialGradient id="pk-light" cx="0.5" cy="0.55" r="0.65">
              <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#000" stopOpacity="0.35" />
            </radialGradient>
            <radialGradient id="pk-ball" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#fff" />
              <stop offset="0.75" stopColor="#e5e7eb" />
              <stop offset="1" stopColor="#9ca3af" />
            </radialGradient>
            <filter id="pk-blur">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>

          {/* Stand behind the goal: dark, soft-focus crowd */}
          <rect width="160" height="40" fill="url(#pk-sky)" />
          <g filter="url(#pk-blur)" opacity={0.75}>
            {Array.from({ length: 4 }, (_, row) =>
              Array.from({ length: 44 }, (_, i) => (
                <circle key={`${row}-${i}`} cx={i * 3.7 + (row % 2) * 1.8} cy={8 + row * 4.2} r={1.25} fill={[myKit.primary, oppKit.primary, "#334155", "#64748b", "#cbd5e1"][(i * 7 + row * 3) % 5]} opacity={0.7} />
              )),
            )}
          </g>
          {/* advertising boards */}
          <rect x="0" y="24" width="160" height="5" fill="#0b1220" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={i * 20 + 0.5} y="24.6" width="19" height="3.8" fill={["#0c4a6e", "#7c2d12", "#1e293b", "#064e3b"][i % 4]} />
          ))}

          {/* Grass in perspective with mowing bands */}
          <rect y="29" width="160" height="71" fill="url(#pk-grass)" />
          {Array.from({ length: 7 }, (_, i) => {
            const y0 = 29 + Math.pow(i / 7, 1.6) * 71;
            const y1 = 29 + Math.pow((i + 0.5) / 7, 1.6) * 71;
            return <rect key={i} y={y0} width="160" height={y1 - y0} fill="#fff" opacity={0.035} />;
          })}
          {/* lines: goal line, 6-yard box, penalty spot, box edge */}
          <g stroke="#fff" strokeOpacity={0.75} fill="none" strokeWidth={0.45}>
            <line x1="-5" y1={GOAL.line} x2="165" y2={GOAL.line} />
            <path d={`M28 ${GOAL.line} L22 66 L138 66 L132 ${GOAL.line}`} />
            <path d={`M2 ${GOAL.line} L-30 100 M158 ${GOAL.line} L190 100`} />
          </g>
          <ellipse cx={SPOT.x} cy={SPOT.y + 1} rx={1.4} ry={0.5} fill="#fff" opacity={0.8} />

          {/* Net (behind the posts) */}
          <Net netHit={netHit} />

          {/* Keeper */}
          <Body x={keeper.x} y={keeper.y} h={21} shirt={keeperKit.shirt} shorts={keeperKit.shorts} socks={keeperKit.shirt} skin="#c68f62" hair="#1f150e" front dive={diveK * keeperDir} reach={keeperDir === 0 ? diveK : 0} gloves you={keeperMode} />

          {/* Posts and crossbar in front of the net */}
          <g stroke="#f8fafc" strokeLinecap="round">
            <line x1={GOAL.l} y1={GOAL.line} x2={GOAL.l} y2={GOAL.top} strokeWidth={1.4} />
            <line x1={GOAL.r} y1={GOAL.line} x2={GOAL.r} y2={GOAL.top} strokeWidth={1.4} />
            <line x1={GOAL.l} y1={GOAL.top} x2={GOAL.r} y2={GOAL.top} strokeWidth={1.4} />
          </g>
          <line x1={GOAL.l + 0.5} y1={GOAL.top + 0.3} x2={GOAL.r - 0.5} y2={GOAL.top + 0.3} stroke="#000" strokeOpacity={0.25} strokeWidth={0.4} />

          {/* Ball shadow + ball */}
          <ellipse cx={ball.x + ballZ * 0.2} cy={Math.max(ball.y, lerp(SPOT.y, GOAL.line, k)) + ball.r * 0.8} rx={ball.r * 0.9} ry={ball.r * 0.3} fill="#000" opacity={result && afterK > 0 && result.outcome !== "saved" ? 0 : 0.35} />
          <g transform={`translate(${ball.x} ${ball.y})`}>
            <circle r={ball.r} fill="url(#pk-ball)" />
            <path transform={`rotate(${flyK * 720}) scale(${ball.r / 2})`} d="M0 -0.9 L0.85 -0.3 L0.55 0.75 L-0.55 0.75 L-0.85 -0.3 Z" fill="#334155" opacity={0.7} />
          </g>

          {/* Taker, from behind */}
          <Body x={taker.x} y={taker.y} h={30} shirt={takerKit.primary} shorts={takerKit.secondary === takerKit.primary ? "#111827" : takerKit.secondary} socks={takerKit.primary} skin="#d6a77a" hair="#2b1b12" stride={result ? runK * 9 : 0} kick={kicking} number={keeperMode ? undefined : playerNumber} numberColor={takerKit.text} you={!keeperMode} />

          {/* Broadcast vignette */}
          <rect width="160" height="100" fill="url(#pk-light)" pointerEvents="none" />
        </svg>

        {/* Tap targets on the goal */}
        {!result && (
          <div className="absolute grid grid-cols-3 grid-rows-2 gap-1" style={{ left: `${(GOAL.l / 160) * 100}%`, right: `${100 - (GOAL.r / 160) * 100}%`, top: `${(GOAL.top / 100) * 100}%`, bottom: `${100 - (GOAL.line / 100) * 100}%` }}>
            {ZONES.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => pick(z)}
                aria-label={s.zones[z]}
                className="group grid place-items-center rounded-md border border-white/0 transition hover:border-white/60 hover:bg-white/15 focus-visible:border-white focus-visible:bg-white/20 focus-visible:outline-none"
              >
                <span className="size-3 rounded-full border-2 border-white/70 bg-white/10 transition group-hover:scale-150 group-hover:bg-white/60" />
              </button>
            ))}
          </div>
        )}

        {/* Result, TV-graphic style */}
        {result && shown && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[8%] flex justify-center">
            <span className={cn("animate-pop rounded-md px-5 py-1.5 font-heading text-3xl font-black tracking-wide text-white uppercase shadow-lg sm:text-5xl", good ? "bg-emerald-600/95" : "bg-rose-700/95")}>
              {keeperMode ? (result.outcome === "goal" ? s.conceded : s.saved) : s.outcome[result.outcome]}
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[0.7rem] font-bold text-white" dir="auto">
          {keeperMode ? s.penaltySaveTitle : `${playerName} #${playerNumber}`}
        </span>
      </div>
      {result && shown && <p className="text-center text-sm text-muted-foreground">{good ? s.afterGood : s.afterBad}</p>}
    </div>
  );
}

/** Net with a bulge where the ball goes in. */
function Net({ netHit }: { netHit: { x: number; y: number; a: number } | null }) {
  const back = 8; // how far the net goes back (drawn as an inset)
  const push = (x: number, y: number) => {
    if (!netHit) return { x, y };
    const d = Math.hypot(x - netHit.x, (y - netHit.y) * 1.4);
    const f = Math.max(0, 1 - d / 16) * netHit.a * 2.4;
    return { x: x + (x - netHit.x) * 0.04 * f, y: y - f * 0.6 };
  };
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= 20; i++) {
    const x = lerp(GOAL.l + 3, GOAL.r - 3, i / 20);
    const pts = Array.from({ length: 9 }, (_, j) => push(x, lerp(GOAL.top + back * 0.4, GOAL.line - 1, j / 8)));
    lines.push(<polyline key={`v${i}`} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} />);
  }
  for (let j = 0; j <= 9; j++) {
    const y = lerp(GOAL.top + back * 0.4, GOAL.line - 1, j / 9);
    const pts = Array.from({ length: 21 }, (_, i) => push(lerp(GOAL.l + 3, GOAL.r - 3, i / 20), y));
    lines.push(<polyline key={`h${j}`} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} />);
  }
  return (
    <g>
      <path d={`M${GOAL.l} ${GOAL.top} L${GOAL.l + 3} ${GOAL.top + back * 0.4} L${GOAL.r - 3} ${GOAL.top + back * 0.4} L${GOAL.r} ${GOAL.top} Z M${GOAL.l} ${GOAL.top} L${GOAL.l + 3} ${GOAL.top + back * 0.4} L${GOAL.l + 3} ${GOAL.line - 1} L${GOAL.l} ${GOAL.line} Z M${GOAL.r} ${GOAL.top} L${GOAL.r - 3} ${GOAL.top + back * 0.4} L${GOAL.r - 3} ${GOAL.line - 1} L${GOAL.r} ${GOAL.line} Z`} fill="#fff" opacity={0.06} />
      <rect x={GOAL.l + 3} y={GOAL.top + back * 0.4} width={GOAL.r - GOAL.l - 6} height={GOAL.line - 1 - GOAL.top - back * 0.4} fill="#000" opacity={0.18} />
      <g fill="none" stroke="#fff" strokeOpacity={0.32} strokeWidth={0.22}>
        {lines}
      </g>
    </g>
  );
}

/**
 * A plain, realistic-proportioned footballer (no face, no outlines).
 * Origin at the feet; `h` is the height in scene units.
 */
function Body({ x, y, h, shirt, shorts, socks, skin, hair, front, dive = 0, reach = 0, gloves, stride = 0, kick, number, numberColor, you }: { x: number; y: number; h: number; shirt: string; shorts: string; socks: string; skin: string; hair: string; front?: boolean; dive?: number; reach?: number; gloves?: boolean; stride?: number; kick?: boolean; number?: number; numberColor?: string; you?: boolean }) {
  const u = h / 1.85; // metres → scene units
  const hipY = -0.95;
  const shY = -1.48;
  const legSwing = kick ? 0 : Math.sin(stride) * 0.22;
  const hand = gloves ? "#e5e7eb" : skin;
  // Keeper's arms: ready (low, wide) → reaching to the dive side / up.
  const armsUp = Math.abs(dive) > 0.2 || reach > 0.3;
  const rot = dive * 72;
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0} rx={u * (0.42 + Math.abs(dive) * 0.5)} ry={u * 0.1} fill="#000" opacity={0.35} />
      {you && <ellipse cx={0} cy={0} rx={u * 0.62} ry={u * 0.16} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={0.35} />}
      <g transform={`rotate(${rot} 0 ${-0.9 * u}) translate(0 ${-Math.abs(dive) * 0.25 * u}) scale(${u})`}>
        {/* legs */}
        {kick ? (
          <>
            <path d={`M-0.1 ${hipY} L-0.12 -0.48 L-0.12 0`} stroke={socks} strokeWidth={0.15} fill="none" strokeLinecap="round" />
            <path d={`M0.1 ${hipY} L0.2 -0.5 L0.36 -0.2`} stroke={socks} strokeWidth={0.15} fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d={`M-0.1 ${hipY} L${-0.13 + legSwing * 0.5} -0.48 L${-0.14 + legSwing} 0`} stroke={socks} strokeWidth={0.15} fill="none" strokeLinecap="round" />
            <path d={`M0.1 ${hipY} L${0.13 - legSwing * 0.5} -0.48 L${0.14 - legSwing} 0`} stroke={socks} strokeWidth={0.15} fill="none" strokeLinecap="round" />
          </>
        )}
        {/* shorts */}
        <path d={`M-0.21 ${hipY - 0.06} L0.21 ${hipY - 0.06} L0.23 ${hipY + 0.2} L0.02 ${hipY + 0.2} L0 ${hipY + 0.08} L-0.02 ${hipY + 0.2} L-0.23 ${hipY + 0.2} Z`} fill={shorts} />
        {/* arms (behind torso when front-on keeper is ready) */}
        {front ? (
          armsUp ? (
            <>
              <path d={`M-0.22 ${shY + 0.05} L-0.42 ${shY - 0.3} L-0.5 ${shY - 0.62}`} stroke={shirt} strokeWidth={0.12} fill="none" strokeLinecap="round" />
              <path d={`M0.22 ${shY + 0.05} L0.42 ${shY - 0.3} L0.5 ${shY - 0.62}`} stroke={shirt} strokeWidth={0.12} fill="none" strokeLinecap="round" />
              <circle cx={-0.5} cy={shY - 0.66} r={0.08} fill={hand} />
              <circle cx={0.5} cy={shY - 0.66} r={0.08} fill={hand} />
            </>
          ) : (
            <>
              <path d={`M-0.22 ${shY + 0.05} L-0.42 ${shY + 0.3} L-0.5 ${shY + 0.58}`} stroke={shirt} strokeWidth={0.12} fill="none" strokeLinecap="round" />
              <path d={`M0.22 ${shY + 0.05} L0.42 ${shY + 0.3} L0.5 ${shY + 0.58}`} stroke={shirt} strokeWidth={0.12} fill="none" strokeLinecap="round" />
              <circle cx={-0.5} cy={shY + 0.62} r={0.08} fill={hand} />
              <circle cx={0.5} cy={shY + 0.62} r={0.08} fill={hand} />
            </>
          )
        ) : (
          <>
            <path d={`M-0.22 ${shY + 0.05} L${-0.3 - (kick ? 0.2 : 0)} ${shY + 0.32} L${-0.3 - (kick ? 0.35 : 0) + legSwing * 0.5} ${shY + 0.58}`} stroke={shirt} strokeWidth={0.11} fill="none" strokeLinecap="round" />
            <path d={`M0.22 ${shY + 0.05} L${0.3 + (kick ? 0.15 : 0)} ${shY + 0.32} L${0.3 + (kick ? 0.2 : 0) - legSwing * 0.5} ${shY + 0.58}`} stroke={shirt} strokeWidth={0.11} fill="none" strokeLinecap="round" />
          </>
        )}
        {/* torso */}
        <path d={`M-0.21 ${hipY} L-0.25 ${shY + 0.04} Q0 ${shY - 0.06} 0.25 ${shY + 0.04} L0.21 ${hipY} Z`} fill={shirt} />
        <path d={`M0.04 ${hipY} L0.06 ${shY - 0.01} Q0.18 ${shY} 0.25 ${shY + 0.04} L0.21 ${hipY} Z`} fill="#000" opacity={0.15} />
        {number !== undefined && (
          <text x={0} y={shY + 0.36} textAnchor="middle" fontSize={0.3} fontWeight={900} fill={numberColor ?? "#fff"} fontFamily="Impact, 'Arial Black', sans-serif">
            {number}
          </text>
        )}
        {/* head: front shows the face skin with hair on top; back shows mostly hair */}
        <circle cx={0} cy={shY - 0.17} r={0.12} fill={front ? skin : hair} />
        {front ? <path d={`M-0.12 ${shY - 0.19} A0.12 0.12 0 0 1 0.12 ${shY - 0.19} Q0 ${shY - 0.24} -0.12 ${shY - 0.19} Z`} fill={hair} /> : <rect x={-0.035} y={shY - 0.06} width={0.07} height={0.06} fill={skin} />}
      </g>
    </g>
  );
}
