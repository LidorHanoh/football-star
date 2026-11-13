"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { awayKit, type Kit } from "@/lib/engine/people";
import { Rng } from "@/lib/engine/rng";
import type { Highlight } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

// Pitch in metres (105 × 68). We always attack to the right.
export const W = 105;
export const H = 68;
const DURATION = 5600; // ms per highlight at normal speed

type P = { x: number; y: number };
interface Frame {
  at: number; // 0..1
  ball: P;
  /** Ball height (m) at this frame, for lofted passes and shots. */
  z?: number;
}
interface Script {
  frames: Frame[];
  /** Start → end position of each player (0 = you). */
  mates: [P, P][];
  opps: [P, P][];
  keeper: [P, P];
  /** When the ball reaches the goal / post / keeper (0..1). */
  impact: number;
  outcome: "goal" | "save" | "post";
  /** Where you run to celebrate. */
  celebrate?: P;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Build a deterministic little play from the highlight's seed. */
function buildScript(h: Highlight, isKeeper: boolean): Script {
  const r = new Rng(h.seed);
  const side = r.chance(0.5) ? 1 : -1; // attack down the top or bottom side
  const y = (v: number) => H / 2 + side * v;

  if (h.kind === "save" || isKeeper) {
    // Opponents attack our goal (left); you are the keeper.
    const shooter: P = { x: r.range(14, 22), y: y(r.range(-8, 8)) };
    const target: P = { x: 1.2, y: H / 2 + r.range(-3, 3) };
    return {
      frames: [
        { at: 0, ball: { x: 45, y: y(18) } },
        { at: 0.35, ball: { x: 28, y: y(r.range(4, 14)) }, z: 2 },
        { at: 0.6, ball: shooter },
        { at: 0.78, ball: { x: 3.5, y: target.y }, z: 1.2 },
        { at: 1, ball: { x: 9, y: y(-14) }, z: 3 },
      ],
      mates: [
        [{ x: 3, y: H / 2 }, { x: 3.2, y: target.y }],
        [{ x: 22, y: y(10) }, { x: 14, y: y(4) }],
        [{ x: 24, y: y(-8) }, { x: 16, y: y(-6) }],
        [{ x: 35, y: y(-16) }, { x: 25, y: y(-10) }],
      ],
      opps: [
        [{ x: 48, y: y(18) }, { x: 30, y: y(12) }],
        [{ x: 36, y: y(2) }, shooter],
        [{ x: 40, y: y(-14) }, { x: 20, y: y(-10) }],
      ],
      keeper: [{ x: 100, y: H / 2 }, { x: 98, y: H / 2 }],
      impact: 0.78,
      outcome: "save",
    };
  }

  const passer: P = { x: r.range(52, 62), y: y(r.range(10, 22)) };
  const runIn: P = { x: r.range(84, 92), y: y(r.range(-6, 8)) };
  const goalY = H / 2 + r.range(-3.2, 3.2);
  const youScore = h.kind === "goal" || h.kind === "chance";
  const finisher = youScore ? runIn : { x: r.range(86, 93), y: y(r.range(-10, -2)) };
  const outcome = h.kind === "chance" ? "post" : "goal";
  const shotEnd: P = outcome === "post" ? { x: W - 0.5, y: H / 2 + (r.chance(0.5) ? 3.66 : -3.66) } : { x: W + 1.5, y: goalY };
  const lofted = r.chance(0.5);

  return {
    frames: [
      { at: 0, ball: { x: 40, y: y(r.range(-10, 10)) } },
      { at: 0.22, ball: passer },
      { at: 0.45, ball: { x: runIn.x - (youScore ? 6 : 8), y: runIn.y }, z: lofted ? 4 : 0 },
      ...(youScore ? [] : [{ at: 0.6, ball: finisher }]),
      { at: youScore ? 0.66 : 0.72, ball: youScore ? runIn : finisher },
      { at: 0.82, ball: shotEnd, z: r.range(0.6, 2) },
      { at: 1, ball: outcome === "post" ? { x: W - 10, y: y(-18) } : { x: W + 1.2, y: goalY + 0.5 } },
    ],
    mates: [
      [{ x: runIn.x - 22, y: runIn.y + side * 6 }, runIn],
      [{ x: 38, y: y(-4) }, passer],
      [{ x: 60, y: y(-14) }, youScore ? { x: 82, y: y(-12) } : finisher],
      [{ x: 30, y: y(14) }, { x: 55, y: y(8) }],
    ],
    opps: [
      [{ x: 80, y: y(4) }, { x: runIn.x - 2, y: runIn.y + 3 }],
      [{ x: 78, y: y(-10) }, { x: 88, y: y(-6) }],
      [{ x: 66, y: y(16) }, { x: 70, y: y(12) }],
      [{ x: 58, y: y(-2) }, { x: 62, y: y(4) }],
    ],
    keeper: [{ x: 101, y: H / 2 }, { x: 101.5, y: lerp(H / 2, shotEnd.y, 0.6) }],
    impact: 0.82,
    outcome,
    celebrate: outcome === "goal" ? { x: W - 3, y: side > 0 ? H - 3 : 3 } : undefined,
  };
}

function ballAt(frames: Frame[], t: number): P & { z: number } {
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i].at) {
      const a = frames[i - 1];
      const b = frames[i];
      const k = (t - a.at) / (b.at - a.at || 1);
      const e = ease(k);
      // Lofted segments arc up and down.
      const z = (b.z ?? 0) * Math.sin(Math.PI * k);
      return { x: lerp(a.ball.x, b.ball.x, e), y: lerp(a.ball.y, b.ball.y, e), z };
    }
  }
  return { ...frames[frames.length - 1].ball, z: 0 };
}

