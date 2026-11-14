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
const idleOr = (ms: number) => ms;

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
      const dir = zoneCol(result.zone) === 0 ? -1 : zoneCol(result.zone) === 2 ? 1 : (result.keeper % 2 ? 1 : -1);
      ball = { x: ball.x + dir * 34 * a, y: ball.y + 26 * a - 16 * Math.sin(Math.PI * afterK), r: lerp(1.1, 1.8, a) };
    } else ball = { x: ball.x + (ball.x - 80) * 0.35 * a, y: ball.y - 10 * a, r: lerp(1.05, 0.8, a) };
  }
  const ballZ = result ? 6 * Math.sin(Math.PI * k) * (result && zoneHigh(result.zone) ? 1 : 0.3) : 0;

  // Keeper: sways, then dives late (reacts as the ball is struck).
  const diveK = result ? ease(clamp((clock - RUN + 120) / (FLIGHT + 80), 0, 1)) : 0;
  // On a save the keeper gets to where the ball went; otherwise he goes his own way.
  const keeperZone: Zone = result ? (result.outcome === "saved" ? result.zone : result.keeper) : 4;
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
  // Broadcast camera: pushes in on the goal as the ball flies, eases back after.
  const zoom = 1 + 0.16 * ease(flyK) - 0.06 * ease(afterK);
  const cam = `translate(80 44) scale(${zoom}) translate(-80 -44)`;
  // Ghost balls behind the real one while it's in the air.
  const trail = result && flyK > 0 && flyK < 1 ? [0.06, 0.12, 0.18].map((d) => {
    const kk = ease(Math.max(0, flyK - d));
    return { x: lerp(SPOT.x, target.x, kk) - bend * Math.sin(Math.PI * kk) * 0.5, y: lerp(SPOT.y, target.y, kk) - 7 * Math.sin(Math.PI * kk) * (zoneHigh(result.zone) ? 1 : 0.35), r: lerp(2.1, 1.05, kk), o: 0.35 - d * 1.6 };
  }) : [];
  // The crowd: jumps and camera flashes when the ball goes in.
  const roar = result?.outcome === "goal" && afterK > 0 ? Math.min(1, afterK * 2) : 0;
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

      <div dir="ltr" className={cn("relative overflow-hidden rounded-2xl border-4 border-black/40 bg-[#0d1a12] shadow-xl", netHit && netHit.a > 0.5 && "motion-safe:animate-[shake_0.3s_ease-in-out]")}>
        <svg viewBox="0 0 160 100" className="block aspect-[16/10] w-full" role="img" aria-label={keeperMode ? s.penaltySaveTitle : s.penaltyTitle}>
          <defs>
            <linearGradient id="pk-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#05070c" />
              <stop offset="1" stopColor="#1a2433" />
            </linearGradient>
            <linearGradient id="pk-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1f5224" />
              <stop offset="0.5" stopColor="#2d7031" />
              <stop offset="1" stopColor="#3b8a3d" />
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
              <feGaussianBlur stdDeviation="0.45" />
            </filter>
            <radialGradient id="pk-flood" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pk-post" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.6" stopColor="#e5e7eb" />
              <stop offset="1" stopColor="#9ca3af" />
            </linearGradient>
            <linearGradient id="pk-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.6" stopColor="#e5e7eb" />
              <stop offset="1" stopColor="#9ca3af" />
            </linearGradient>
          </defs>

          <g transform={cam}>
          {/* Floodlit stand behind the goal: three tiers of a soft-focus crowd */}
          <rect width="160" height="40" fill="url(#pk-sky)" />
          <ellipse cx="18" cy="-4" rx="30" ry="10" fill="url(#pk-flood)" />
          <ellipse cx="142" cy="-4" rx="30" ry="10" fill="url(#pk-flood)" />
          {[0, 1, 2].map((tier) => (
            <rect key={tier} x="-10" y={3 + tier * 7.4} width="180" height="7" fill={["#111827", "#162032", "#1b2639"][tier]} />
          ))}
          <g filter="url(#pk-blur)">
            {Array.from({ length: 6 }, (_, row) =>
              Array.from({ length: 62 }, (_, i) => {
                const n = (i * 7919 + row * 104729 + sp.seed) % 97;
                const jump = roar ? Math.abs(Math.sin(idleOr(clock) / 90 + i * 1.7 + row)) * 1.4 * roar : 0;
                return <circle key={`${row}-${i}`} cx={i * 2.65 + (row % 2) * 1.3 - 2} cy={5.5 + row * 3.7 - jump} r={1} fill={[myKit.primary, oppKit.primary, "#475569", "#94a3b8", "#e2e8f0", myKit.secondary][n % 6]} opacity={0.55 + (n % 5) * 0.08} />;
              }),
            )}
          </g>
          {/* camera flashes */}
          {roar > 0 &&
            Array.from({ length: 14 }, (_, i) => {
              const on = Math.sin(clock / 37 + i * 2.3) > 0.82;
              return on ? <circle key={i} cx={(i * 37 + sp.seed) % 160} cy={5 + ((i * 13) % 20)} r={0.9} fill="#fff" /> : null;
            })}
          {/* LED boards */}
          <rect x="-10" y="24" width="180" height="5.2" fill="#020617" />
          {Array.from({ length: 9 }, (_, i) => (
            <g key={i}>
              <rect x={i * 18.5 - 3} y="24.5" width="17.6" height="4.2" fill={["#0369a1", "#b91c1c", "#15803d", "#7c3aed"][i % 4]} opacity={0.85} />
              <rect x={i * 18.5 - 3} y="24.5" width="17.6" height="1.4" fill="#fff" opacity={0.18} />
            </g>
          ))}

          {/* Grass in perspective with mowing bands */}
          <rect y="29" width="160" height="71" fill="url(#pk-grass)" />
          {Array.from({ length: 9 }, (_, i) => {
            const y0 = 29 + Math.pow(i / 9, 1.5) * 71;
            const y1 = 29 + Math.pow((i + 1) / 9, 1.5) * 71;
            return <rect key={i} y={y0} width="160" height={y1 - y0} fill={i % 2 ? "#000" : "#fff"} opacity={i % 2 ? 0.05 : 0.04} />;
          })}
          {/* lines: goal line, 6-yard box, box edges */}
          <g stroke="#fff" strokeOpacity={0.8} fill="none" strokeWidth={0.5}>
            <line x1="-5" y1={GOAL.line} x2="165" y2={GOAL.line} />
            <path d={`M28 ${GOAL.line} L22 66 L138 66 L132 ${GOAL.line}`} />
            <path d={`M2 ${GOAL.line} L-30 100 M158 ${GOAL.line} L190 100`} />
          </g>
          <ellipse cx={SPOT.x} cy={SPOT.y + 1} rx={1.5} ry={0.55} fill="#fff" opacity={0.85} />
          {/* the goal's shadow on the grass */}
          <path d={`M${GOAL.l} ${GOAL.line} L${GOAL.l + 5} ${GOAL.line - 2.5} L${GOAL.r - 5} ${GOAL.line - 2.5} L${GOAL.r} ${GOAL.line} Z`} fill="#000" opacity={0.18} />

          {/* Net (behind the posts) */}
          <Net netHit={netHit} />

          {/* Keeper */}
          <Body x={keeper.x} y={keeper.y} h={21} shirt={keeperKit.shirt} shorts={keeperKit.shorts} socks={keeperKit.shirt} skin="#c68f62" hair="#1f150e" front dive={diveK * keeperDir} reach={keeperDir === 0 ? diveK : 0} gloves you={keeperMode} />

          {/* Posts and crossbar in front of the net: round, lit from the left */}
          <rect x={GOAL.l - 0.8} y={GOAL.top - 0.8} width={1.6} height={GOAL.line - GOAL.top + 0.8} rx={0.8} fill="url(#pk-post)" />
          <rect x={GOAL.r - 0.8} y={GOAL.top - 0.8} width={1.6} height={GOAL.line - GOAL.top + 0.8} rx={0.8} fill="url(#pk-post)" />
          <rect x={GOAL.l - 0.8} y={GOAL.top - 0.8} width={GOAL.r - GOAL.l + 1.6} height={1.6} rx={0.8} fill="url(#pk-bar)" />

          {/* Ball trail + shadow + ball */}
          {trail.map((g, i) => (
            <circle key={i} cx={g.x} cy={g.y} r={g.r * 0.9} fill="#fff" opacity={Math.max(0, g.o)} />
          ))}
          <ellipse cx={ball.x + ballZ * 0.2} cy={Math.max(ball.y, lerp(SPOT.y, GOAL.line, k)) + ball.r * 0.8} rx={ball.r * 0.9} ry={ball.r * 0.3} fill="#000" opacity={result && afterK > 0 && result.outcome !== "saved" ? 0 : 0.35} />
          <g transform={`translate(${ball.x} ${ball.y})`}>
            <circle r={ball.r} fill="url(#pk-ball)" />
            <path transform={`rotate(${flyK * 720}) scale(${ball.r / 2})`} d="M0 -0.9 L0.85 -0.3 L0.55 0.75 L-0.55 0.75 L-0.85 -0.3 Z" fill="#334155" opacity={0.7} />
          </g>

          {/* Taker, from behind */}
          <Body x={taker.x} y={taker.y} h={30} shirt={takerKit.primary} shorts={takerKit.secondary === takerKit.primary ? "#111827" : takerKit.secondary} socks={takerKit.primary} skin="#d6a77a" hair="#2b1b12" stride={result ? runK * 9 : 0} kick={kicking} number={keeperMode ? undefined : playerNumber} numberColor={takerKit.text} you={!keeperMode} />

          </g>
          {/* Broadcast vignette */}
          <rect width="160" height="100" fill="url(#pk-light)" pointerEvents="none" />
          {roar > 0 && good && <rect width="160" height="100" fill="#fff" opacity={Math.max(0, 0.35 - afterK * 0.6)} pointerEvents="none" />}
        </svg>

        {/* Tap targets on the goal */}
        {!result && (
          <div dir="ltr" className="absolute grid grid-cols-3 grid-rows-2 gap-1" style={{ left: `${(GOAL.l / 160) * 100}%`, right: `${100 - (GOAL.r / 160) * 100}%`, top: `${(GOAL.top / 100) * 100}%`, bottom: `${100 - (GOAL.line / 100) * 100}%` }}>
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
  // Side netting, drawn in perspective.
  const side = (x0: number, x1: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const y = lerp(GOAL.top, GOAL.line, i / 5);
      return <line key={`s${x0}${i}`} x1={x0} y1={y} x2={x1} y2={lerp(GOAL.top + back * 0.4, GOAL.line - 1, i / 5)} />;
    });
  return (
    <g>
      <g fill="none" stroke="#fff" strokeOpacity={0.28} strokeWidth={0.22}>
        {side(GOAL.l, GOAL.l + 3)}
        {side(GOAL.r, GOAL.r - 3)}
      </g>
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
        {(kick
          ? [
              [-0.1, -0.12, -0.12, 0],
              [0.1, 0.2, 0.36, -0.2],
            ]
          : [
              [-0.1, -0.13 + legSwing * 0.5, -0.14 + legSwing, 0],
              [0.1, 0.13 - legSwing * 0.5, 0.14 - legSwing, 0],
            ]
        ).map(([hx, kx, fx, fy], i) => (
          <g key={i} fill="none" strokeLinecap="round">
            {/* thigh (skin), shin (sock), boot */}
            <path d={`M${hx} ${hipY} L${kx} -0.48`} stroke={skin} strokeWidth={0.17} />
            <path d={`M${kx} -0.5 L${fx} ${fy - 0.04}`} stroke={socks} strokeWidth={0.15} />
            <path d={`M${fx - 0.05} ${fy - 0.02} L${fx + 0.07} ${fy - 0.02}`} stroke="#111" strokeWidth={0.09} />
          </g>
        ))}
        {/* shorts */}
        <path d={`M-0.21 ${hipY - 0.06} L0.21 ${hipY - 0.06} L0.23 ${hipY + 0.2} L0.02 ${hipY + 0.2} L0 ${hipY + 0.08} L-0.02 ${hipY + 0.2} L-0.23 ${hipY + 0.2} Z`} fill={shorts} />
        {/* arms (behind torso when front-on keeper is ready) */}
        {front ? (
          armsUp ? (
            <>
              <path d={`M-0.22 ${shY + 0.05} L-0.42 ${shY - 0.3} L-0.5 ${shY - 0.62}`} stroke={shirt} strokeWidth={0.12} fill="none" strokeLinecap="round" />
              <path d={`M0.22 ${shY + 0.05} L0.42 ${shY - 0.3} L0.5 ${shY - 0.62}`} stroke={shirt} strokeWidth={0.12} fill="none" strokeLinecap="round" />
              <circle cx={-0.5} cy={shY - 0.66} r={gloves ? 0.11 : 0.08} fill={hand} />
              <circle cx={0.5} cy={shY - 0.66} r={gloves ? 0.11 : 0.08} fill={hand} />
            </>
          ) : (
            <>
              <path d={`M-0.22 ${shY + 0.05} L-0.42 ${shY + 0.3} L-0.5 ${shY + 0.58}`} stroke={shirt} strokeWidth={0.12} fill="none" strokeLinecap="round" />
              <path d={`M0.22 ${shY + 0.05} L0.42 ${shY + 0.3} L0.5 ${shY + 0.58}`} stroke={shirt} strokeWidth={0.12} fill="none" strokeLinecap="round" />
              <circle cx={-0.5} cy={shY + 0.62} r={gloves ? 0.11 : 0.08} fill={hand} />
              <circle cx={0.5} cy={shY + 0.62} r={gloves ? 0.11 : 0.08} fill={hand} />
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
