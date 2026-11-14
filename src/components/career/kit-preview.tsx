"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface KitStyle {
  primary: string;
  secondary: string;
  text: string;
  pattern: "plain" | "stripes" | "sash" | "halves";
}

/** A few looks to try on (cosmetic — your real kit is your club's). */
export const KIT_STYLES: KitStyle[] = [
  { primary: "#dc2626", secondary: "#ffffff", text: "#ffffff", pattern: "plain" },
  { primary: "#1d4ed8", secondary: "#facc15", text: "#ffffff", pattern: "stripes" },
  { primary: "#0f172a", secondary: "#22c55e", text: "#ffffff", pattern: "sash" },
  { primary: "#f8fafc", secondary: "#7c3aed", text: "#7c3aed", pattern: "halves" },
  { primary: "#15803d", secondary: "#ffffff", text: "#ffffff", pattern: "stripes" },
  { primary: "#f59e0b", secondary: "#0f172a", text: "#0f172a", pattern: "plain" },
];

const SHIRT =
  "M70 18 Q100 32 130 18 L168 34 Q180 40 186 52 L198 92 L166 104 L156 80 L158 228 Q100 238 42 228 L44 80 L34 104 L2 92 L14 52 Q20 40 32 34 Z";

/** Back of a shirt with your name and number printed on it. */
export function KitPreview({ name, number, kit, className }: { name: string; number: number; kit: KitStyle; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const label = (name.trim() || "—").toUpperCase();
  // Shrink long names so they always fit across the shoulders.
  const nameSize = Math.max(11, Math.min(22, 210 / Math.max(label.length, 1)));
  const outline = kit.text === "#ffffff" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.35)";

  return (
    <svg viewBox="-6 0 212 250" className={cn("block", className)} role="img" aria-label={`${label} ${number}`}>
      <defs>
        <clipPath id={`c${uid}`}>
          <path d={SHIRT} />
        </clipPath>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.22" stopColor="#000" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <pattern id={`m${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.55" fill="#000" opacity="0.09" />
        </pattern>
      </defs>

      {/* shadow */}
      <ellipse cx="100" cy="240" rx="70" ry="6" fill="#000" opacity="0.18" />

      <g clipPath={`url(#c${uid})`}>
        <rect x="-10" y="0" width="220" height="250" fill={kit.primary} />
        {kit.pattern === "stripes" && [52, 84, 116, 148].map((x) => <rect key={x} x={x} y="0" width="16" height="250" fill={kit.secondary} opacity="0.9" />)}
        {kit.pattern === "sash" && <path d="M10 30 L60 0 L210 200 L170 250 Z" fill={kit.secondary} opacity="0.9" />}
        {kit.pattern === "halves" && <rect x="100" y="0" width="110" height="250" fill={kit.secondary} opacity="0.18" />}
        {/* sleeve cuffs */}
        <path d="M2 92 L34 104 L37 96 L5 84 Z M198 92 L166 104 L163 96 L195 84 Z" fill={kit.secondary} />
        {/* side panels */}
        <rect x="40" y="90" width="7" height="150" fill={kit.secondary} opacity="0.55" />
        <rect x="153" y="90" width="7" height="150" fill={kit.secondary} opacity="0.55" />
        <rect x="-10" y="0" width="220" height="250" fill={`url(#m${uid})`} />
        <rect x="-10" y="0" width="220" height="250" fill={`url(#s${uid})`} />
        {/* folds */}
        <path d="M70 120 Q76 170 66 226 M134 130 Q128 176 138 226" stroke="#000" strokeOpacity="0.08" strokeWidth="5" fill="none" />
      </g>
      {/* collar */}
      <path d="M70 18 Q100 32 130 18 Q126 30 100 34 Q74 30 70 18 Z" fill={kit.secondary} />
      <path d={SHIRT} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1.5" strokeLinejoin="round" />

      {/* name across the shoulders */}
      <text x="100" y="74" textAnchor="middle" fontFamily="system-ui, 'Segoe UI', Arial, sans-serif" fontWeight="900" fontSize={nameSize} letterSpacing="1.5" fill={kit.text} stroke={outline} strokeWidth="1.6" paintOrder="stroke">
        {label}
      </text>
      {/* number */}
      <text
        key={number}
        x="100"
        y="178"
        textAnchor="middle"
        fontFamily="Impact, 'Arial Black', system-ui, sans-serif"
        fontWeight="900"
        fontSize="92"
        fill={kit.text}
        stroke={outline}
        strokeWidth="2"
        paintOrder="stroke"
        className="animate-pop"
        style={{ transformOrigin: "100px 145px", transformBox: "view-box" }}
      >
        {number}
      </text>
    </svg>
  );
}
