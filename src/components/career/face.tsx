import type { Kit } from "@/lib/engine/people";
import { cn } from "@/lib/utils";

/**
 * Portraits: AI-generated photos of people who don't exist (public/faces).
 * Each seed always maps to the same photo. Players come from a pool of young
 * men, agents from people in business clothes, coaches from older men.
 */
export type FaceKind = "player" | "agent" | "manager";

const POOL: Record<FaceKind, { prefix: string; size: number }> = {
  player: { prefix: "p", size: 54 },
  agent: { prefix: "a", size: 24 },
  manager: { prefix: "m", size: 20 },
};

export const faceCount = (kind: FaceKind = "player") => POOL[kind].size;

export function faceSrc(seed: number, kind: FaceKind = "player") {
  const { prefix, size } = POOL[kind];
  return `/faces/${prefix}${(((Math.floor(seed) % size) + size) % size)}.webp`;
}

/** A portrait photo. Players get a ring in their club colours and their shirt number. */
export function Face({ seed, kind = "player", kit, number, className, title }: { seed: number; kind?: FaceKind; kit?: Kit; number?: number; className?: string; title?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-muted", className)} title={title} role={title ? "img" : undefined} aria-label={title}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static portrait */}
      <img src={faceSrc(seed, kind)} alt="" decoding="async" className="size-full object-cover" draggable={false} />
      {kit && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[22%] items-center justify-center text-[0.6rem] leading-none font-black"
          style={{ background: `linear-gradient(90deg, ${kit.primary} 0 70%, ${kit.secondary} 70% 100%)`, color: kit.text }}
        >
          {number !== undefined && <span className="scale-110 tabular-nums">{number}</span>}
        </span>
      )}
      {!kit && number !== undefined && (
        <span aria-hidden className="pointer-events-none absolute end-1 bottom-1 rounded bg-black/60 px-1 text-[0.6rem] font-black text-white tabular-nums">
          {number}
        </span>
      )}
    </span>
  );
}
