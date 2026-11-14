"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { awayKit, type Kit } from "@/lib/engine/people";
import { Rng } from "@/lib/engine/rng";
import type { Highlight } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// A 2.5D "TV camera" highlight. The play is scripted in pitch metres
// (105 × 68, the attacking side always goes to the right), then projected:
// the camera sits high on the near touchline like the main TV camera, so
// depth (y) is squashed, heights rise up the screen, and the wide view
// follows the ball. The ball is the star; players are small plain figures.
// ---------------------------------------------------------------------------
export const W = 105;
export const H = 68;
const DURATION = 6400; // ms per highlight at normal speed
const TILT = 0.44; // depth squash of the pitch
const S = 1.5; // people are drawn a little over life size so they still read on a phone
const VIEW_W = 50; // metres of pitch the camera shows across (wide "main camera" shot)
const BALL_R = 0.4; // ball radius on screen (exaggerated so the ball is always easy to follow)

type P = { x: number; y: number };
type Way = { at: number; p: P };

interface Actor {
  key: string;
  team: "att" | "def";
  keeper?: boolean;
  you?: boolean;
  /** Scripted route; players without one hold their shape around the ball. */
  path?: Way[];
  home: P;
  /** How strongly the player shifts with the ball (0..1). */
  pull: number;
  /** Marks this actor (follows them goal-side). */
  marks?: string;
  skin: string;
  hair: string;
}

type BallSeg =
  | { kind: "carry"; t0: number; t1: number; by: string }
  | { kind: "kick"; t0: number; t1: number; by: string; to: P; z: number; endZ?: number; bend?: number }
  | { kind: "free"; t0: number; t1: number; from: P; to: P; z: number; fromZ?: number; endZ?: number };

interface Script {
  actors: Actor[];
  ball: BallSeg[];
  shotAt: number;
  impact: number;
  outcome: "goal" | "save" | "post";
  /** Attack runs right-to-left on screen (you're the keeper of the left goal). */
  mirror: boolean;
  /** Where the keeper ends his dive (pitch coords) and which way he goes. */
  dive: { to: P; dir: 1 | -1 };
  /** Who scores / celebrates. */
  scorer?: string;
  celebrate?: P;
  ballStart: P;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const SKINS = ["#f1c7a5", "#e0b08a", "#c68f62", "#a86f45", "#7a4a2a", "#5a361d"];
const HAIRS = ["#17110d", "#2b1b12", "#4a2c1b", "#6d4428", "#b58a4c", "#17110d"];

/** Catmull-Rom through the waypoints (smooth, natural runs). */
function along(path: Way[], t: number): P {
  if (t <= path[0].at) return path[0].p;
  const last = path[path.length - 1];
  if (t >= last.at) return last.p;
  let i = 1;
  while (t > path[i].at) i++;
  const p0 = path[Math.max(0, i - 2)].p;
  const p1 = path[i - 1].p;
  const p2 = path[i].p;
  const p3 = path[Math.min(path.length - 1, i + 1)].p;
  const k = smooth((t - path[i - 1].at) / (path[i].at - path[i - 1].at || 1));
  const cr = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (-a + 3 * b - 3 * c + d) * k * k * k);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) };
}

