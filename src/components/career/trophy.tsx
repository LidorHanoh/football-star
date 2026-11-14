import { useId } from "react";
import type { Trophy } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const SILVER: Trophy[] = ["youthCup", "wall"];

/** Hand-drawn SVG trophies, one shape per award, on a wooden plinth. */
export function TrophyArt({ kind, className, title }: { kind: Trophy; className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const silver = SILVER.includes(kind);
  const metal = `url(#m${uid})`;
  const dark = silver ? "#475569" : "#92400e";
  return (
    <svg viewBox="0 0 100 120" className={cn("block", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1">
          {silver ? (
            <>
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.45" stopColor="#cbd5e1" />
              <stop offset="1" stopColor="#64748b" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#fff7c2" />
              <stop offset="0.35" stopColor="#fbbf24" />
              <stop offset="0.75" stopColor="#d97706" />
              <stop offset="1" stopColor="#92400e" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`w${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#57341c" />
          <stop offset="1" stopColor="#2a160a" />
        </linearGradient>
        <radialGradient id={`g${uid}`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor={silver ? "#e2e8f0" : "#fde68a"} stopOpacity="0.55" />
          <stop offset="1" stopColor={silver ? "#e2e8f0" : "#fde68a"} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="48" rx="46" ry="44" fill={`url(#g${uid})`} />
      {/* plinth */}
      <path d="M26 98 H74 L78 116 H22 Z" fill={`url(#w${uid})`} />
      <rect x="38" y="104" width="24" height="6" rx="1" fill={metal} opacity="0.9" />
      <g stroke={dark} strokeWidth="1.2" strokeLinejoin="round">
        {kind === "league" || kind === "youthCup" ? <Cup metal={metal} small={kind === "youthCup"} /> : null}
        {kind === "goldenBoot" && <Boot metal={metal} />}
        {kind === "playmaker" && <Ball metal={metal} dark={dark} />}
        {kind === "playerOfSeason" && <Star metal={metal} />}
        {kind === "goldenGlove" && <Glove metal={metal} />}
        {kind === "wall" && <Shield metal={metal} dark={dark} />}
      </g>
      {/* shine */}
      <path d="M34 26 Q36 44 44 54" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55" />
    </svg>
  );
}

function Cup({ metal, small }: { metal: string; small?: boolean }) {
  return (
    <g transform={small ? "translate(10 12) scale(0.8)" : undefined}>
      <path d="M30 22 Q16 22 17 34 Q18 47 34 50" fill="none" strokeWidth="5" stroke={metal} />
      <path d="M70 22 Q84 22 83 34 Q82 47 66 50" fill="none" strokeWidth="5" stroke={metal} />
      <path d="M27 14 H73 Q74 50 50 62 Q26 50 27 14 Z" fill={metal} />
      <ellipse cx="50" cy="14" rx="23" ry="4" fill={metal} />
      <rect x="45" y="61" width="10" height="16" fill={metal} />
      <path d="M33 98 Q34 82 50 78 Q66 82 67 98 Z" fill={metal} />
      <path d="M38 36 L44 30 M50 40 L58 30" stroke="#fff" strokeOpacity="0.4" strokeWidth="1.5" />
    </g>
  );
}

function Boot({ metal }: { metal: string }) {
  return (
    <g>
      <rect x="44" y="78" width="12" height="20" fill={metal} />
      <path d="M22 76 L28 30 Q30 24 36 24 L50 24 Q55 24 55 30 L56 48 Q74 50 84 62 Q88 70 82 76 Z" fill={metal} />
      <path d="M30 40 L54 40 M30 48 L52 48" stroke="#fff" strokeOpacity="0.45" />
      <path d="M58 54 L64 50 M64 58 L70 53 M70 62 L76 57" strokeWidth="1.5" />
      <g fill={metal}>
        <rect x="28" y="76" width="5" height="5" rx="1" />
        <rect x="44" y="76" width="5" height="5" rx="1" />
        <rect x="62" y="76" width="5" height="5" rx="1" />
        <rect x="74" y="76" width="5" height="5" rx="1" />
      </g>
    </g>
  );
}

function Ball({ metal, dark }: { metal: string; dark: string }) {
  return (
    <g>
      <path d="M38 98 L42 70 H58 L62 98 Z" fill={metal} />
      <circle cx="50" cy="42" r="27" fill={metal} />
      <path d="M50 30 L61 38 L57 51 L43 51 L39 38 Z" fill={dark} opacity="0.75" />
      <path d="M50 30 V16 M61 38 L75 33 M57 51 L65 63 M43 51 L35 63 M39 38 L25 33" fill="none" />
      <path d="M36 18 Q30 22 26 30" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" fill="none" />
    </g>
  );
}

function Star({ metal }: { metal: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 13 : 31;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(40 + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      <path d="M44 66 L56 66 L60 98 L40 98 Z" fill={metal} />
      <polygon points={pts} fill={metal} />
      <circle cx="50" cy="40" r="7" fill="#fff" opacity="0.35" stroke="none" />
    </g>
  );
}

function Glove({ metal }: { metal: string }) {
  return (
    <g>
      <rect x="40" y="80" width="20" height="18" rx="2" fill={metal} />
      <path d="M32 82 L32 46 Q32 40 37 40 L37 30 Q37 25 42 25 Q46 25 46 30 L46 22 Q46 17 51 17 Q55 17 55 22 L55 26 Q55 21 60 21 Q64 21 64 26 L64 32 Q64 28 68 28 Q72 28 72 33 L72 64 Q72 76 62 82 Z" fill={metal} />
      <path d="M32 58 Q22 52 20 44 Q19 38 24 38 Q28 38 32 46" fill={metal} />
      <path d="M46 30 V50 M55 26 V50 M64 32 V52" stroke="#fff" strokeOpacity="0.4" fill="none" />
      <rect x="32" y="70" width="40" height="7" fill={metal} />
    </g>
  );
}

function Shield({ metal, dark }: { metal: string; dark: string }) {
  return (
    <g>
      <rect x="44" y="76" width="12" height="22" fill={metal} />
      <path d="M50 12 L78 22 V46 Q78 70 50 84 Q22 70 22 46 V22 Z" fill={metal} />
      <path d="M50 22 L68 29 V46 Q68 63 50 73 Q32 63 32 46 V29 Z" fill="none" stroke={dark} strokeOpacity="0.6" />
      <path d="M41 46 L48 53 L61 38" fill="none" stroke={dark} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}
