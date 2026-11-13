"use client";

import { FastForwardIcon, SkipForwardIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { Rng } from "@/lib/engine/rng";
import type { Highlight, World } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { type CareerDict, clubName, fill } from "./helpers";

// Pitch in metres (105 × 68). We always attack to the right.
const W = 105;
const H = 68;
const DURATION = 5200; // ms per highlight

type P = { x: number; y: number };
interface Frame {
  at: number; // 0..1
  ball: P;
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
    const frames: Frame[] = [
      { at: 0, ball: { x: 45, y: y(18) } },
      { at: 0.35, ball: { x: 28, y: y(r.range(4, 14)) } },
      { at: 0.6, ball: shooter },
      { at: 0.78, ball: { x: 3.5, y: target.y } },
      { at: 1, ball: { x: 9, y: y(-14) } },
    ];
    return {
      frames,
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

  const frames: Frame[] = [
    { at: 0, ball: { x: 40, y: y(r.range(-10, 10)) } },
    { at: 0.22, ball: passer },
    { at: 0.45, ball: youScore ? { x: runIn.x - 6, y: runIn.y } : { x: runIn.x - 8, y: runIn.y } },
    ...(youScore ? [] : [{ at: 0.6, ball: finisher }]),
    { at: youScore ? 0.66 : 0.72, ball: youScore ? runIn : finisher },
    { at: 0.82, ball: shotEnd },
    { at: 1, ball: outcome === "post" ? { x: W - 10, y: y(-18) } : { x: W + 1.2, y: goalY + 0.5 } },
  ];
  return {
    frames,
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
  };
}

function ballAt(frames: Frame[], t: number): P {
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i].at) {
      const a = frames[i - 1];
      const b = frames[i];
      const k = ease((t - a.at) / (b.at - a.at || 1));
      return { x: lerp(a.ball.x, b.ball.x, k), y: lerp(a.ball.y, b.ball.y, k) };
    }
  }
  return frames[frames.length - 1].ball;
}

const move = ([a, b]: [P, P], t: number): P => {
  const k = ease(Math.min(1, t / 0.75));
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
};