// ---------------------------------------------------------------------------
// Script building
// ---------------------------------------------------------------------------
function buildScript(h: Highlight, isKeeper: boolean): Script {
  const r = new Rng(h.seed);
  const side = r.chance(0.5) ? 1 : -1; // build-up down the far or near side
  const y = (v: number) => H / 2 + side * v;
  const look = () => ({ skin: r.pick(SKINS), hair: r.pick(HAIRS) });
  const keeperMode = h.kind === "save" || isKeeper;
  const youAttack = !keeperMode;
  const assist = h.kind === "assist";
  const outcome: Script["outcome"] = keeperMode ? "save" : h.kind === "chance" ? "post" : "goal";

  // Key spots
  const start: P = { x: r.range(44, 52), y: y(r.range(4, 14)) };
  const wide: P = { x: r.range(68, 76), y: y(r.range(20, 27)) };
  const receive: P = { x: r.range(82, 86), y: y(r.range(-6, 4)) };
  const shotSpot: P = { x: r.range(87, 92), y: y(r.range(-5, 3)) };
  const goalY = H / 2 + r.range(-2.9, 2.9) * (r.chance(0.5) ? 1 : -1);
  const goalZ = r.range(0.3, 2.1);
  const postY = H / 2 + (goalY > H / 2 ? 3.66 : -3.66);

  const T = { pass: 0.24, recv: 0.37, shot: 0.47, impact: 0.55 };
  const shotTarget: P = outcome === "post" ? { x: W, y: postY } : outcome === "save" ? { x: W - 1.2, y: lerp(H / 2, goalY, 0.85) } : { x: W + 0.4, y: goalY };

  // The three scripted attackers: provider (wide), finisher, support runner.
  const providerKey = "a1";
  const finisherKey = "a0";
  const provider: Way[] = [
    { at: 0, p: start },
    { at: T.pass, p: wide },
    { at: 0.55, p: { x: wide.x + 7, y: wide.y - side * 4 } },
    { at: 1, p: { x: wide.x + 10, y: wide.y - side * 7 } },
  ];
  const finisher: Way[] = [
    { at: 0, p: { x: receive.x - 16, y: receive.y + side * 6 } },
    { at: T.pass, p: { x: receive.x - 6, y: receive.y + side * 2 } },
    { at: T.recv, p: receive },
    { at: T.shot, p: shotSpot },
    { at: T.impact + 0.05, p: { x: shotSpot.x + 2.5, y: shotSpot.y } },
  ];
  const celebrate: P = { x: W - 2.5, y: side > 0 ? H - 2 : 2 };
  if (outcome === "goal") finisher.push({ at: 0.92, p: celebrate }, { at: 1, p: { x: celebrate.x - 1, y: celebrate.y } });
  else finisher.push({ at: 1, p: { x: shotSpot.x + 4, y: shotSpot.y + side * 2 } });
  const runner: Way[] = [
    { at: 0, p: { x: 58, y: y(-12) } },
    { at: T.recv, p: { x: 80, y: y(-14) } },
    { at: 0.62, p: { x: 88, y: y(-10) } },
    ...(outcome === "goal" ? [{ at: 0.98, p: { x: celebrate.x - 3, y: celebrate.y - side * 2.5 } }] : [{ at: 1, p: { x: 90, y: y(-8) } }]),
  ];
  if (outcome === "goal") provider.splice(2, 2, { at: 0.6, p: { x: wide.x + 8, y: wide.y - side * 5 } }, { at: 1, p: { x: celebrate.x - 4, y: celebrate.y + side * 1 } });

  const youKey = youAttack ? (assist ? providerKey : finisherKey) : "gk";
  const attackers: Actor[] = [
    { key: finisherKey, team: "att", home: finisher[0].p, path: finisher, pull: 0, ...look() },
    { key: providerKey, team: "att", home: provider[0].p, path: provider, pull: 0, ...look() },
    { key: "a2", team: "att", home: runner[0].p, path: runner, pull: 0, ...look() },
    { key: "a3", team: "att", home: { x: 42, y: y(-4) }, pull: 0.55, ...look() },
    { key: "a4", team: "att", home: { x: 36, y: y(18) }, pull: 0.5, ...look() },
    { key: "a5", team: "att", home: { x: 30, y: y(-20) }, pull: 0.45, ...look() },
  ];
  const defenders: Actor[] = [
    { key: "gk", team: "def", keeper: true, home: { x: W - 1.4, y: H / 2 }, pull: 0, ...look() },
    { key: "d0", team: "def", home: { x: 89, y: y(-6) }, pull: 0.3, marks: finisherKey, ...look() },
    { key: "d1", team: "def", home: { x: 88, y: y(5) }, pull: 0.3, ...look() },
    { key: "d2", team: "def", home: { x: 86, y: y(15) }, pull: 0.35, marks: providerKey, ...look() },
    { key: "d3", team: "def", home: { x: 87, y: y(-16) }, pull: 0.3, ...look() },
    { key: "d4", team: "def", home: { x: 74, y: y(2) }, pull: 0.5, ...look() },
    { key: "d5", team: "def", home: { x: 72, y: y(-12) }, pull: 0.5, ...look() },
  ];
  for (const a of [...attackers, ...defenders]) a.you = a.key === youKey;

  const lofted = assist || r.chance(0.45);
  const ball: BallSeg[] = [
    { kind: "carry", t0: 0, t1: T.pass, by: providerKey },
    { kind: "kick", t0: T.pass, t1: T.recv, by: providerKey, to: receive, z: lofted ? 4.5 : 0.25, endZ: lofted && assist ? 1.2 : 0, bend: lofted ? side * -2.5 : 0 },
    ...(assist
      ? // First-time finish from the cross.
        ([{ kind: "kick", t0: T.recv, t1: T.impact, by: finisherKey, to: shotTarget, z: 0.5, endZ: goalZ, bend: r.range(-0.8, 0.8) }] as BallSeg[])
      : ([
          { kind: "carry", t0: T.recv, t1: T.shot, by: finisherKey },
          { kind: "kick", t0: T.shot, t1: T.impact, by: finisherKey, to: shotTarget, z: 0.6, endZ: outcome === "post" ? 1.2 : goalZ, bend: r.range(-2.2, 2.2) },
        ] as BallSeg[])),
  ];
  if (assist) {
    // The finisher meets the cross a little closer to goal.
    finisher.splice(2, 2, { at: T.recv, p: receive }, { at: T.impact, p: { x: receive.x + 1.5, y: receive.y } });
  }
  const shotAt = assist ? T.recv : T.shot;

  // After impact
  if (outcome === "goal") ball.push({ kind: "free", t0: T.impact, t1: T.impact + 0.06, from: shotTarget, to: { x: W + 1.8, y: goalY }, z: 0, fromZ: goalZ, endZ: 0.2 });
  else if (outcome === "post") ball.push({ kind: "free", t0: T.impact, t1: 0.85, from: shotTarget, to: { x: W - 14, y: y(-16) }, z: 2.5, fromZ: 1.2 });
  else ball.push({ kind: "free", t0: T.impact, t1: 0.8, from: shotTarget, to: { x: W + 0.5, y: H / 2 + (goalY > H / 2 ? 9 : -9) }, z: 3, fromZ: goalZ });

  const diveDir = (goalY > H / 2 ? 1 : -1) as 1 | -1;
  const diveTo: P = outcome === "save" ? { x: W - 1.2, y: shotTarget.y } : outcome === "post" ? { x: W - 1.3, y: lerp(H / 2, postY, 0.7) } : { x: W - 1.3, y: lerp(H / 2, goalY, r.chance(0.3) ? -0.8 : 0.65) };

  return {
    actors: [...attackers, ...defenders],
    ball,
    shotAt,
    impact: T.impact,
    outcome,
    mirror: keeperMode,
    dive: { to: diveTo, dir: (Math.sign(diveTo.y - H / 2) || diveDir) as 1 | -1 },
    scorer: outcome === "goal" ? finisherKey : undefined,
    celebrate: outcome === "goal" ? celebrate : undefined,
    ballStart: start,
  };
}

