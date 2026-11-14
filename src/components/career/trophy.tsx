import { useId } from "react";
import type { Trophy } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const SILVER: Trophy[] = ["youthCup", "wall", "cup", "cl", "el", "euro", "copa"];

/**
 * Trophies drawn like polished metal: every part is shaded as a cylinder
 * (dark edges, a bright band, a rim light), on a black marble plinth.
 * Each award has its own silhouette — the World Cup, the big ears, the boot…
 */
export function TrophyArt({ kind, className, title }: { kind: Trophy; className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const silver = SILVER.includes(kind);
  const id = (k: string) => `${k}${uid}`;
  const m = `url(#${id("m")})`; // the trophy's own metal, shaded per part
  const g = `url(#${id("g")})`; // gold, for accents on silver trophies
  const s = `url(#${id("s")})`; // silver
  const P = { m, g, s, mal: `url(#${id("mal")})`, dark: silver ? "#334155" : "#78350f", hi: `url(#${id("hi")})` };
  return (
    <svg viewBox="0 0 100 120" className={cn("block", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={id("gold")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5c3a0a" />
          <stop offset="0.14" stopColor="#a8700f" />
          <stop offset="0.32" stopColor="#fff3c4" />
          <stop offset="0.42" stopColor="#f6c445" />
          <stop offset="0.68" stopColor="#c8891a" />
          <stop offset="0.88" stopColor="#7a4e0c" />
          <stop offset="1" stopColor="#e8b54a" />
        </linearGradient>
        <linearGradient id={id("silver")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b4452" />
          <stop offset="0.14" stopColor="#8a94a3" />
          <stop offset="0.32" stopColor="#ffffff" />
          <stop offset="0.42" stopColor="#dfe5ec" />
          <stop offset="0.68" stopColor="#9aa4b2" />
          <stop offset="0.88" stopColor="#4b5563" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={id("m")} href={`#${id(silver ? "silver" : "gold")}`} />
        <linearGradient id={id("g")} href={`#${id("gold")}`} />
        <linearGradient id={id("s")} href={`#${id("silver")}`} />
        <linearGradient id={id("mal")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#022c22" />
          <stop offset="0.35" stopColor="#10b981" />
          <stop offset="0.5" stopColor="#6ee7b7" />
          <stop offset="0.75" stopColor="#047857" />
          <stop offset="1" stopColor="#022c22" />
        </linearGradient>
        <linearGradient id={id("marble")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f3f46" />
          <stop offset="0.45" stopColor="#18181b" />
          <stop offset="1" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id={id("hi")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("glow")} cx="0.5" cy="0.42" r="0.55">
          <stop offset="0" stopColor={silver ? "#e2e8f0" : "#fde68a"} stopOpacity="0.5" />
          <stop offset="1" stopColor={silver ? "#e2e8f0" : "#fde68a"} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="48" ry="46" fill={`url(#${id("glow")})`} />
      {/* black marble plinth with a plate */}
      <ellipse cx="50" cy="117" rx="30" ry="2.5" fill="#000" opacity="0.4" />
      <path d="M24 100 H76 L79 116 H21 Z" fill={`url(#${id("marble")})`} />
      <path d="M24 100 H76 L76.6 103 H23.4 Z" fill="#fff" opacity="0.12" />
      <rect x="38" y="106" width="24" height="5.5" rx="0.8" fill={g} />

      {kind === "wc" && <WorldCup {...P} />}
      {kind === "cl" && <BigEars {...P} />}
      {kind === "el" && <EuropaVase {...P} />}
      {kind === "euro" && <Delaunay {...P} />}
      {kind === "copa" && <Copa {...P} />}
      {kind === "league" && <LeagueCup {...P} />}
      {kind === "cup" && <LidCup {...P} />}
      {kind === "youthCup" && (
        <g transform="translate(12 18) scale(0.76)">
          <LidCup {...P} />
        </g>
      )}
      {kind === "goldenBoot" && <Boot {...P} />}
      {kind === "playmaker" && <GoldBall {...P} />}
      {kind === "playerOfSeason" && <StarAward {...P} />}
      {kind === "goldenGlove" && <Glove {...P} />}
      {kind === "wall" && <Shield {...P} />}
    </svg>
  );
}

type Paint = { m: string; g: string; s: string; mal: string; dark: string; hi: string };

/** A stem and stepped foot under any cup. */
function Foot({ m, top = 66, w = 9 }: { m: string; top?: number; w?: number }) {
  return (
    <>
      <path d={`M${50 - w / 2} ${top} H${50 + w / 2} L${50 + w / 2 + 1} ${top + 16} H${50 - w / 2 - 1} Z`} fill={m} />
      <ellipse cx="50" cy={top + 16} rx={w / 2 + 6} ry="2.2" fill={m} />
      <path d={`M${50 - w / 2 - 8} 100 Q${50 - w / 2 - 6} ${top + 19} 50 ${top + 18} Q${50 + w / 2 + 6} ${top + 19} ${50 + w / 2 + 8} 100 Z`} fill={m} />
    </>
  );
}

/** The World Cup: two figures spiralling up to hold the globe, green bands at the base. */
function WorldCup({ g, mal, hi }: Paint) {
  return (
    <>
      <path d="M36 100 L37 90 H63 L64 100 Z" fill={g} />
      <rect x="37" y="85" width="26" height="4" fill={mal} />
      <rect x="38" y="80" width="24" height="3.5" fill={mal} />
      <path d="M38 80 L39 76 H61 L62 80 Z" fill={g} />
      {/* the spiralling figures */}
      <path d="M40 76 C36 66 46 60 44 50 C42 42 34 40 34 32 L42 30 C44 38 50 42 50 50 C50 58 44 64 48 76 Z" fill={g} />
      <path d="M60 76 C64 66 54 60 56 50 C58 42 66 40 66 32 L58 30 C56 38 50 42 50 50 C50 58 56 64 52 76 Z" fill={g} />
      <path d="M44 64 C48 58 52 58 56 64" fill="none" stroke="#7a4e0c" strokeWidth="0.8" opacity="0.6" />
      {/* the globe, with continents */}
      <circle cx="50" cy="22" r="16" fill={g} />
      <path d="M40 14 C44 12 46 16 44 19 C42 22 38 21 38 18 Z M52 10 C58 10 62 14 60 18 C58 20 54 18 53 15 Z M47 25 C52 24 56 28 54 33 C51 35 47 32 47 28 Z M60 24 C63 24 64 28 62 30 Z" fill="#7a4e0c" opacity="0.55" />
      <ellipse cx="44" cy="15" rx="6" ry="4" fill={hi} opacity="0.7" />
    </>
  );
}

/** The Champions League trophy: a tall silver body with the famous big ears. */
function BigEars({ m, hi }: Paint) {
  return (
    <>
      <path d="M31 12 C12 10 10 34 22 46 C27 51 33 53 38 54 L39 49 C34 48 29 46 26 42 C18 33 20 18 32 19 Z" fill={m} />
      <path d="M69 12 C88 10 90 34 78 46 C73 51 67 53 62 54 L61 49 C66 48 71 46 74 42 C82 33 80 18 68 19 Z" fill={m} />
      <path d="M31 8 H69 C69 36 63 56 50 60 C37 56 31 36 31 8 Z" fill={m} />
      <ellipse cx="50" cy="8" rx="19" ry="2.6" fill={m} />
      <path d="M35 12 C35 30 39 44 44 51 L41 51 C36 44 33 30 33 12 Z" fill={hi} opacity="0.6" />
      <Foot m={m} top={60} w={8} />
    </>
  );
}

/** The Europa League trophy: a wide silver vase on a narrow neck. */
function EuropaVase({ m, g, hi }: Paint) {
  return (
    <>
      <path d="M30 8 H70 L66 14 C74 22 74 40 62 50 C58 53 54 55 50 55 C46 55 42 53 38 50 C26 40 26 22 34 14 Z" fill={m} />
      <ellipse cx="50" cy="8" rx="20" ry="2.4" fill={m} />
      <path d="M32 24 Q50 30 68 24" fill="none" stroke={g} strokeWidth="2" />
      <path d="M33 38 Q50 44 67 38" fill="none" stroke={g} strokeWidth="1.5" />
      <path d="M36 16 C30 26 32 40 40 48 L37 48 C29 40 28 26 33 16 Z" fill={hi} opacity="0.55" />
      <Foot m={m} top={55} w={7} />
    </>
  );
}

/** The Euro trophy (Henri Delaunay): tall and slim, small handles at the top. */
function Delaunay({ m, hi }: Paint) {
  return (
    <>
      <path d="M36 6 H64 L60 50 C59 56 55 60 50 60 C45 60 41 56 40 50 Z" fill={m} />
      <ellipse cx="50" cy="6" rx="14" ry="2" fill={m} />
      <path d="M36 9 C29 10 28 20 37 24 L37.5 21 C32 19 32 13 36.5 12 Z" fill={m} />
      <path d="M64 9 C71 10 72 20 63 24 L62.5 21 C68 19 68 13 63.5 12 Z" fill={m} />
      <path d="M40 9 L43 50 L41 50 L38 9 Z" fill={hi} opacity="0.6" />
      <Foot m={m} top={60} w={7} />
    </>
  );
}

/** The Copa América: a silver cup with gold bands. */
function Copa({ m, g, hi }: Paint) {
  return (
    <>
      <path d="M30 14 C18 14 16 30 30 36 M70 14 C82 14 84 30 70 36" fill="none" stroke={m} strokeWidth="4" strokeLinecap="round" />
      <path d="M28 10 H72 C72 36 64 52 50 56 C36 52 28 36 28 10 Z" fill={m} />
      <ellipse cx="50" cy="10" rx="22" ry="3" fill={m} />
      <rect x="30" y="22" width="40" height="3" fill={g} />
      <path d="M33 13 C33 30 38 44 45 50 L42 50 C35 44 31 30 31 13 Z" fill={hi} opacity="0.55" />
      <Foot m={m} top={56} w={9} />
      <rect x="40" y="84" width="20" height="3" fill={g} />
    </>
  );
}

/** League trophy: a two-handled cup with a lid and finial. */
function LeagueCup({ m, hi }: Paint) {
  return (
    <>
      <path d="M30 22 C16 20 14 42 34 46 L35 42 C22 38 23 27 31 27 Z" fill={m} />
      <path d="M70 22 C84 20 86 42 66 46 L65 42 C78 38 77 27 69 27 Z" fill={m} />
      <path d="M28 18 H72 C72 42 64 56 50 59 C36 56 28 42 28 18 Z" fill={m} />
      <path d="M30 18 C32 10 40 6 50 6 C60 6 68 10 70 18 Z" fill={m} />
      <circle cx="50" cy="4" r="3" fill={m} />
      <path d="M33 20 C33 36 38 48 45 54 L42 54 C35 48 31 36 31 20 Z" fill={hi} opacity="0.55" />
      <Foot m={m} top={59} w={9} />
    </>
  );
}

/** Domestic cup (FA Cup style): lidded, ornate handles. */
function LidCup({ m, hi }: Paint) {
  return (
    <>
      <path d="M31 20 C20 14 14 26 22 34 C26 38 31 40 34 40 L34 36 C30 35 26 33 25 30 C22 25 26 21 31 24 Z" fill={m} />
      <path d="M69 20 C80 14 86 26 78 34 C74 38 69 40 66 40 L66 36 C70 35 74 33 75 30 C78 25 74 21 69 24 Z" fill={m} />
      <path d="M30 16 H70 L68 40 C66 52 58 58 50 58 C42 58 34 52 32 40 Z" fill={m} />
      <path d="M32 16 C34 9 42 6 50 6 C58 6 66 9 68 16 Z" fill={m} />
      <path d="M46 6 L50 0 L54 6 Z" fill={m} />
      <path d="M34 18 L36 42 C38 50 42 54 45 55 L42 55 C37 52 34 48 33 42 L32 18 Z" fill={hi} opacity="0.55" />
      <Foot m={m} top={58} w={8} />
    </>
  );
}

function Boot({ m, hi, dark }: Paint) {
  return (
    <>
      <path d="M44 78 H56 L58 100 H42 Z" fill={m} />
      <path d="M22 74 L27 30 C28 25 31 22 36 22 H50 C54 22 56 25 56 29 L57 46 C68 47 79 52 85 60 C89 66 87 74 80 76 L28 78 C24 78 22 77 22 74 Z" fill={m} />
      {/* laces and stitching */}
      <path d="M50 30 L56 31 M50 35 L57 36 M51 40 L57 41" stroke={dark} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M60 52 C68 54 76 58 82 66" fill="none" stroke={dark} strokeWidth="0.8" strokeDasharray="1.5 1.5" opacity="0.6" />
      <path d="M28 32 C28 50 27 62 26 72 L24 72 C25 60 26 48 27 32 Z" fill={hi} opacity="0.6" />
      {[30, 44, 60, 74].map((x) => (
        <path key={x} d={`M${x} 77 h5 l-1 4 h-3 Z`} fill={m} />
      ))}
    </>
  );
}

function GoldBall({ m, hi, dark }: Paint) {
  return (
    <>
      <path d="M40 100 L43 68 H57 L60 100 Z" fill={m} />
      <ellipse cx="50" cy="68" rx="9" ry="2" fill={m} />
      <circle cx="50" cy="40" r="26" fill={m} />
      <g fill="none" stroke={dark} strokeWidth="1" opacity="0.55">
        <path d="M50 28 L61 36 L57 49 L43 49 L39 36 Z" />
        <path d="M50 28 V14 M61 36 L75 32 M57 49 L65 62 M43 49 L35 62 M39 36 L25 32" />
      </g>
      <path d="M50 28 L61 36 L57 49 L43 49 L39 36 Z" fill={dark} opacity="0.25" />
      <ellipse cx="40" cy="27" rx="10" ry="7" fill={hi} opacity="0.7" />
    </>
  );
}

function StarAward({ m, g, hi }: Paint) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 12 : 29;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(38 + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <>
      <path d="M45 62 H55 L58 100 H42 Z" fill={m} />
      <ellipse cx="50" cy="62" rx="9" ry="2" fill={g} />
      <polygon points={pts} fill={m} />
      <polygon points={pts} fill={hi} opacity="0.25" transform="translate(50 38) scale(0.55) translate(-50 -38)" />
    </>
  );
}

function Glove({ m, hi, dark }: Paint) {
  return (
    <>
      <path d="M40 82 H60 L62 100 H38 Z" fill={m} />
      <path d="M32 82 L32 46 C32 41 34 39 37 39 L37 29 C37 25 39 23 42 23 C45 23 46 25 46 28 L46 21 C46 17 48 15 51 15 C54 15 55 17 55 21 L55 25 C55 21 57 19 60 19 C63 19 64 21 64 25 L64 31 C64 28 66 26 68 26 C71 26 72 28 72 32 L72 64 C72 75 66 80 60 82 Z" fill={m} />
      <path d="M32 58 C24 54 20 48 20 43 C20 38 24 37 28 40 L32 46" fill={m} />
      <path d="M46 30 V50 M55 26 V50 M64 32 V52" stroke={dark} strokeOpacity="0.45" fill="none" />
      <rect x="32" y="70" width="40" height="7" rx="1" fill={m} />
      <path d="M35 44 V68 L33 68 V44 Z" fill={hi} opacity="0.6" />
    </>
  );
}

function Shield({ m, g, dark, hi }: Paint) {
  return (
    <>
      <path d="M44 78 H56 L58 100 H42 Z" fill={m} />
      <path d="M50 10 L80 20 V46 C80 68 66 80 50 88 C34 80 20 68 20 46 V20 Z" fill={m} />
      <path d="M50 20 L70 27 V46 C70 62 60 71 50 76 C40 71 30 62 30 46 V27 Z" fill="none" stroke={g} strokeWidth="1.6" />
      <path d="M41 46 L48 53 L61 38" fill="none" stroke={dark} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 22 V46 C24 58 28 66 34 72 L31 72 C25 66 22 58 22 46 V22 Z" fill={hi} opacity="0.55" />
    </>
  );
}
