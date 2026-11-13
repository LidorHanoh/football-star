import { useId } from "react";
import type { Kit } from "@/lib/engine/people";
import { Rng } from "@/lib/engine/rng";
import { cn } from "@/lib/utils";

/**
 * Generated portraits: every seed gives a different, stable face.
 * Players wear their club kit, agents a suit, coaches a club training jacket.
 */
const SKIN = ["#f6d5bd", "#efc39f", "#e2a97e", "#c98b5e", "#a96d43", "#8a5432", "#6b3d22", "#4b2a17"];
const HAIR = ["#17110d", "#2b1b12", "#4a2c1b", "#6d4428", "#8f6237", "#c99a5b", "#a24a26"];
const EYES = ["#3b2416", "#4d3322", "#2f4f6f", "#4b6b3a", "#5a4632"];

export type FaceKind = "player" | "agent" | "manager";

interface Look {
  skin: string;
  skinShade: string;
  hair: string;
  hairStyle: number;
  beard: number; // 0 none, 1 stubble, 2 short beard, 3 goatee, 4 moustache
  eyes: string;
  brow: number;
  nose: number;
  mouth: number;
  ears: number;
  glasses: boolean;
  wrinkles: boolean;
  faceW: number;
  jaw: number;
}

function shade(hex: string, k: number) {
  const n = [1, 3, 5].map((i) => Math.round(Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) * k))));
  return `#${n.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function lookFor(seed: number, kind: FaceKind): Look {
  const r = new Rng(seed);
  const skin = r.pick(SKIN);
  const old = kind !== "player" && r.chance(kind === "manager" ? 0.55 : 0.35);
  const grey = old && r.chance(0.7);
  return {
    skin,
    skinShade: shade(skin, 0.82),
    hair: grey ? r.pick(["#9ca3af", "#b6b9bf", "#6b7280"]) : skin === SKIN[0] && r.chance(0.3) ? r.pick(HAIR.slice(4)) : r.pick(HAIR.slice(0, 5)),
    hairStyle: old && r.chance(0.35) ? 5 : r.int(0, 8),
    beard: r.chance(kind === "player" ? 0.45 : 0.55) ? r.int(1, 4) : 0,
    eyes: r.pick(EYES),
    brow: r.range(1.6, 2.8),
    nose: r.int(0, 2),
    mouth: r.int(0, 2),
    ears: r.range(0.9, 1.15),
    glasses: kind !== "player" && r.chance(0.3),
    wrinkles: old,
    faceW: r.range(21, 24.5),
    jaw: r.range(0.85, 1.1),
  };
}

export function Face({ seed, kind = "player", kit, number, className, title }: { seed: number; kind?: FaceKind; kit?: Kit; number?: number; className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const L = lookFor(seed, kind);
  const fw = L.faceW;
  const cx = 50;
  const top = 26;
  const chin = 74 * L.jaw + 2;
  const k = kit ?? { primary: "#1d4ed8", secondary: "#ffffff", text: "#ffffff" };

  return (
    <svg viewBox="0 0 100 100" className={cn("block", className)} role="img" aria-label={title} style={{ direction: "ltr" }}>
      {title && <title>{title}</title>}
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor={kind === "agent" ? "#e8e4dc" : kind === "manager" ? "#dbe6ef" : shade(k.primary, 1.25)} />
          <stop offset="100%" stopColor={kind === "agent" ? "#9c958a" : kind === "manager" ? "#7d8fa3" : shade(k.primary, 0.55)} />
        </radialGradient>
        <radialGradient id={`sk${uid}`} cx="45%" cy="38%" r="65%">
          <stop offset="0%" stopColor={shade(L.skin, 1.08)} />
          <stop offset="70%" stopColor={L.skin} />
          <stop offset="100%" stopColor={L.skinShade} />
        </radialGradient>
        <linearGradient id={`hr${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(L.hair, 1.35)} />
          <stop offset="100%" stopColor={L.hair} />
        </linearGradient>
        <linearGradient id={`cl${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={kind === "agent" ? "#3a3f4b" : shade(k.primary, 1.1)} />
          <stop offset="100%" stopColor={kind === "agent" ? "#1d2027" : shade(k.primary, 0.7)} />
        </linearGradient>
        <clipPath id={`c${uid}`}>
          <rect width="100" height="100" rx="14" />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <rect width="100" height="100" fill={`url(#bg${uid})`} />

        {/* Shoulders and clothes */}
        <path d="M8 100 C10 84 24 78 38 75 L62 75 C76 78 90 84 92 100 Z" fill={`url(#cl${uid})`} />
        {kind === "player" && (
          <>
            <path d="M40 75 L50 84 L60 75" fill="none" stroke={k.secondary} strokeWidth="3" />
            <path d="M14 92 C16 86 20 83 26 81" stroke={k.secondary} strokeWidth="2.5" fill="none" opacity="0.9" />
            <path d="M86 92 C84 86 80 83 74 81" stroke={k.secondary} strokeWidth="2.5" fill="none" opacity="0.9" />
            {number !== undefined && (
              <text x="72" y="96" fontSize="9" fontWeight="800" textAnchor="middle" fill={k.text} fontFamily="system-ui, sans-serif">
                {number}
              </text>
            )}
          </>
        )}
        {kind === "agent" && (
          <>
            <path d="M40 75 L50 96 L60 75 Z" fill="#f4f4f5" />
            <path d="M48 80 L52 80 L53.5 98 L50 100 L46.5 98 Z" fill={["#7f1d1d", "#1e3a8a", "#3f3f46", "#14532d", "#78350f"][seed % 5]} />
            <path d="M40 75 L47 92 L36 82 Z M60 75 L53 92 L64 82 Z" fill="#2a2e37" />
          </>
        )}
        {kind === "manager" && (
          <>
            <path d="M42 75 L50 80 L58 75 L58 79 L50 85 L42 79 Z" fill={k.secondary} />
            <line x1="50" y1="85" x2="50" y2="100" stroke={shade(k.primary, 0.5)} strokeWidth="1.2" />
            <circle cx="66" cy="88" r="3.2" fill={k.secondary} opacity="0.9" />
          </>
        )}

        {/* Neck */}
        <path d={`M${cx - 8} ${chin - 8} L${cx - 8.5} 77 Q${cx} 81 ${cx + 8.5} 77 L${cx + 8} ${chin - 8} Z`} fill={L.skinShade} />

        {/* Hair behind the head (long / afro) */}
        {L.hairStyle === 4 && <ellipse cx={cx} cy={top + 14} rx={fw + 7} ry={22} fill={`url(#hr${uid})`} />}
        {L.hairStyle === 8 && <path d={`M${cx - fw - 2} ${top + 10} Q${cx - fw - 4} ${chin - 6} ${cx - fw + 4} ${chin - 4} L${cx + fw - 4} ${chin - 4} Q${cx + fw + 4} ${chin - 6} ${cx + fw + 2} ${top + 10} Z`} fill={`url(#hr${uid})`} />}

        {/* Ears */}
        <ellipse cx={cx - fw + 0.5} cy={50} rx={3.6 * L.ears} ry={5.6 * L.ears} fill={L.skinShade} />
        <ellipse cx={cx + fw - 0.5} cy={50} rx={3.6 * L.ears} ry={5.6 * L.ears} fill={L.skinShade} />

        {/* Head */}
        <path
          d={`M${cx} ${top} C${cx + fw + 1} ${top} ${cx + fw + 1} ${top + 18} ${cx + fw} ${50} C${cx + fw - 1} ${chin - 10} ${cx + 9} ${chin} ${cx} ${chin} C${cx - 9} ${chin} ${cx - fw + 1} ${chin - 10} ${cx - fw} ${50} C${cx - fw - 1} ${top + 18} ${cx - fw - 1} ${top} ${cx} ${top} Z`}
          fill={`url(#sk${uid})`}
        />
        {/* Cheek shading */}
        <path d={`M${cx - fw + 2} 52 Q${cx - fw + 6} ${chin - 6} ${cx} ${chin} Q${cx - 10} ${chin - 4} ${cx - fw + 2} 52 Z`} fill={L.skinShade} opacity="0.35" />
        <path d={`M${cx + fw - 2} 52 Q${cx + fw - 6} ${chin - 6} ${cx} ${chin} Q${cx + 10} ${chin - 4} ${cx + fw - 2} 52 Z`} fill={L.skinShade} opacity="0.35" />

        {/* Beard */}
        {L.beard === 1 && <path d={`M${cx - fw + 3} 54 Q${cx - fw + 6} ${chin - 2} ${cx} ${chin + 0.5} Q${cx + fw - 6} ${chin - 2} ${cx + fw - 3} 54 Q${cx + 10} 66 ${cx} 66 Q${cx - 10} 66 ${cx - fw + 3} 54 Z`} fill={L.hair} opacity="0.28" />}
        {L.beard === 2 && <path d={`M${cx - fw + 2} 52 Q${cx - fw + 5} ${chin + 1} ${cx} ${chin + 2} Q${cx + fw - 5} ${chin + 1} ${cx + fw - 2} 52 Q${cx + 9} 67 ${cx} 64.5 Q${cx - 9} 67 ${cx - fw + 2} 52 Z`} fill={L.hair} opacity="0.88" />}
        {L.beard === 3 && <path d={`M${cx - 6} 65 Q${cx} 63 ${cx + 6} 65 Q${cx + 5} ${chin + 1} ${cx} ${chin + 1.5} Q${cx - 5} ${chin + 1} ${cx - 6} 65 Z`} fill={L.hair} opacity="0.9" />}
        {(L.beard === 3 || L.beard === 4 || L.beard === 2) && <path d={`M${cx - 8} 62.5 Q${cx} 59 ${cx + 8} 62.5 Q${cx} 61.5 ${cx - 8} 62.5 Z`} fill={L.hair} stroke={L.hair} strokeWidth="1.6" strokeLinejoin="round" />}

        {/* Mouth */}
        {L.mouth === 0 && <path d={`M${cx - 5} 66 Q${cx} 68.5 ${cx + 5} 66`} stroke="#7a3b2e" strokeWidth="1.3" fill="none" strokeLinecap="round" />}
        {L.mouth === 1 && <path d={`M${cx - 6} 65.5 Q${cx} 70 ${cx + 6} 65.5 Q${cx} 67.5 ${cx - 6} 65.5 Z`} fill="#8a3f33" />}
        {L.mouth === 2 && <path d={`M${cx - 4.5} 66.5 L${cx + 4.5} 66.5`} stroke="#7a3b2e" strokeWidth="1.4" strokeLinecap="round" />}

        {/* Nose */}
        <path
          d={L.nose === 0 ? `M${cx - 1} 47 Q${cx - 3} 56 ${cx - 3.2} 58 Q${cx} 60.5 ${cx + 3.2} 58` : L.nose === 1 ? `M${cx} 47 L${cx - 2.5} 57.5 Q${cx} 59.5 ${cx + 3} 57.5` : `M${cx - 1.5} 47 Q${cx - 4.5} 57 ${cx - 4} 58.5 Q${cx} 61 ${cx + 4} 58.5`}
          stroke={shade(L.skin, 0.68)}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Eyes */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <ellipse cx={cx + s * 8.5} cy={47} rx={4} ry={2.3} fill="#fbfaf7" />
            <circle cx={cx + s * 8.5} cy={47} r={1.75} fill={L.eyes} />
            <circle cx={cx + s * 8.5} cy={47} r={0.8} fill="#0b0b0b" />
            <circle cx={cx + s * 8.5 + 0.6} cy={46.4} r={0.45} fill="#fff" />
            <path d={`M${cx + s * 4.3} 46.2 Q${cx + s * 8.5} 43.8 ${cx + s * 12.7} 46.4`} stroke={shade(L.skin, 0.55)} strokeWidth="0.8" fill="none" />
            {/* Brow */}
            <path d={`M${cx + s * 4} 41.5 Q${cx + s * 8.5} ${39 - L.brow / 3} ${cx + s * 13} 41.8`} stroke={L.hair === "#9ca3af" || L.hair === "#b6b9bf" ? "#6b7280" : L.hair} strokeWidth={L.brow} fill="none" strokeLinecap="round" />
            {L.wrinkles && <path d={`M${cx + s * 13.5} 47 l${s * 2} 1.5 M${cx + s * 13.5} 48.5 l${s * 2} 2`} stroke={shade(L.skin, 0.7)} strokeWidth="0.5" />}
          </g>
        ))}
        {L.wrinkles && <path d={`M${cx - 6} 35.5 Q${cx} 34.5 ${cx + 6} 35.5 M${cx - 5} 37.8 Q${cx} 37 ${cx + 5} 37.8`} stroke={shade(L.skin, 0.75)} strokeWidth="0.5" fill="none" />}

        {/* Glasses */}
        {L.glasses && (
          <g stroke="#1f2937" strokeWidth="1.1" fill="rgba(255,255,255,0.12)">
            <rect x={cx - 14} y={42.5} width={11} height={8.5} rx={2.5} />
            <rect x={cx + 3} y={42.5} width={11} height={8.5} rx={2.5} />
            <path d={`M${cx - 3} 45.5 Q${cx} 44 ${cx + 3} 45.5`} fill="none" />
          </g>
        )}

        {/* Hair on top */}
        <Hair style={L.hairStyle} cx={cx} top={top} fw={fw} fill={`url(#hr${uid})`} color={L.hair} />
      </g>
    </svg>
  );
}