// ---------------------------------------------------------------------------
// Simulation (pure functions of t, so any frame can be drawn on its own)
// ---------------------------------------------------------------------------
function makeSim(s: Script) {
  const byKey = new Map(s.actors.map((a) => [a.key, a]));

  function ballState(t: number): P & { z: number; owner?: string } {
    const seg = s.ball.find((b) => t >= b.t0 && t <= b.t1) ?? s.ball[s.ball.length - 1];
    const k = clamp((t - seg.t0) / (seg.t1 - seg.t0 || 1), 0, 1);
    if (seg.kind === "carry") {
      const at = actorPos(seg.by, t);
      const ahead = actorPos(seg.by, Math.min(1, t + 0.02));
      const d = Math.hypot(ahead.x - at.x, ahead.y - at.y) || 1;
      return { x: at.x + ((ahead.x - at.x) / d) * 0.8, y: at.y + ((ahead.y - at.y) / d) * 0.8, z: 0, owner: seg.by };
    }
    const from = seg.kind === "kick" ? footOf(seg.by, seg.t0) : seg.from;
    const fromZ = seg.kind === "free" ? (seg.fromZ ?? 0) : 0;
    const e = seg.kind === "free" ? easeOut(k) : k;
    const z = lerp(fromZ, seg.endZ ?? 0, k) + seg.z * Math.sin(Math.PI * k) * (seg.kind === "free" ? 1 - k * 0.3 : 1);
    // Curl: sideways offset that peaks mid-flight and lands on target.
    const bend = seg.kind === "kick" ? (seg.bend ?? 0) * Math.sin(Math.PI * k) : 0;
    const dx = seg.to.x - from.x;
    const dy = seg.to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: lerp(from.x, seg.to.x, e) - (dy / len) * bend, y: lerp(from.y, seg.to.y, e) + (dx / len) * bend, z: Math.max(0, z) };
  }

  /** Where the ball is when this player strikes it. */
  function footOf(key: string, t: number): P {
    const prev = s.ball.find((b) => b.kind === "carry" && b.by === key && Math.abs(b.t1 - t) < 1e-6);
    if (prev) return ballState(t - 1e-4);
    const before = s.ball.find((b) => Math.abs(b.t1 - t) < 1e-6 && b.kind === "kick");
    return before && before.kind === "kick" ? before.to : actorPos(key, t);
  }

  const lagBall = (t: number) => {
    const b = ballState(Math.max(0, t - 0.06));
    return { x: b.x, y: b.y };
  };

  function actorPos(key: string, t: number): P {
    const a = byKey.get(key)!;
    if (a.path) return along(a.path, t);
    const b = lagBall(t);
    if (a.keeper) {
      // Keeper tracks the ball across his goal, then dives at the shot.
      const stand = { x: a.home.x - clamp((W - b.x) * 0.02, 0, 0.8), y: H / 2 + clamp((b.y - H / 2) * 0.22, -2.6, 2.6) };
      if (t < s.shotAt) return stand;
      const k = smooth(clamp((t - s.shotAt) / (s.impact - s.shotAt + 0.03), 0, 1));
      return { x: lerp(stand.x, s.dive.to.x, k), y: lerp(stand.y, s.dive.to.y, k) };
    }
    let x = a.home.x + (b.x - s.ballStart.x) * a.pull;
    let yy = a.home.y + (b.y - s.ballStart.y) * a.pull * 0.6;
    if (a.marks) {
      // Goal-side of his man, a step behind.
      const m = along(byKey.get(a.marks)!.path!, Math.max(0, t - 0.035));
      const k = clamp((t - 0.12) / 0.2, 0, 0.85);
      x = lerp(x, m.x + 2.2, k);
      yy = lerp(yy, m.y + (H / 2 - m.y) * 0.12 + 0.9, k);
    }
    if (a.team === "def") x = Math.min(x, W - 5);
    // After a goal everyone slows down.
    if (s.outcome === "goal" && t > s.impact) {
      const freeze = actorPosFrozen(a, s.impact);
      return { x: lerp(x, freeze.x, 0.7), y: lerp(yy, freeze.y, 0.7) };
    }
    return { x: clamp(x, 1, W - 1), y: clamp(yy, 1, H - 1) };
  }

  function actorPosFrozen(a: Actor, t: number): P {
    const b = lagBall(t);
    return { x: a.home.x + (b.x - s.ballStart.x) * a.pull, y: a.home.y + (b.y - s.ballStart.y) * a.pull * 0.6 };
  }

  /** Gait phase from distance run so far (legs never jump between frames). */
  function stride(key: string, t: number) {
    let d = 0;
    let prev = actorPos(key, 0);
    const n = 28;
    for (let i = 1; i <= n; i++) {
      const p = actorPos(key, (t * i) / n);
      d += Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = p;
    }
    return d;
  }

  return { ballState, actorPos, stride, byKey };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
