import type { Kit } from "@/lib/engine/people";
import { cn } from "@/lib/utils";

/**
 * Portraits. Players: AI footballer photos (public/faces/fp, from the owner's face pack).
 * Coaches and agents: AI-generated people who don't exist (public/faces), cut out of
 * their photo background and kept in their own clothes, on a card in the
 * club's colours (agents get a dark studio card).
 */
export type FaceKind = "player" | "agent" | "manager";

const POOL: Record<FaceKind, { prefix: string; size: number }> = {
  player: { prefix: "fp/f", size: 1000 },
  agent: { prefix: "a", size: 24 },
  manager: { prefix: "m", size: 26 },
};

export const faceCount = (kind: FaceKind = "player") => POOL[kind].size;

export function faceSrc(seed: number, kind: FaceKind = "player") {
  const { prefix, size } = POOL[kind];
  return `/faces/${prefix}${((Math.floor(seed) % size) + size) % size}.webp`;
}

const NEUTRAL: Kit = { primary: "#334155", secondary: "#e2e8f0", text: "#ffffff" };
const isLight = (hex: string) => {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 170;
};

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
  const k = kit ?? NEUTRAL;
  const agent = kind === "agent";
  // Light club colours (white kits) would wash the photo out: darken them.
  const a = agent ? "#475569" : isLight(k.primary) ? (isLight(k.secondary) ? "#1e293b" : k.secondary) : k.primary;
  const b = agent ? "#0f172a" : "#0b1220";
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden", className)}
      title={title}
      role={title ? "img" : undefined}
      aria-label={title}
      style={plain ? undefined : { background: `radial-gradient(120% 90% at 50% 25%, ${a} 0%, ${b} 100%)` }}
    >
      {!plain && kind !== "player" && (
        <>
          {/* soft studio light behind the head */}
          <span aria-hidden className="absolute inset-x-[15%] top-[8%] h-[60%] rounded-full bg-white/15 blur-xl" />
          {/* thin diagonal light streak like a card */}
          <span aria-hidden className="absolute -inset-y-4 start-[58%] w-[14%] rotate-[20deg] bg-white/[0.07]" />
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- small static portrait */}
      <img src={faceSrc(seed, kind)} alt="" draggable={false} loading="lazy" decoding="async" className={cn("relative block size-full object-cover", kind === "player" ? "object-center" : "object-top drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]")} />
      {!plain && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-black/25 to-transparent" />}
      {!plain && !agent && kind === "player" && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[5%]" style={{ background: `linear-gradient(90deg, ${k.primary} 0 50%, ${k.secondary} 50% 100%)` }} />
      )}
      {number !== undefined && (
        <span aria-hidden className="absolute start-[6%] bottom-[8%] font-heading text-sm leading-none font-black text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
          {number}
        </span>
      )}
    </span>
  );
}
