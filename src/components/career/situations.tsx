"use client";

import { ChevronRightIcon } from "lucide-react";
import { resolveAttr, type Situation, type SituationOption } from "@/lib/engine/situations";
import type { Kit } from "@/lib/engine/people";
import type { CareerSave } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CareerDict } from "./helpers";

const ICON: Record<string, string> = {
  welcomeNight: "🍻",
  teamDinner: "🍝",
  sponsorShoot: "📸",
  extraGym: "🏋️",
  tvInterview: "🎙️",
  videoSession: "📺",
  friendParty: "🎉",
  mentorKid: "🤝",
  socialMedia: "📱",
  gamingNight: "🎮",
  finishingDrills: "🎯",
  keeperDrills: "🧤",
  schoolExams: "📚",
  playThroughPain: "🩹",
};

/** Full-screen layer between matches. */
function Takeover({ children, tone = "dark", label }: { children: React.ReactNode; tone?: "dark" | "bad" | "good" | "gold"; label: string }) {
  const bg = {
    dark: "bg-[radial-gradient(circle_at_50%_30%,#1e293b_0%,#020617_75%)]",
    bad: "bg-[radial-gradient(circle_at_50%_30%,#4c0519_0%,#0c0a09_75%)]",
    good: "bg-[radial-gradient(circle_at_50%_30%,#064e3b_0%,#020617_75%)]",
    gold: "bg-[radial-gradient(circle_at_50%_30%,#422006_0%,#0c0a09_75%)]",
  }[tone];
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className={cn("fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 text-white", bg)}>
      <div className="animate-rise w-full max-w-lg">{children}</div>
    </div>
  );
}