type Pose = "run" | "kick" | "celebrate" | "dive" | "ready";

/**
 * A footballer as seen from the main TV camera: a small, plain figure (no face,
 * no outlines). Units: metres × scale, origin at the feet.
 */
function Figure({ x, y, scale, facing, phase, amp, pose, diveK, shirt, shorts, socks, skin, hair, you, keeper }: { x: number; y: number; scale: number; facing: number; phase: number; amp: number; pose: Pose; diveK: number; shirt: string; shorts: string; socks: string; skin: string; hair: string; you?: boolean; keeper?: boolean }) {
  const swing = Math.sin(phase) * 0.55 * amp;
  const bob = pose === "run" ? Math.abs(Math.sin(phase)) * 0.04 * amp : pose === "celebrate" ? Math.abs(Math.sin(phase * 1.4)) * 0.12 : 0;
  const lean = 0.12 * amp;
  const hip = { x: 0, y: -0.92 };
  const neck = { x: lean, y: -1.5 };
  const legOf = (th: number, bend: number) => {
    const knee = { x: hip.x + Math.sin(th) * 0.46, y: hip.y + Math.cos(th) * 0.46 };
    const a2 = th - bend;
    return { knee, foot: { x: knee.x + Math.sin(a2) * 0.46, y: knee.y + Math.cos(a2) * 0.46 } };
  };
  const legs =
    pose === "kick"
      ? [legOf(-0.35, 0.25), legOf(1.15, 0.05)]
      : pose === "ready"
        ? [legOf(-0.22, 0.4), legOf(0.22, 0.4)]
        : [legOf(-swing, Math.max(0, Math.cos(phase)) * 0.9 * amp), legOf(swing, Math.max(0, -Math.cos(phase)) * 0.9 * amp)];
  const arm = (dir: number) => {
    const sh = { x: neck.x, y: neck.y + 0.1 };
    if (pose === "celebrate") return { sh, hand: { x: sh.x + 0.3 * dir, y: sh.y - 0.55 } };
    if (pose === "dive") return { sh, hand: { x: sh.x + 0.6, y: sh.y - 0.1 * dir } };
    if (pose === "ready") return { sh, hand: { x: sh.x + 0.3 * dir, y: sh.y + 0.3 } };
    const a = (pose === "kick" ? 0.9 : -swing * 1.1) * dir;
    return { sh, hand: { x: sh.x + Math.sin(a) * 0.55, y: sh.y + Math.cos(a) * 0.55 } };
  };
  const rot = pose === "dive" ? -80 * diveK : 0;
  const lift = pose === "dive" ? -0.35 * Math.sin(Math.PI * Math.min(1, diveK * 1.1)) : -bob;
  const limb = { strokeLinecap: "round" as const, fill: "none" };
  const glove = keeper ? "#e5e7eb" : skin;

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* contact shadow, long and soft like stadium light */}
      <ellipse cx={0.35 * scale} cy={0} rx={(pose === "dive" ? 0.9 : 0.45) * scale} ry={0.11 * scale} fill="rgba(0,0,0,0.32)" />
      {you && <ellipse cx={0} cy={0} rx={0.75 * scale} ry={0.22 * scale} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={0.1} />}
      <g transform={`scale(${facing * scale} ${scale}) translate(0 ${lift}) rotate(${rot} 0 -0.8)`}>
        {/* far side limbs, slightly darker */}
        <g opacity={0.8}>
          <path d={`M${hip.x} ${hip.y} L${legs[0].knee.x} ${legs[0].knee.y} L${legs[0].foot.x} ${legs[0].foot.y}`} stroke={socks} strokeWidth={0.15} {...limb} />
          <path d={`M${arm(-1).sh.x} ${arm(-1).sh.y} L${arm(-1).hand.x} ${arm(-1).hand.y}`} stroke={glove} strokeWidth={0.1} {...limb} />
        </g>
        {/* shorts + shirt */}
        <path d={`M${hip.x - 0.17} ${hip.y - 0.06} L${hip.x + 0.17} ${hip.y - 0.06} L${hip.x + 0.19} ${hip.y + 0.16} L${hip.x - 0.19} ${hip.y + 0.16} Z`} fill={shorts} />
        <path d={`M${hip.x - 0.17} ${hip.y} L${neck.x - 0.2} ${neck.y + 0.06} Q${neck.x} ${neck.y - 0.04} ${neck.x + 0.2} ${neck.y + 0.06} L${hip.x + 0.17} ${hip.y} Z`} fill={shirt} />
        <path d={`M${hip.x + 0.03} ${hip.y} L${neck.x + 0.06} ${neck.y + 0.02} L${neck.x + 0.2} ${neck.y + 0.06} L${hip.x + 0.17} ${hip.y} Z`} fill="#000" opacity={0.18} />
        {/* near side limbs */}
        <path d={`M${hip.x} ${hip.y} L${legs[1].knee.x} ${legs[1].knee.y} L${legs[1].foot.x} ${legs[1].foot.y}`} stroke={socks} strokeWidth={0.16} {...limb} />
        <path d={`M${arm(1).sh.x} ${arm(1).sh.y} L${arm(1).hand.x} ${arm(1).hand.y}`} stroke={glove} strokeWidth={0.1} {...limb} />
        {/* head */}
        <circle cx={neck.x + 0.02} cy={neck.y - 0.16} r={0.13} fill={skin} />
        <path d={`M${neck.x - 0.11} ${neck.y - 0.17} A0.13 0.13 0 0 1 ${neck.x + 0.15} ${neck.y - 0.18} Q${neck.x + 0.02} ${neck.y - 0.24} ${neck.x - 0.11} ${neck.y - 0.17} Z`} fill={hair} />
      </g>
      {you && <path d={`M${-0.2 * scale} ${-2.35 * scale} L${0.2 * scale} ${-2.35 * scale} L0 ${-2.12 * scale} Z`} fill="#fff" opacity={0.9} />}
    </g>
  );
}