const move = ([a, b]: [P, P], t: number): P => {
  const k = ease(Math.min(1, t / 0.75));
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
};

// ---------------------------------------------------------------------------
// A little running footballer, drawn standing up on the pitch.
// ---------------------------------------------------------------------------
function Figure({ at, prev, kit, skin, number, you, keeper, celebrate, tick }: { at: P; prev: P; kit: Kit; skin: string; number?: number; you?: boolean; keeper?: boolean; celebrate?: boolean; tick: number }) {
  const dx = at.x - prev.x;
  const speed = Math.hypot(dx, at.y - prev.y);
  const running = speed > 0.02 || celebrate;
  const facing = dx < -0.01 ? -1 : 1;
  const phase = running ? Math.sin(tick * (celebrate ? 0.5 : 0.35)) : 0;
  const legSwing = phase * 1.1;
  const armSwing = -phase * 0.9;
  const shirt = keeper ? "#f59e0b" : kit.primary;
  const shorts = keeper ? "#111827" : kit.secondary === "#ffffff" && kit.primary === "#f8fafc" ? "#1e293b" : kit.secondary;
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${facing * 1.3} 1.3)`}>
      <ellipse cx={0} cy={0.15} rx={1.5} ry={0.45} fill="rgba(0,0,0,0.3)" />
      {you && <ellipse cx={0} cy={0.15} rx={2.4} ry={0.9} fill="none" stroke="#fde047" strokeWidth={0.3} className="animate-pulse" />}
      {/* Legs */}
      <line x1={-0.35} y1={-2.1} x2={-0.35 + legSwing} y2={0} stroke={skin} strokeWidth={0.55} strokeLinecap="round" />
      <line x1={0.35} y1={-2.1} x2={0.35 - legSwing} y2={0} stroke={skin} strokeWidth={0.55} strokeLinecap="round" />
      <line x1={-0.35 + legSwing * 0.55} y1={-0.9} x2={-0.35 + legSwing} y2={0} stroke={kit.secondary === shirt ? "#fff" : kit.secondary} strokeWidth={0.62} strokeLinecap="round" />
      <line x1={0.35 - legSwing * 0.55} y1={-0.9} x2={0.35 - legSwing} y2={0} stroke={kit.secondary === shirt ? "#fff" : kit.secondary} strokeWidth={0.62} strokeLinecap="round" />
      <ellipse cx={-0.35 + legSwing + 0.2} cy={0} rx={0.42} ry={0.22} fill="#111" />
      <ellipse cx={0.35 - legSwing + 0.2} cy={0} rx={0.42} ry={0.22} fill="#111" />
      {/* Shorts */}
      <rect x={-0.85} y={-2.6} width={1.7} height={0.95} rx={0.25} fill={shorts} />
      {/* Arms */}
      {celebrate ? (
        <>
          <line x1={-0.8} y1={-4} x2={-1.6} y2={-5.6} stroke={skin} strokeWidth={0.42} strokeLinecap="round" />
          <line x1={0.8} y1={-4} x2={1.6} y2={-5.6} stroke={skin} strokeWidth={0.42} strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1={-0.8} y1={-4} x2={-0.95 + armSwing * 0.8} y2={-2.6} stroke={skin} strokeWidth={0.42} strokeLinecap="round" />
          <line x1={0.8} y1={-4} x2={0.95 - armSwing * 0.8} y2={-2.6} stroke={skin} strokeWidth={0.42} strokeLinecap="round" />
        </>
      )}
      {/* Shirt */}
      <path d="M-0.95 -4.4 Q0 -4.75 0.95 -4.4 L0.9 -2.45 L-0.9 -2.45 Z" fill={shirt} stroke="rgba(0,0,0,0.25)" strokeWidth={0.08} />
      {number !== undefined && (
        <text x={0} y={-3.05} fontSize={0.9} fontWeight={800} textAnchor="middle" fill={keeper ? "#111" : kit.text} transform={`scale(${facing} 1)`}>
          {number}
        </text>
      )}
      {/* Head */}
      <circle cx={0.05} cy={-5.25} r={0.78} fill={skin} />
      <path d="M-0.75 -5.35 Q-0.6 -6.2 0.1 -6.1 Q0.85 -6.05 0.82 -5.3 Q0.4 -5.75 -0.75 -5.35 Z" fill="#2b1b12" />
    </g>
  );
}

const SKINS = ["#f1c7a5", "#d9a77c", "#b97f51", "#8a5432", "#5e3a20"];

// ---------------------------------------------------------------------------
// One highlight on the 2D pitch. Calls onEnd when it has played (or instantly
// with reduced motion). `speed` > 1 plays it faster.
// ---------------------------------------------------------------------------
export function HighlightClip({
  h,
  isKeeper,
  myKit,
  oppKit,
  playerNumber,
  playerSkin,
  label,
  caption,
  scoreLine,
  speed = 1,
  onEnd,
}: {
  h: Highlight;
  isKeeper: boolean;
  myKit: Kit;
  oppKit: Kit;
  playerNumber: number;
  playerSkin?: string;
  /** Big text on impact ("GOAL!") */
  label: string;
  caption: string;
  scoreLine: (shown: [number, number]) => React.ReactNode;
  speed?: number;
  onEnd: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [tick, setTick] = useState(0);
  const raf = useRef(0);
  const ended = useRef(false);
  const script = useMemo(() => buildScript(h, isKeeper), [h, isKeeper]);
  const away = useMemo(() => awayKit(myKit, oppKit), [myKit, oppKit]);
  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  });

  useEffect(() => {
    ended.current = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const tickFn = (now: number) => {
      const p = reduced ? 1 : Math.min(1, ((now - start) * speed) / DURATION);
      setProgress(p);
      setTick((now - start) / 16);
      if (p < 1) raf.current = requestAnimationFrame(tickFn);
      else if (!ended.current) {
        ended.current = true;
        // Hold the final frame for a moment.
        setTimeout(() => endRef.current(), reduced ? 400 : 900 / speed);
      }
    };
    raf.current = requestAnimationFrame(tickFn);
    return () => cancelAnimationFrame(raf.current);
  }, [h, speed]);

  const prevP = Math.max(0, progress - 0.01);
  const ball = ballAt(script.frames, progress);
  const hit = progress >= script.impact;
  const shown: [number, number] = hit || h.kind !== "goal" ? h.score : [Math.max(0, h.score[0] - 1), h.score[1]];
  const celebrating = !!script.celebrate && hit && h.kind === "goal";
  const r = new Rng(h.seed + 7);
  const skins = Array.from({ length: 10 }, () => r.pick(SKINS));

  const posOf = (m: [P, P], i: number, p: number) => {
    const base = move(m, p);
    if (i === 0 && celebrating && script.celebrate) {
      const k = Math.min(1, (p - script.impact) / (1 - script.impact));
      return { x: lerp(base.x, script.celebrate.x, ease(k)), y: lerp(base.y, script.celebrate.y, ease(k)) };
    }
    return base;
  };

  // Draw back-to-front so nearer players overlap farther ones.
  const people = [
    ...script.mates.map((m, i) => ({ key: `m${i}`, at: posOf(m, i, progress), prev: posOf(m, i, prevP), kit: myKit, you: i === 0, keeper: isKeeper && i === 0, number: i === 0 ? playerNumber : [6, 8, 3][i - 1], skin: i === 0 ? (playerSkin ?? skins[0]) : skins[i] })),
    ...script.opps.map((o, i) => ({ key: `o${i}`, at: move(o, progress), prev: move(o, prevP), kit: away, you: false, keeper: false, number: [4, 5, 2, 14][i], skin: skins[5 + i] })),
    (() => {
      const kp = (p: number) => move(script.keeper, Math.min(1, p / Math.max(script.impact, 0.01)));
      return { key: "k", at: kp(progress), prev: kp(prevP), kit: away, you: false, keeper: true, number: 1, skin: skins[9] };
    })(),
  ].sort((a, b) => a.at.y - b.at.y);

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-emerald-950/40 shadow-xl">
      <div className="absolute top-2 left-2 z-10" dir="ltr">
        {scoreLine(shown)}
      </div>

      <svg viewBox={`-3 -6 ${W + 6} ${H + 9}`} className="block w-full bg-emerald-700" style={{ direction: "ltr" }} role="img" aria-label={caption}>
        <defs>
          <linearGradient id="pitch-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.18" />
            <stop offset="0.4" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={(i * W) / 12} y={-6} width={W / 12} height={H + 9} fill={i % 2 ? "#15803d" : "#166534"} />
        ))}
        <rect x={-3} y={-6} width={W + 6} height={H + 9} fill="url(#pitch-shade)" />
        <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={0.35}>
          <rect x={0} y={0} width={W} height={H} />
          <line x1={W / 2} y1={0} x2={W / 2} y2={H} />
          <circle cx={W / 2} cy={H / 2} r={9.15} />
          <rect x={0} y={H / 2 - 20.16} width={16.5} height={40.32} />
          <rect x={W - 16.5} y={H / 2 - 20.16} width={16.5} height={40.32} />
          <rect x={0} y={H / 2 - 9.16} width={5.5} height={18.32} />
          <rect x={W - 5.5} y={H / 2 - 9.16} width={5.5} height={18.32} />
          <path d={`M16.5 ${H / 2 - 7.3} A9.15 9.15 0 0 1 16.5 ${H / 2 + 7.3}`} />
          <path d={`M${W - 16.5} ${H / 2 - 7.3} A9.15 9.15 0 0 0 ${W - 16.5} ${H / 2 + 7.3}`} />
        </g>
        {/* Goals with nets (the right net shakes on a goal) */}
        <g stroke="white" strokeWidth={0.3}>
          <rect x={-2.2} y={H / 2 - 3.66} width={2.2} height={7.32} fill="rgba(255,255,255,0.3)" />
          <g className={cn(hit && script.outcome === "goal" && "animate-[net_0.3s_ease-in-out_3]")} style={{ transformOrigin: `${W + 1}px ${H / 2}px` }}>
            <rect x={W} y={H / 2 - 3.66} width={2.2} height={7.32} fill={hit && script.outcome === "goal" ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)"} />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <line key={i} x1={W} y1={H / 2 - 3.66 + i * 1.05} x2={W + 2.2} y2={H / 2 - 3.66 + i * 1.05} strokeWidth={0.08} />
            ))}
          </g>
        </g>

        {people.map((p) => (
          <Figure key={p.key} at={p.at} prev={p.prev} kit={p.kit} skin={p.skin} number={p.number} you={p.you} keeper={p.keeper} tick={tick} celebrate={p.you && celebrating} />
        ))}

        {/* Ball: shadow stays on the grass, the ball rises with height */}
        <ellipse cx={ball.x + 0.3} cy={ball.y + 0.2} rx={0.8} ry={0.35} fill="rgba(0,0,0,0.35)" />
        <g transform={`translate(${ball.x} ${ball.y - 0.6 - ball.z}) rotate(${progress * 2400})`}>
          <circle r={0.7} fill="white" stroke="#111" strokeWidth={0.12} />
          <path d="M0 -0.3 L0.28 -0.1 L0.18 0.25 L-0.18 0.25 L-0.28 -0.1 Z" fill="#111" />
        </g>
      </svg>

      {/* Big moment text */}
      <div className={cn("pointer-events-none absolute inset-0 grid place-items-center transition-all duration-500", hit ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
        <span className={cn("rounded-xl px-5 py-2 font-heading text-4xl font-black tracking-wide text-white drop-shadow-lg sm:text-6xl", h.kind === "chance" ? "bg-black/50" : "bg-amber-500/90", celebrating && "animate-bounce")}>{label}</span>
      </div>
      {celebrating && <Confetti />}

      <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2 text-center text-sm font-semibold text-white sm:text-base">{caption}</p>
    </div>
  );
}

/** A burst of confetti (CSS only). */
export function Confetti({ count = 36 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.2 + Math.random() * 1.2,
      color: ["#facc15", "#22c55e", "#3b82f6", "#ef4444", "#ffffff", "#a855f7"][i % 6],
      rot: Math.random() * 360,
      size: 5 + Math.random() * 6,
    })),
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-3 block animate-[confetti_var(--d)_ease-in_var(--dl)_forwards] rounded-[2px] motion-reduce:hidden"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.5, background: p.color, transform: `rotate(${p.rot}deg)`, ["--d" as string]: `${p.dur}s`, ["--dl" as string]: `${p.delay}s` }}
        />
      ))}
    </div>
  );
}