/** An off-the-pitch decision. Both options show what they do before you pick. */
export function SituationTakeover({ save, situation, t, onChoose }: { save: CareerSave; situation: Situation; t: CareerDict; onChoose: (optionId: string) => void }) {
  const st = t.situations;
  const text = (st.items as Record<string, { text: string; options: Record<string, string> }>)[situation.id];
  const attrLabels = save.player.position === "GK" ? t.attrs.gk : t.attrs.outfield;
  const effects = (o: SituationOption) => {
    const out: { label: string; good: boolean }[] = [];
    for (const [k, v] of Object.entries(o.attrs ?? {})) out.push({ label: `${v > 0 ? "+" : ""}${v} ${attrLabels[resolveAttr(save, k as never)]}`, good: v > 0 });
    for (const [k, v] of Object.entries(o.bars ?? {})) out.push({ label: `${v > 0 ? "+" : ""}${v} ${t.bars[k as keyof typeof t.bars]}`, good: v > 0 });
    if (o.risk) out.push({ label: st.risk, good: false });
    return out;
  };
  return (
    <Takeover label={st.title}>
      <p className="mb-2 text-center text-xs font-bold tracking-[0.2em] text-white/60 uppercase">{st.title}</p>
      <div className="animate-pop mx-auto mb-4 grid size-24 place-items-center rounded-full bg-white/10 text-6xl shadow-[0_0_60px_rgba(255,255,255,0.15)]" aria-hidden>
        {ICON[situation.id] ?? "💬"}
      </div>
      <p className="mb-6 text-center font-heading text-2xl leading-snug font-bold sm:text-3xl">{text.text}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {situation.options.map((o, i) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChoose(o.id)}
            className="animate-rise group flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/5 p-4 text-start backdrop-blur transition hover:-translate-y-1 hover:border-white/50 hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none"
            style={{ animationDelay: `${150 + i * 120}ms` }}
          >
            <span className="flex items-center justify-between gap-2 text-lg font-bold">
              {text.options[o.id]}
              <ChevronRightIcon className="size-5 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100 rtl:rotate-180" aria-hidden />
            </span>
            <span className="flex flex-wrap gap-1">
              {effects(o).map((e) => (
                <span key={e.label} className={cn("rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums", e.good ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200")}>
                  {e.label}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </Takeover>
  );
}

/** News between matches: an injury, a comeback, a word from the manager. */
export function NewsTakeover({ icon, title, text, tone, face, t, onClose }: { icon?: string; title: string; text: string; tone: "bad" | "good" | "dark"; face?: React.ReactNode; t: CareerDict; onClose: () => void }) {
  return (
    <Takeover tone={tone} label={title}>
      <div className="text-center">
        {face ? (
          <div className="animate-pop mx-auto mb-4 size-24 overflow-hidden rounded-full ring-4 ring-white/20">{face}</div>
        ) : (
          <div className="animate-pop mx-auto mb-4 text-7xl" aria-hidden>
            {icon}
          </div>
        )}
        <p className="font-heading text-3xl font-black sm:text-4xl">{title}</p>
        <p className="mx-auto mt-3 max-w-md text-lg text-white/80">{text}</p>
        <Button size="lg" className="mt-8 h-12 bg-white px-8 text-base font-bold text-black hover:bg-white/90" onClick={onClose} autoFocus>
          {t.next}
        </Button>
      </div>
    </Takeover>
  );
}

export type FanMoment = "poster" | "song" | "banner" | "ovation" | "kidShirt" | "tifo";
export const FAN_MOMENTS: FanMoment[] = ["poster", "song", "banner", "ovation", "kidShirt", "tifo"];

/** The fans show you some love: a crowd scene with a poster / song / tifo for you. */
export function FanTakeover({ moment, name, number, kit, t, onClose }: { moment: FanMoment; name: string; number: number; kit: Kit; t: CareerDict; onClose: () => void }) {
  const f = t.fans;
  const surname = name.split(" ").at(-1)!.toUpperCase();
  return (
    <Takeover tone="gold" label={f.title}>
      <div className="text-center">
        <p className="mb-3 text-xs font-bold tracking-[0.2em] text-amber-200/70 uppercase">{f.title}</p>
        <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
          <svg viewBox="0 0 160 90" className="block size-full" aria-hidden>
            {/* stand */}
            {Array.from({ length: 9 }, (_, row) =>
              Array.from({ length: 34 }, (_, i) => {
                const x = i * 4.8 + (row % 2) * 2.4;
                const y = 12 + row * 8.5;
                const jump = moment === "ovation" || moment === "song" ? ((i + row) % 3) * 0.6 : 0;
                const c = (i * 5 + row * 3) % 4 === 0 ? kit.secondary : kit.primary;
                return (
                  <g key={`${row}-${i}`} className="motion-safe:animate-[crowd_0.5s_ease-in-out_infinite]" style={{ animationDelay: `${((i * 7 + row) % 10) / 20}s` }}>
                    <rect x={x - 1.4} y={y - jump} width={2.8} height={4} rx={1} fill={c} opacity={0.85} />
                    <circle cx={x} cy={y - 1.6 - jump} r={1.15} fill="#d6a77a" opacity={0.9} />
                    {(moment === "ovation" || moment === "song") && (i + row) % 2 === 0 && <line x1={x + 1.2} y1={y - jump} x2={x + 2} y2={y - 4 - jump} stroke="#d6a77a" strokeWidth={0.6} />}
                  </g>
                );
              }),
            )}
            {/* the moment itself */}
            {moment === "poster" && (
              <g className="animate-pop" style={{ transformOrigin: "80px 45px" }}>
                <rect x={52} y={22} width={56} height={40} rx={1.5} fill="#f8fafc" stroke={kit.primary} strokeWidth={2} />
                <circle cx={80} cy={36} r={8} fill={kit.primary} />
                <text x={80} y={39.5} textAnchor="middle" fontSize={10} fontWeight={900} fill={kit.text}>{number}</text>
                <text x={80} y={55} textAnchor="middle" fontSize={6.5} fontWeight={900} fill="#0f172a">{surname}</text>
                <line x1={58} y1={62} x2={58} y2={70} stroke="#78350f" strokeWidth={1} />
                <line x1={102} y1={62} x2={102} y2={70} stroke="#78350f" strokeWidth={1} />
              </g>
            )}
            {moment === "banner" && (
              <g className="animate-pop" style={{ transformOrigin: "80px 40px" }}>
                <path d="M8 30 Q80 24 152 30 L152 48 Q80 42 8 48 Z" fill={kit.primary} stroke={kit.secondary} strokeWidth={1.2} />
                <text x={80} y={41} textAnchor="middle" fontSize={8} fontWeight={900} fill={kit.text}>{`${surname} ${number} ♥`}</text>
              </g>
            )}
            {moment === "tifo" && (
              <g className="animate-pop" style={{ transformOrigin: "80px 45px" }}>
                <rect x={0} y={8} width={160} height={74} fill={kit.primary} opacity={0.92} />
                {Array.from({ length: 8 }, (_, i) => <rect key={i} x={i * 20} y={8} width={10} height={74} fill={kit.secondary} opacity={0.25} />)}
                <text x={80} y={52} textAnchor="middle" fontSize={26} fontWeight={900} fill={kit.text} stroke="rgba(0,0,0,0.3)" strokeWidth={0.6}>{number}</text>
                <text x={80} y={68} textAnchor="middle" fontSize={9} fontWeight={900} fill={kit.text}>{surname}</text>
              </g>
            )}
            {moment === "kidShirt" && (
              <g className="animate-pop" style={{ transformOrigin: "80px 60px" }}>
                <path d="M68 50 L74 46 Q80 49 86 46 L92 50 L89 56 L87 55 L87 74 L73 74 L73 55 L71 56 Z" fill={kit.primary} stroke="#0f172a" strokeWidth={0.4} />
                <text x={80} y={66} textAnchor="middle" fontSize={8} fontWeight={900} fill={kit.text}>{number}</text>
                <circle cx={80} cy={42} r={4} fill="#e0b08a" />
                <path d="M76 41 Q80 35 84 41" fill="#4a2c1b" />
              </g>
            )}
            {moment === "song" &&
              ["♪", "♫", "♪", "♬", "♫"].map((n, i) => (
                <text key={i} x={20 + i * 30} y={20 + (i % 2) * 8} fontSize={10} fill="#fde68a" className="motion-safe:animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
                  {n}
                </text>
              ))}
            {moment === "ovation" && <text x={80} y={10} textAnchor="middle" fontSize={7} fontWeight={900} fill="#fde68a">👏 👏 👏</text>}
          </svg>
        </div>
        <p className="mt-5 font-heading text-2xl font-black sm:text-3xl">{f.items[moment].title}</p>
        <p className="mx-auto mt-2 max-w-md text-white/80">{f.items[moment].text.replace("{name}", surname)}</p>
        <p className="mt-2 text-sm font-semibold text-amber-300">{f.bonus}</p>
        <Button size="lg" className="mt-6 h-12 bg-amber-400 px-8 text-base font-bold text-black hover:bg-amber-300" onClick={onClose} autoFocus>
          {t.next}
        </Button>
      </div>
    </Takeover>
  );
}