/** Stands behind the far touchline: a crowd in both teams' colours. */
function Crowd({ colors, jump }: { colors: string[]; jump: boolean }) {
  const rows = 5;
  const dots = useMemo(() => {
    const r = new Rng(99);
    const out: { x: number; y: number; c: string; d: number }[] = [];
    for (let row = 0; row < rows; row++)
      for (let x = -20; x < W + 20; x += 1.35) out.push({ x: x + r.range(-0.3, 0.3) + (row % 2) * 0.55, y: -5.2 - row * 1.25, c: r.chance(0.6) ? colors[r.int(0, colors.length - 1)] : r.pick(["#334155", "#475569", "#e2e8f0", "#1e293b"]), d: r.range(0, 0.5) });
    return out;
  }, [colors]);
  return (
    <g>
      <rect x={-22} y={-14} width={W + 44} height={10.5} fill="#1f2937" />
      {dots.map((d, i) => (
        <g key={i} className={jump ? "animate-[crowd_0.45s_ease-in-out_infinite]" : undefined} style={jump ? { animationDelay: `${d.d}s` } : undefined}>
          <circle cx={d.x} cy={d.y} r={0.5} fill={d.c} opacity={0.55} />
        </g>
      ))}
      {/* Advertising boards */}
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={-20 + i * 11} y={-3.2} width={10.8} height={1.4} fill={["#0c4a6e", "#1e293b", "#7c2d12", "#064e3b", "#312e81", "#334155", "#111827"][i % 7]} opacity={0.95} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// One highlight. Calls onEnd when it has played (or instantly with reduced motion).
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
  at,
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
  /** Freeze on this moment (0..1) instead of playing — for thumbnails and previews. */
  at?: number;
}) {
  const [real, setReal] = useState(0);
  const raf = useRef(0);
  const ended = useRef(false);
  const script = useMemo(() => buildScript(h, isKeeper), [h, isKeeper]);
  const sim = useMemo(() => makeSim(script), [script]);
  const away = useMemo(() => awayKit(myKit, oppKit), [myKit, oppKit]);
  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  });

  useEffect(() => {
    if (at !== undefined) return;
    ended.current = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const tickFn = (now: number) => {
      const p = reduced ? 1 : Math.min(1, ((now - start) * speed) / DURATION);
      setReal(p);
      if (p < 1) raf.current = requestAnimationFrame(tickFn);
      else if (!ended.current) {
        ended.current = true;
        setTimeout(() => endRef.current(), reduced ? 400 : 1000 / speed);
      }
    };
    raf.current = requestAnimationFrame(tickFn);
    return () => cancelAnimationFrame(raf.current);
  }, [h, speed, at]);

  const t = at ?? real;
  const hit = t >= script.impact;
  const ball = sim.ballState(t);
  const shown: [number, number] = hit || h.kind !== "goal" ? h.score : [Math.max(0, h.score[0] - 1), h.score[1]];
  const celebrating = script.outcome === "goal" && hit;

  // Team colours: attacking side is us unless you're the keeper.
  const us = myKit;
  const them = away;
  const attKit = script.mirror ? them : us;
  const defKit = script.mirror ? us : them;
  const keeperShirt = script.mirror ? "#f59e0b" : "#22c55e";

  // Projection: pitch metres → screen (x across, y squashed by the camera tilt).
  const mx = (x: number) => (script.mirror ? W - x : x);
  const sy = (y: number) => y * TILT;

  // Camera follows the ball with a little lead towards goal; zooms in on the shot.
  // After a goal the camera follows the scorer to the corner flag.
  const scorerAt = celebrating && script.scorer ? sim.actorPos(script.scorer, t) : null;
  const leadBall = sim.ballState(Math.min(1, t + 0.05));
  const follow = clamp((t - script.impact) / 0.15, 0, 1);
  const focus = scorerAt ? { x: lerp(ball.x, scorerAt.x, follow), y: lerp(ball.y, scorerAt.y, follow) } : ball;
  const lead = scorerAt ? focus : leadBall;
  const zoom = hit ? 0.92 : 1;
  const vw = VIEW_W * zoom;
  const vh = vw * 0.56;
  const cx = clamp(mx(lerp(focus.x, lead.x, 0.5)) + (script.mirror ? -4 : 4), vw / 2 - 6, W + 6 - vw / 2);
  const cy = clamp(sy(lerp(focus.y, H / 2, scorerAt ? 0.1 : 0.35)) - 1.5, -11 + vh / 2, sy(H) + 3 - vh / 2);
  const view = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;

  // People, drawn far-to-near.
  const people = script.actors
    .map((a) => {
      const p = sim.actorPos(a.key, t);
      const q = sim.actorPos(a.key, Math.max(0, t - 0.012));
      const vx = mx(p.x) - mx(q.x);
      const sp = Math.hypot(p.x - q.x, p.y - q.y);
      const amp = clamp(sp / 0.32, 0, 1);
      const kickSeg = script.ball.find((b) => b.kind === "kick" && b.by === a.key && t >= b.t0 - 0.012 && t <= b.t0 + 0.03);
      const isScorer = celebrating && a.key === script.scorer;
      const mates = celebrating && a.team === "att" && (a.key === "a1" || a.key === "a2");
      const pose: Pose = a.keeper && t >= script.shotAt ? "dive" : kickSeg ? "kick" : isScorer || (mates && t > script.impact + 0.25) ? "celebrate" : a.keeper ? "ready" : "run";
      const toBall = mx(ball.x) - mx(p.x);
      const facing = pose === "kick" || amp < 0.15 ? (toBall >= 0 ? 1 : -1) : vx >= 0 ? 1 : -1;
      const diveK = a.keeper ? clamp((t - script.shotAt) / (script.impact - script.shotAt + 0.02), 0, 1) : 0;
      return { a, p, amp: pose === "celebrate" ? 0.8 : amp, pose, facing: a.keeper && pose === "dive" ? (script.mirror ? 1 : -1) : facing, phase: sim.stride(a.key, t) * 2.1, diveK };
    })
    .sort((m, n) => m.p.y - n.p.y);

  const goalTop = 2.44 * S;
  const goalBack = 2;
  const net = (gx: number, dir: number, shake: boolean) => {
    const y1 = sy(H / 2 - 3.66);
    const y2 = sy(H / 2 + 3.66);
    const bx = gx + dir * goalBack;
    const bulge = shake ? dir * 0.9 : 0;
    return (
      <g>
        <path d={`M${gx} ${y1} L${bx} ${y1 - 0.2} L${bx + bulge} ${y2 - 0.2} L${gx} ${y2} Z`} fill="rgba(255,255,255,0.18)" />
        <path d={`M${gx} ${y1 - goalTop} L${bx + bulge * 0.6} ${y1 - goalTop * 0.75} L${bx + bulge} ${y2 - goalTop * 0.75} L${gx} ${y2 - goalTop} Z`} fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.5)" strokeWidth={0.06} />
        {Array.from({ length: 9 }, (_, i) => {
          const k = i / 8;
          return <line key={i} x1={gx} y1={lerp(y1, y2, k) - goalTop} x2={bx + bulge} y2={lerp(y1, y2, k) - goalTop * 0.75} stroke="rgba(255,255,255,0.35)" strokeWidth={0.04} />;
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const k = i / 5;
          return <line key={`v${i}`} x1={lerp(gx, bx + bulge, 0.5)} y1={lerp(y1, y2, k) - goalTop * 0.88 + 0.1} x2={lerp(gx, bx + bulge, 0.5)} y2={lerp(y1, y2, k) - 0.1} stroke="rgba(255,255,255,0.25)" strokeWidth={0.04} />;
        })}
      </g>
    );
  };
  const frame = (gx: number) => (
    <g stroke="#f8fafc" strokeWidth={0.16} strokeLinecap="round">
      <line x1={gx} y1={sy(H / 2 - 3.66)} x2={gx} y2={sy(H / 2 - 3.66) - goalTop} />
      <line x1={gx} y1={sy(H / 2 + 3.66)} x2={gx} y2={sy(H / 2 + 3.66) - goalTop} />
      <line x1={gx} y1={sy(H / 2 - 3.66) - goalTop} x2={gx} y2={sy(H / 2 + 3.66) - goalTop} />
    </g>
  );
  const targetGoalX = mx(W);
  const otherGoalX = mx(0);
  const netShake = celebrating && t < script.impact + 0.2;
  const crowdColors = [us.primary, us.secondary, them.primary];

  const ballScreen = { x: mx(ball.x), y: sy(ball.y) };
  const ballR = BALL_R;
  const lift = (z: number) => z * 0.95;
  // Motion trail while the ball travels (not while dribbled).
  const trail = ball.owner
    ? []
    : Array.from({ length: 7 }, (_, i) => {
        const b = sim.ballState(Math.max(0, t - (i + 1) * 0.0045));
        return { x: mx(b.x), y: sy(b.y) - ballR - lift(b.z), o: 0.32 * (1 - i / 7) };
      });

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-emerald-950/40 bg-emerald-800 shadow-xl">
      <div className="absolute top-2 left-2 z-10" dir="ltr">
        {scoreLine(shown)}
      </div>

      <svg viewBox={view} className="block aspect-[16/9] w-full" preserveAspectRatio="xMidYMid slice" style={{ direction: "ltr" }} role="img" aria-label={caption}>
        <defs>
          <linearGradient id="hl-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.25" />
            <stop offset="0.35" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.06" />
          </linearGradient>
          <radialGradient id="hl-ball" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.7" stopColor="#e5e7eb" />
            <stop offset="1" stopColor="#9ca3af" />
          </radialGradient>
        </defs>

        <Crowd colors={crowdColors} jump={celebrating} />
        {/* Grass with mowing stripes */}
        <rect x={-22} y={-1.6} width={W + 44} height={sy(H) + 14} fill="#2d6b2f" />
        {Array.from({ length: 18 }, (_, i) => (
          <rect key={i} x={i * (W / 18)} y={-1.6} width={W / 18} height={sy(H) + 14} fill={i % 2 ? "#357a37" : "#2f7032"} />
        ))}
        <rect x={-22} y={-1.6} width={W + 44} height={sy(H) + 14} fill="url(#hl-light)" />
        {/* Lines */}
        <g fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={0.12}>
          <rect x={0} y={0} width={W} height={sy(H)} />
          <line x1={W / 2} y1={0} x2={W / 2} y2={sy(H)} />
          <ellipse cx={W / 2} cy={sy(H / 2)} rx={9.15} ry={9.15 * TILT} />
          {[0, W].map((gx) => {
            const d = gx === 0 ? 1 : -1;
            return (
              <g key={gx}>
                <rect x={Math.min(gx, gx + d * 16.5)} y={sy(H / 2 - 20.16)} width={16.5} height={sy(40.32)} />
                <rect x={Math.min(gx, gx + d * 5.5)} y={sy(H / 2 - 9.16)} width={5.5} height={sy(18.32)} />
                <ellipse cx={gx + d * 11} cy={sy(H / 2)} rx={0.13} ry={0.08} fill="rgba(255,255,255,0.7)" stroke="none" />
                <path d={`M${gx + d * 16.5} ${sy(H / 2 - 7.3)} A9.15 ${9.15 * TILT} 0 0 ${gx === 0 ? 1 : 0} ${gx + d * 16.5} ${sy(H / 2 + 7.3)}`} />
              </g>
            );
          })}
        </g>

        {/* Back of both goals behind the players */}
        {net(otherGoalX, script.mirror ? 1 : -1, false)}
        {net(targetGoalX, script.mirror ? -1 : 1, netShake)}

        {/* Ball shadow */}
        <ellipse cx={ballScreen.x + ball.z * 0.12} cy={ballScreen.y} rx={ballR * (1 - Math.min(0.55, ball.z * 0.08))} ry={ballR * 0.32} fill="rgba(0,0,0,0.4)" opacity={1 - Math.min(0.6, ball.z * 0.08)} />

        {people.map(({ a, p, amp, pose, facing, phase, diveK }) => {
          const kit = a.team === "att" ? attKit : defKit;
          const depth = 0.78 + 0.42 * (p.y / H); // far side smaller, like a real lens
          return (
            <Figure
              key={a.key}
              x={mx(p.x)}
              y={sy(p.y)}
              scale={S * depth}
              facing={facing}
              phase={phase}
              amp={amp}
              pose={pose}
              diveK={diveK}
              shirt={a.keeper ? keeperShirt : kit.primary}
              shorts={a.keeper ? "#111827" : kit.secondary === kit.primary ? "#111827" : kit.secondary}
              socks={a.keeper ? "#111827" : kit.primary}
              skin={a.you && playerSkin ? playerSkin : a.skin}
              hair={a.hair}
              you={a.you}
              keeper={a.keeper}
            />
          );
        })}

        {/* Ball (rises with height, spins with distance) */}
        {trail.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={ballR * (1 - i * 0.08)} fill="#fff" opacity={p.o} />
        ))}
        <g transform={`translate(${ballScreen.x} ${ballScreen.y - ballR - lift(ball.z)})`}>
          <circle r={ballR * 1.9} fill="rgba(255,255,255,0.12)" />
          <circle r={ballR} fill="url(#hl-ball)" />
          <g transform={`rotate(${(ball.x + ball.y) * 40})`} opacity={0.75}>
            <path d={`M0 ${-ballR * 0.4} L${ballR * 0.38} ${-ballR * 0.1} L${ballR * 0.24} ${ballR * 0.34} L${-ballR * 0.24} ${ballR * 0.34} L${-ballR * 0.38} ${-ballR * 0.1} Z`} fill="#334155" />
          </g>
        </g>

        {/* Goal frames in front */}
        {frame(otherGoalX)}
        {frame(targetGoalX)}
      </svg>

      {/* Flash on impact, big moment text */}
      <div className={cn("pointer-events-none absolute inset-0 bg-white transition-opacity duration-300", hit && t < script.impact + 0.02 ? "opacity-40" : "opacity-0")} />
      <div className={cn("pointer-events-none absolute inset-0 grid place-items-center transition-all duration-500", hit ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
        <span className={cn("rounded-xl px-5 py-2 font-heading text-4xl font-black tracking-wide text-white drop-shadow-lg sm:text-6xl", h.kind === "chance" ? "bg-black/50" : "bg-amber-500/90", celebrating && "animate-bounce")}>{label}</span>
      </div>
      {celebrating && <Confetti />}

      <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2 text-center text-sm font-semibold text-white sm:text-base">
        {caption}
        <span className="sr-only"> #{playerNumber}</span>
      </p>
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
