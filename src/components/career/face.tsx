import { useId } from "react";
import type { Kit } from "@/lib/engine/people";
import { cn } from "@/lib/utils";

/**
 * Portraits: AI-generated people who don't exist (public/faces), cut out of
 * their photo background and dressed by us — players in their club shirt,
 * agents in a suit and tie, coaches in the club tracksuit.
 */
export type FaceKind = "player" | "agent" | "manager";

const POOL: Record<FaceKind, { prefix: string; size: number }> = {
  player: { prefix: "p", size: 93 },
  agent: { prefix: "a", size: 25 },
  manager: { prefix: "m", size: 30 },
};

export const faceCount = (kind: FaceKind = "player") => POOL[kind].size;

export function faceSrc(seed: number, kind: FaceKind = "player") {
  const { prefix, size } = POOL[kind];
  return `/faces/${prefix}${((Math.floor(seed) % size) + size) % size}.webp`;
}

const NEUTRAL: Kit = { primary: "#334155", secondary: "#e2e8f0", text: "#ffffff" };

export function Face({
  seed,
  kind = "player",
  kit,
  number,
  className,
  title,
  plain,
}: {
  seed: number;
  kind?: FaceKind;
  kit?: Kit;
  number?: number;
  className?: string;
  title?: string;
  /** No background card (just the person). */
  plain?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const k = kit ?? (kind === "agent" ? { primary: "#1e293b", secondary: "#94a3b8", text: "#fff" } : NEUTRAL);
  const bgA = kind === "agent" ? "#334155" : k.primary;
  const bgB = kind === "agent" ? "#0f172a" : k.secondary === "#ffffff" || k.secondary === "#f8fafc" ? "#0f172a" : k.secondary;
  return (
    <span className={cn("relative block shrink-0 overflow-hidden", className)} title={title} role={title ? "img" : undefined} aria-label={title}>
      <svg viewBox="0 0 100 100" className="block size-full" aria-hidden>
        <defs>
          <radialGradient id={`bg${uid}`} cx="0.5" cy="0.35" r="0.8">
            <stop offset="0" stopColor={bgA} stopOpacity="0.95" />
            <stop offset="1" stopColor={bgB} />
          </radialGradient>
          <linearGradient id={`sh${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="1" stopColor="#000" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {!plain && (
          <>
            <rect width="100" height="100" fill={`url(#bg${uid})`} />
            {/* light streaks like a trading card */}
            <path d="M-10 70 L60 -10 L75 -10 L5 70 Z" fill="#fff" opacity="0.07" />
            <path d="M30 110 L110 20 L118 20 L38 110 Z" fill="#fff" opacity="0.05" />
          </>
        )}
        <image href={faceSrc(seed, kind)} x="17" y="-2" width="66" height="74.6" preserveAspectRatio="xMidYMid meet" />
        {kind === "player" && <Jersey kit={k} number={number} shade={`url(#sh${uid})`} />}
        {kind === "agent" && <Suit seed={seed} shade={`url(#sh${uid})`} />}
        {kind === "manager" && <Tracksuit kit={k} shade={`url(#sh${uid})`} />}
      </svg>
    </span>
  );
}

const SHOULDERS = "M0 100 L0 90 Q2 80 18 77 L38 73 Q50 79 62 73 L82 77 Q98 80 100 90 L100 100 Z";

function Jersey({ kit, number, shade }: { kit: Kit; number?: number; shade: string }) {
  return (
    <g>
      <path d={SHOULDERS} fill={kit.primary} stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
      {/* sleeves trim + collar */}
      <path d="M0 92 Q4 82 14 79 L16 84 Q6 87 3 100 L0 100 Z" fill={kit.secondary} opacity="0.9" />
      <path d="M100 92 Q96 82 86 79 L84 84 Q94 87 97 100 L100 100 Z" fill={kit.secondary} opacity="0.9" />
      <path d="M38 73 Q50 85 62 73 L59 72.5 Q50 80 41 72.5 Z" fill={kit.secondary} />
      <path d={SHOULDERS} fill={shade} />
      {number !== undefined && (
        <text x="50" y="97" textAnchor="middle" fontSize="12" fontWeight="900" fill={kit.text} stroke="rgba(0,0,0,0.3)" strokeWidth="0.4" fontFamily="system-ui, sans-serif">
          {number}
        </text>
      )}
    </g>
  );
}

function Suit({ seed, shade }: { seed: number; shade: string }) {
  const suit = ["#1f2937", "#0f172a", "#374151", "#1e3a5f", "#3f3f46"][Math.abs(seed) % 5];
  const tie = ["#b91c1c", "#1d4ed8", "#7c3aed", "#047857", "#a16207", "#be185d"][Math.abs(seed >> 3) % 6];
  return (
    <g>
      <path d={SHOULDERS} fill={suit} stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
      {/* shirt + tie */}
      <path d="M38 73 L50 100 L62 73 Q50 79 38 73 Z" fill="#f8fafc" />
      <path d="M47.5 78 L52.5 78 L54 96 L50 100 L46 96 Z" fill={tie} />
      <path d="M46.5 75.5 L53.5 75.5 L52.5 79 L47.5 79 Z" fill={tie} />
      {/* lapels */}
      <path d="M38 73 L45 88 L41 90 L50 100 L33 76 Z" fill={suit} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
      <path d="M62 73 L55 88 L59 90 L50 100 L67 76 Z" fill={suit} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
      <path d="M22 85 L30 84" stroke="#f8fafc" strokeWidth="1.2" />
      <path d={SHOULDERS} fill={shade} />
    </g>
  );
}

function Tracksuit({ kit, shade }: { kit: Kit; shade: string }) {
  return (
    <g>
      <path d={SHOULDERS} fill={kit.primary} stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
      <path d="M41 73 Q50 76 59 73 L58 79 Q50 82 42 79 Z" fill={kit.secondary} />
      <line x1="50" y1="80" x2="50" y2="100" stroke={kit.secondary} strokeWidth="1.2" />
      <path d="M8 79 L4 100 M14 78 L10 100" stroke={kit.secondary} strokeWidth="1.6" />
      <path d="M92 79 L96 100 M86 78 L90 100" stroke={kit.secondary} strokeWidth="1.6" />
      <circle cx="66" cy="86" r="3" fill={kit.secondary} opacity="0.85" />
      <path d={SHOULDERS} fill={shade} />
    </g>
  );
}
