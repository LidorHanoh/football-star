import { useId } from "react";
import { clubKit, hash } from "@/lib/engine/people";
import type { WorldClub } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

/**
 * A made-up crest in the club's colours with its initials. Real club badges are
 * trademarks, so the game never shows them.
 */
export function Crest({ club, className }: { club: Pick<WorldClub, "id" | "name">; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const kit = clubKit(club);
  const h = hash(club.id);
  const shape = h % 3;
  const pattern = (h >> 3) % 4;
  const initials = club.name.en
    .replace(/\b(FC|CF|SC|AFC|AC|SV|FK|CD|CA|Club|de|da|do|of|the|1\.)\b/gi, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const path =
    shape === 0
      ? "M20 4 L36 9 L36 22 C36 32 28 38 20 42 C12 38 4 32 4 22 L4 9 Z"
      : shape === 1
        ? "M20 3 C30 3 36 8 36 8 L36 24 C36 34 20 42 20 42 C20 42 4 34 4 24 L4 8 C4 8 10 3 20 3 Z"
        : "M6 5 L34 5 L34 26 C34 35 26 40 20 42 C14 40 6 35 6 26 Z";
  return (
    <svg viewBox="0 0 40 46" className={cn("block shrink-0 drop-shadow-sm", className)} aria-hidden style={{ direction: "ltr" }}>
      <defs>
        <clipPath id={`cr${uid}`}>
          <path d={path} />
        </clipPath>
        <linearGradient id={`gl${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#cr${uid})`}>
        <rect width="40" height="46" fill={kit.primary} />
        {pattern === 0 && [8, 20, 32].map((x) => <rect key={x} x={x - 2.5} y="0" width="5" height="46" fill={kit.secondary} />)}
        {pattern === 1 && <rect x="0" y="16" width="40" height="8" fill={kit.secondary} />}
        {pattern === 2 && <path d="M0 0 L40 46 L40 30 L14 0 Z" fill={kit.secondary} />}
        {pattern === 3 && <rect x="20" y="0" width="20" height="46" fill={kit.secondary} />}
        <circle cx="20" cy="22" r="10.5" fill={kit.primary} stroke={kit.secondary} strokeWidth="1.6" />
        <rect width="40" height="46" fill={`url(#gl${uid})`} />
      </g>
      <path d={path} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" />
      <text x="20" y="25.5" textAnchor="middle" fontSize={initials.length > 2 ? 7 : 9} fontWeight="900" fill={kit.text === kit.primary ? kit.secondary : kit.text} fontFamily="system-ui, sans-serif">
        {initials}
      </text>
    </svg>
  );
}