export function Highlights({
  items,
  world,
  myClubId,
  playerName,
  isKeeper,
  t,
  locale,
  onDone,
}: {
  items: Highlight[];
  world: World;
  myClubId: string;
  playerName: string;
  isKeeper: boolean;
  t: CareerDict;
  locale: Locale;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const h = items[index];
  const script = useMemo(() => (h ? buildScript(h, isKeeper) : null), [h, isKeeper]);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!h) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = reduced ? 1 : Math.min(1, (now - start) / DURATION);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [h, reduced]);

  if (!h || !script) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="mb-4 text-muted-foreground">{t.highlights.none}</p>
        <Button size="lg" onClick={onDone}>
          {t.next}
        </Button>
      </div>
    );
  }

  const next = () => (index + 1 < items.length ? (setIndex(index + 1), setProgress(0)) : onDone());
  const ball = ballAt(script.frames, progress);
  const hit = progress >= script.impact;
  const line = t.highlights.lines[h.kind][h.seed % t.highlights.lines[h.kind].length];
  const opp = clubName(world, h.opponentId, locale);
  const mine = clubName(world, myClubId, locale);
  const shownScore = hit || h.kind !== "goal" ? h.score : [Math.max(0, h.score[0] - 1), h.score[1]];

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="relative flex-1 overflow-hidden rounded-2xl border-4 border-emerald-950/40 shadow-xl">
        {/* Scoreboard */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-bold text-white sm:text-sm" dir="ltr">
          <span className="rounded bg-amber-400 px-1.5 text-black tabular-nums">{h.minute}&apos;</span>
          <span className="max-w-24 truncate sm:max-w-40">{mine}</span>
          <span className="tabular-nums">
            {shownScore[0]}–{shownScore[1]}
          </span>
          <span className="max-w-24 truncate sm:max-w-40">{opp}</span>
        </div>
        <span className="absolute top-2 right-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white tabular-nums">
          {index + 1}/{items.length}
        </span>

        <svg viewBox={`-3 -3 ${W + 6} ${H + 6}`} className="block w-full bg-emerald-700" style={{ direction: "ltr" }} role="img" aria-label={`${t.highlights.kinds[h.kind]} ${fill(line, { name: playerName })}`}>
          {/* Grass stripes */}
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={(i * W) / 10} y={0} width={W / 10} height={H} fill={i % 2 ? "#15803d" : "#166534"} />
          ))}
          <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={0.35}>
            <rect x={0} y={0} width={W} height={H} />
            <line x1={W / 2} y1={0} x2={W / 2} y2={H} />
            <circle cx={W / 2} cy={H / 2} r={9.15} />
            <rect x={0} y={H / 2 - 20.16} width={16.5} height={40.32} />
            <rect x={W - 16.5} y={H / 2 - 20.16} width={16.5} height={40.32} />
            <rect x={0} y={H / 2 - 9.16} width={5.5} height={18.32} />
            <rect x={W - 5.5} y={H / 2 - 9.16} width={5.5} height={18.32} />
          </g>
          {/* Goals (the right net shakes on a goal) */}
          <rect x={-2} y={H / 2 - 3.66} width={2} height={7.32} fill="rgba(255,255,255,0.35)" stroke="white" strokeWidth={0.3} />
          <rect
            x={W}
            y={H / 2 - 3.66}
            width={2}
            height={7.32}
            fill={hit && script.outcome === "goal" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)"}
            stroke="white"
            strokeWidth={0.3}
            className={cn(hit && script.outcome === "goal" && "animate-[net_0.3s_ease-in-out_3]")}
          />

          {/* Opponents */}
          {script.opps.map((o, i) => {
            const p = move(o, progress);
            return <circle key={`o${i}`} cx={p.x} cy={p.y} r={1.5} fill="#dc2626" stroke="white" strokeWidth={0.3} />;
          })}
          {(() => {
            const k = move(script.keeper, Math.min(1, progress / Math.max(script.impact, 0.01)));
            return <circle cx={k.x} cy={k.y} r={1.5} fill="#f59e0b" stroke="black" strokeWidth={0.3} />;
          })()}

          {/* Teammates and you */}
          {script.mates.map((m, i) => {
            const p = move(m, progress);
            const you = i === 0;
            return (
              <g key={`m${i}`}>
                {you && <circle cx={p.x} cy={p.y} r={2.8} fill="none" stroke="#fbbf24" strokeWidth={0.5} className="animate-pulse" />}
                <circle cx={p.x} cy={p.y} r={you ? 1.9 : 1.5} fill={you ? "#2563eb" : "#3b82f6"} stroke="white" strokeWidth={0.35} />
                {you && (
                  <text x={p.x} y={p.y - 3.4} textAnchor="middle" fontSize={2.6} fontWeight={700} fill="white" stroke="rgba(0,0,0,0.6)" strokeWidth={0.4} paintOrder="stroke">
                    {playerName}
                  </text>
                )}
              </g>
            );
          })}

          {/* Ball + shadow */}
          <ellipse cx={ball.x + 0.4} cy={ball.y + 0.6} rx={0.9} ry={0.45} fill="rgba(0,0,0,0.35)" />
          <circle cx={ball.x} cy={ball.y} r={0.85} fill="white" stroke="#111" strokeWidth={0.2} />
        </svg>

        {/* Big moment text */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 grid place-items-center transition-all duration-500",
            hit ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        >
          <span className={cn("rounded-xl px-5 py-2 font-heading text-4xl font-black tracking-wide text-white drop-shadow-lg sm:text-6xl", h.kind === "chance" ? "bg-black/50" : "bg-amber-500/90")}>
            {t.highlights.kinds[h.kind]}
          </span>
        </div>

        {/* Commentary */}
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2 text-center text-sm font-semibold text-white sm:text-base">
          {fill(line, { name: playerName })}
        </p>
      </div>

      {/* Side controls (below the pitch on phones) */}
      <div className="flex gap-2 md:w-36 md:flex-col">
        <Button size="lg" className="h-11 flex-1 md:flex-none" onClick={next}>
          {progress < 1 ? <SkipForwardIcon aria-hidden /> : null}
          {progress < 1 ? t.highlights.skip : t.highlights.next}
        </Button>
        <Button size="lg" variant="outline" className="h-11 flex-1 md:flex-none" onClick={onDone}>
          <FastForwardIcon aria-hidden /> {t.highlights.skipAll}
        </Button>
      </div>
    </div>
  );
}