function Hair({ style, cx, top, fw, fill, color }: { style: number; cx: number; top: number; fw: number; fill: string; color: string }) {
  const l = cx - fw - 1;
  const r = cx + fw + 1;
  switch (style) {
    case 0: // buzz cut
      return <path d={`M${l + 1} 42 C${l} ${top - 2} ${r} ${top - 2} ${r - 1} 42 C${r - 3} ${top + 6} ${l + 3} ${top + 6} ${l + 1} 42 Z`} fill={color} opacity="0.55" />;
    case 1: // short crop
      return <path d={`M${l} 44 C${l - 1} ${top - 6} ${r + 1} ${top - 6} ${r} 44 L${r - 2} 38 C${r - 6} ${top + 7} ${l + 6} ${top + 7} ${l + 2} 38 Z`} fill={fill} />;
    case 2: // side part
      return (
        <path
          d={`M${l} 46 C${l - 3} ${top - 8} ${r + 3} ${top - 8} ${r} 46 L${r - 1.5} 37 C${r - 8} ${top + 6} ${cx - 2} ${top + 10} ${cx - 6} ${top + 4} C${cx - 10} ${top + 9} ${l + 4} ${top + 10} ${l + 1.5} 39 Z`}
          fill={fill}
        />
      );
    case 3: // curly top
      return (
        <g fill={fill}>
          <path d={`M${l + 1} 42 C${l} ${top - 4} ${r} ${top - 4} ${r - 1} 42 C${r - 4} ${top + 6} ${l + 4} ${top + 6} ${l + 1} 42 Z`} />
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={l + 4 + i * ((r - l - 8) / 8)} cy={top + 1 - Math.sin((i / 8) * Math.PI) * 4} r={4.2} />
          ))}
        </g>
      );
    case 4: // afro (back part drawn earlier)
      return <path d={`M${l - 4} 44 C${l - 8} ${top - 16} ${r + 8} ${top - 16} ${r + 4} 44 C${r - 2} ${top + 4} ${l + 2} ${top + 4} ${l - 4} 44 Z`} fill={fill} />;
    case 5: // bald / receding
      return <path d={`M${l} 46 C${l - 0.5} 36 ${l + 2} 33 ${l + 3} 36 L${l + 2.5} 46 Z M${r} 46 C${r + 0.5} 36 ${r - 2} 33 ${r - 3} 36 L${r - 2.5} 46 Z`} fill={color} opacity="0.75" />;
    case 6: // slicked back
      return (
        <g>
          <path d={`M${l} 44 C${l - 2} ${top - 10} ${r + 2} ${top - 10} ${r} 44 L${r - 2} 36 C${r - 6} ${top + 3} ${l + 6} ${top + 3} ${l + 2} 36 Z`} fill={fill} />
          <path d={`M${cx - 10} ${top - 1} Q${cx} ${top - 5} ${cx + 10} ${top - 1}`} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none" />
        </g>
      );
    case 7: // messy fringe
      return <path d={`M${l} 46 C${l - 3} ${top - 9} ${r + 3} ${top - 9} ${r} 46 L${r - 2} 38 L${r - 6} 36 L${r - 9} 39 L${cx + 2} 35 L${cx - 3} 39 L${cx - 7} 35.5 L${l + 7} 39 L${l + 3} 36.5 L${l + 1.5} 40 Z`} fill={fill} />;
    default: // longer hair, parted in the middle
      return <path d={`M${l} 52 C${l - 4} ${top - 9} ${r + 4} ${top - 9} ${r} 52 L${r - 2} 40 C${r - 4} ${top + 8} ${cx + 3} ${top + 6} ${cx} ${top + 3} C${cx - 3} ${top + 6} ${l + 4} ${top + 8} ${l + 2} 40 Z`} fill={fill} />;
  }
}
