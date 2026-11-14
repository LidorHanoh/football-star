"use client";

import { ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { hash, type Kit, personName } from "@/lib/engine/people";
import { optionBars, type Reactor, resolveAttr, type Situation, type SituationOption } from "@/lib/engine/situations";
import type { CareerSave, EuroComp, WorldClub } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Crest } from "./crest";
import type { CareerDict } from "./helpers";
import type { SquadPlayer } from "./use-squad";

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
  charityVisit: "🏥",
  yogaClass: "🧘",
  nutritionist: "🥗",
  lateNightFood: "🍔",
  derbyPress: "🎤",
  rivalTaunt: "💬",
  leadWarmup: "📣",
  newRole: "🧠",
  newBoots: "👟",
  familyVisit: "👨‍👩‍👦",
  iceBath: "🧊",
  overslept: "⏰",
  youthClinic: "⚽",
  podcast: "🎧",
  dressingRoomFight: "😤",
  sprintCoach: "⚡",
  birthday: "🎂",
  stormTraining: "⛈️",
  fanSelfies: "🤳",
  agentDinner: "🍷",
  language: "🗣️",
  penaltyPractice: "🥅",
  askToStart: "🙋",
  trickShot: "🪄",
  teamMeeting: "🗣️",
  refereeRow: "🟨",
};

type Tone = "dark" | "bad" | "good" | "gold" | "blue";

/** Full-screen layer between matches. Built for phones: content on top, actions within thumb reach. */
export function Takeover({ children, tone = "dark", label }: { children: React.ReactNode; tone?: Tone; label: string }) {
  const bg = {
    dark: "bg-[radial-gradient(circle_at_50%_25%,#1e293b_0%,#020617_75%)]",
    bad: "bg-[radial-gradient(circle_at_50%_25%,#4c0519_0%,#0c0a09_75%)]",
    good: "bg-[radial-gradient(circle_at_50%_25%,#064e3b_0%,#020617_75%)]",
    gold: "bg-[radial-gradient(circle_at_50%_25%,#422006_0%,#0c0a09_75%)]",
    blue: "bg-[radial-gradient(circle_at_50%_20%,#1e3a8a_0%,#020617_75%)]",
  }[tone];
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className={cn("fixed inset-0 z-50 overflow-y-auto overscroll-contain text-white transition-colors duration-700", bg)}>
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="animate-rise">{children}</div>
      </div>
    </div>
  );
}

const REACTOR_ICON: Record<Reactor, string> = { captain: "©️", teammate: "👕", coach: "📋", fitnessCoach: "💪", physio: "🩺", agent: "💼", journalist: "🎙️", friend: "🤝", dad: "👨", fan: "📣", youngster: "🌱" };

/** Who's who around you: real names from your squad, the club's coach, your agent… */
export interface Cast {
  squad: SquadPlayer[] | null;
  coach: string;
  agent?: string;
  israeli: boolean;
  clubId: string;
}

function personFor(who: Reactor, cast: Cast, save: CareerSave, situationId: string): string {
  const squad = (cast.squad ?? []).filter((p) => p.name !== save.player.name);
  const seed = hash(`${save.id}:${situationId}:${who}`);
  const byRating = [...squad].sort((a, b) => b.rating - a.rating);
  switch (who) {
    case "coach":
      return cast.coach;
    case "agent":
      return cast.agent ?? personName(seed, cast.israeli);
    case "dad":
      return "";
    case "captain":
      return (byRating.find((p) => (p.age ?? 0) >= 26) ?? byRating[0])?.name ?? personName(seed, cast.israeli);
    case "youngster":
      return [...squad].sort((a, b) => (a.age ?? 30) - (b.age ?? 30))[0]?.name ?? personName(seed, cast.israeli);
    case "teammate": {
      const pool = byRating.slice(1, 18);
      return pool.length ? pool[seed % pool.length].name : personName(seed, cast.israeli);
    }
    case "fitnessCoach":
    case "physio":
      return personName(hash(`${cast.clubId}:${who}`), cast.israeli);
    case "journalist":
      return personName(hash(`${save.id}:journalist`), cast.israeli);
    case "friend":
      return personName(hash(`${save.id}:friend`), save.player.nationality === "Israel");
    case "fan":
      return personName(seed, cast.israeli).split(" ")[0];
  }
}

/** The 50/50 wheel: green it works out, red it backfires. The result is decided already; the wheel lands on it. */
function GambleWheel({ won, t, onDone }: { won: boolean; t: CareerDict; onDone: () => void }) {
  const [target] = useState(() => 360 * 5 + (won ? 0 : 180) + 25 + ((hash(String(won)) % 130) as number));
  const [spun, setSpun] = useState(false);
  return (
    <div className="animate-pop mt-5 flex flex-col items-center gap-3">
      <p className="text-sm font-bold tracking-widest text-white/70 uppercase">{t.situations.gamble.spinning}</p>
      <div dir="ltr" className="relative size-48">
        <div className="absolute -top-2 left-1/2 z-10 size-0 -translate-x-1/2 border-x-[12px] border-t-[22px] border-x-transparent border-t-white drop-shadow" aria-hidden />
        <div
          className="size-full rounded-full border-4 border-white/80 shadow-[0_0_50px_rgba(255,255,255,0.2)] motion-reduce:transition-none"
          style={{ background: "conic-gradient(from 0deg, #16a34a 0 180deg, #dc2626 180deg 360deg)", transform: "rotate(0deg)", transition: "transform 2.4s cubic-bezier(0.15, 0.85, 0.25, 1)" }}
          ref={(el) => {
            if (el && !el.dataset.spun) {
              el.dataset.spun = "1";
              requestAnimationFrame(() => requestAnimationFrame(() => (el.style.transform = `rotate(${-target}deg)`)));
            }
          }}
          onTransitionEnd={() => {
            if (spun) return;
            setSpun(true);
            setTimeout(onDone, 350);
          }}
        >
          <span className="absolute top-1/2 right-[16%] -translate-y-1/2 text-3xl" aria-hidden>
            👍
          </span>
          <span className="absolute top-1/2 left-[16%] -translate-y-1/2 text-3xl" aria-hidden>
            👎
          </span>
        </div>
      </div>
      <button type="button" className="text-sm text-white/60 underline" onClick={onDone}>
        {t.highlights.skip}
      </button>
    </div>
  );
}

/**
 * An off-the-pitch decision. Pick one: the other card goes away. A 50/50 call
 * spins the wheel first. Then the person it matters to (by name) tells you what
 * they think, and the small effects pop in.
 */
export function SituationTakeover({ save, situation, t, cast, won, onChoose }: { save: CareerSave; situation: Situation; t: CareerDict; cast: Cast; won: boolean; onChoose: (optionId: string) => void }) {
  const st = t.situations;
  const text = (st.items as Record<string, { text: string; options: Record<string, string>; reactions: Record<string, string> }>)[situation.id];
  const [picked, setPicked] = useState<SituationOption | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [typing, setTyping] = useState(true);
  const attrLabels = save.player.position === "GK" ? t.attrs.gk : t.attrs.outfield;

  useEffect(() => {
    if (!picked || spinning) return;
    const timer = setTimeout(() => setTyping(false), 900);
    return () => clearTimeout(timer);
  }, [picked, spinning]);

  const effects = (o: SituationOption, result = won) => {
    const out: { label: string; good: boolean }[] = [];
    for (const [k, v] of Object.entries(o.attrs ?? {})) out.push({ label: `+${v} ${attrLabels[resolveAttr(save, k as never)]}`, good: v > 0 });
    for (const [k, v] of Object.entries(optionBars(o, result))) out.push({ label: `${v > 0 ? "+" : ""}${v} ${t.bars[k as keyof typeof t.bars]}`, good: v > 0 });
    if (o.risk) out.push({ label: st.risk, good: false });
    return out;
  };

  const good = picked ? (picked.gamble ? won : picked.good) : false;
  const reaction = picked ? (picked.gamble ? text.reactions[`${picked.id}${won ? "Win" : "Lose"}`] : text.reactions[picked.id]) : "";
  const name = picked ? personFor(picked.who, cast, save, situation.id) : "";

  return (
    <Takeover label={st.title} tone={picked && !spinning ? (good ? "good" : "bad") : "dark"}>
      <p className="mb-3 text-center text-xs font-bold tracking-[0.2em] text-white/60 uppercase">{st.title}</p>
      <div className={cn("mx-auto mb-4 grid place-items-center rounded-full bg-white/10 shadow-[0_0_60px_rgba(255,255,255,0.15)] transition-all duration-500", picked ? "size-16 text-4xl" : "animate-pop size-24 text-6xl")} aria-hidden>
        {ICON[situation.id] ?? "💬"}
      </div>
      <p className={cn("mb-5 text-center font-heading leading-snug font-bold transition-all", picked ? "text-lg text-white/70" : "text-2xl sm:text-3xl")}>{text.text}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {situation.options.map((o, i) => {
          const chosen = picked?.id === o.id;
          if (picked && !chosen) return null;
          return (
            <button
              key={o.id}
              type="button"
              disabled={!!picked}
              onClick={() => {
                setPicked(o);
                if (o.gamble) setSpinning(true);
              }}
              className={cn(
                "group flex min-h-20 flex-col gap-2 rounded-2xl border p-4 text-start backdrop-blur transition duration-300 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none",
                chosen ? "animate-pop border-white/70 bg-white/15 sm:col-span-2" : "animate-rise border-white/15 bg-white/5 hover:border-white/50 hover:bg-white/10 active:scale-[0.98]",
              )}
              style={chosen ? undefined : { animationDelay: `${150 + i * 120}ms` }}
            >
              <span className="flex items-center justify-between gap-2 text-lg font-bold">
                {chosen && <span aria-hidden>✓</span>}
                <span className="flex-1">{text.options[o.id]}</span>
                {!picked && <ChevronRightIcon className="size-5 opacity-50 transition group-hover:opacity-100 rtl:rotate-180" aria-hidden />}
              </span>
              {!picked && (
                <span className="flex flex-wrap gap-1">
                  {o.gamble ? (
                    <span className="rounded-md bg-amber-400/25 px-2 py-0.5 text-xs font-bold text-amber-100">🎲 {st.gamble.chip}</span>
                  ) : (
                    effects(o).map((e) => (
                      <span key={e.label} className={cn("rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums", e.good ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200")}>
                        {e.label}
                      </span>
                    ))
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {picked && spinning && <GambleWheel won={won} t={t} onDone={() => setSpinning(false)} />}

      {/* The reaction */}
      {picked && !spinning && (
        <div className="animate-rise mt-5" style={{ animationDelay: "250ms" }}>
          {picked.gamble && <p className={cn("animate-pop mb-4 text-center font-heading text-3xl font-black", won ? "text-emerald-300" : "text-rose-300")}>{won ? st.gamble.won : st.gamble.lost}</p>}
          <div className="flex items-end gap-3">
            <div className={cn("animate-pop grid size-14 shrink-0 place-items-center rounded-full text-3xl ring-4", good ? "bg-emerald-500/25 ring-emerald-400/60" : "bg-rose-500/25 ring-rose-400/60")} style={{ animationDelay: "300ms" }} aria-hidden>
              {REACTOR_ICON[picked.who]}
            </div>
            <div className="relative min-w-0 flex-1 rounded-2xl rounded-es-sm bg-white p-3.5 text-slate-900 shadow-xl">
              <p className="mb-0.5 leading-tight">
                <span className="font-bold">{name || st.reactors[picked.who]}</span>
                {name && <span className="text-xs font-semibold text-slate-500"> · {st.reactors[picked.who]}</span>}
              </p>
              {typing ? (
                <p className="flex h-6 items-center gap-1" aria-label="…">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="size-2 rounded-full bg-slate-400 motion-safe:animate-[dots_1s_ease-in-out_infinite]" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </p>
              ) : (
                <p className="animate-rise font-semibold">{reaction}</p>
              )}
            </div>
          </div>
          {!typing && (
            <>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {effects(picked).map((e, i) => (
                  <span key={e.label} className={cn("animate-pop rounded-full px-3 py-1 text-sm font-bold tabular-nums", e.good ? "bg-emerald-400/25 text-emerald-100" : "bg-rose-400/25 text-rose-100")} style={{ animationDelay: `${i * 90}ms` }}>
                    {e.label}
                  </span>
                ))}
              </div>
              <Button size="lg" className="animate-rise mt-5 h-14 w-full bg-white text-base font-bold text-black hover:bg-white/90" onClick={() => onChoose(picked.id)} autoFocus>
                {t.next}
              </Button>
            </>
          )}
        </div>
      )}
    </Takeover>
  );
}

/** News between matches: an injury, a comeback, a word from the manager, a cup run. */
export function NewsTakeover({ icon, title, text, tone, face, t, onClose, children }: { icon?: string; title: string; text: string; tone: Tone; face?: React.ReactNode; t: CareerDict; onClose: () => void; children?: React.ReactNode }) {
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
        {children}
        <Button size="lg" className="mt-8 h-14 w-full bg-white text-base font-bold text-black hover:bg-white/90 sm:w-auto sm:px-10" onClick={onClose} autoFocus>
          {t.next}
        </Button>
      </div>
    </Takeover>
  );
}

export type FanMoment = "poster" | "song" | "banner" | "ovation" | "kidShirt" | "tifo";
export const FAN_MOMENTS: FanMoment[] = ["poster", "song", "banner", "ovation", "kidShirt", "tifo"];

// Deterministic "random" so render stays pure.
const rnd = (i: number, k: number) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1;

/**
 * The fans go wild for you (only after a huge game): a stand full of club
 * signs, flares and smoke, and the moment itself — a poster, a song, a tifo…
 */
export function FanTakeover({ moment, name, number, kit, club, t, onClose }: { moment: FanMoment; name: string; number: number; kit: Kit; club: string; t: CareerDict; onClose: () => void }) {
  const f = t.fans;
  const surname = name.split(" ").at(-1)!.toUpperCase();
  const clubSign = club.length > 14 ? [...club.split(" ")].sort((a, b) => b.length - a.length)[0] : club;
  return (
    <Takeover tone="gold" label={f.title}>
      <div className="text-center">
        <p className="mb-3 text-xs font-bold tracking-[0.2em] text-amber-200/70 uppercase">{f.title}</p>
        <div className="relative -mx-4 aspect-[4/3] overflow-hidden border-y border-white/10 bg-[#0b1220] shadow-2xl sm:mx-0 sm:aspect-[16/10] sm:rounded-2xl sm:border">
          <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="block size-full" aria-hidden>
            <defs>
              <radialGradient id="flareGlow">
                <stop offset="0" stopColor="#fff7ed" />
                <stop offset="0.25" stopColor="#fb923c" />
                <stop offset="0.6" stopColor="#dc2626" stopOpacity="0.55" />
                <stop offset="1" stopColor="#dc2626" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* night sky + floodlight haze */}
            <rect width="160" height="120" fill="#0b1220" />
            <ellipse cx="80" cy="0" rx="120" ry="30" fill="#fde68a" opacity="0.08" />
            {/* the stand: rows of fans in club colours */}
            {Array.from({ length: 12 }, (_, row) =>
              Array.from({ length: 34 }, (_, i) => {
                const x = i * 4.8 + (row % 2) * 2.4;
                const y = 18 + row * 8.4;
                const jump = ((i + row) % 3) * 0.6;
                const c = (i * 5 + row * 3) % 4 === 0 ? kit.secondary : kit.primary;
                return (
                  <g key={`${row}-${i}`} className="motion-safe:animate-[crowd_0.45s_ease-in-out_infinite]" style={{ animationDelay: `${((i * 7 + row) % 10) / 20}s` }}>
                    <rect x={x - 1.4} y={y - jump} width={2.8} height={4} rx={1} fill={c} opacity={0.9} />
                    <circle cx={x} cy={y - 1.6 - jump} r={1.15} fill={["#d6a77a", "#a87452", "#f0c8a0", "#7b4a2e"][(i + row) % 4]} opacity={0.95} />
                    {(i + row) % 2 === 0 && <line x1={x + 1.2} y1={y - jump} x2={x + 2} y2={y - 4 - jump} stroke="#d6a77a" strokeWidth={0.6} />}
                  </g>
                );
              }),
            )}
            {/* signs with the club's name held up all over the stand */}
            {[
              [14, 30],
              [118, 26],
              [30, 92],
              [128, 96],
              [72, 104],
            ].map(([x, y], i) => (
              <g key={i} className="motion-safe:animate-[sway_1.6s_ease-in-out_infinite]" style={{ transformOrigin: `${x + 13}px ${y + 10}px`, animationDelay: `${i * 0.3}s` }}>
                <line x1={x + 6} y1={y + 7} x2={x + 6} y2={y + 13} stroke="#78350f" strokeWidth={0.8} />
                <line x1={x + 20} y1={y + 7} x2={x + 20} y2={y + 13} stroke="#78350f" strokeWidth={0.8} />
                <rect x={x} y={y} width={26} height={8} rx={0.8} fill={i % 2 ? kit.primary : "#f8fafc"} stroke={kit.secondary} strokeWidth={0.6} />
                <text x={x + 13} y={y + 5.6} textAnchor="middle" fontSize={clubSign.length > 9 ? 3.2 : 4} fontWeight={900} fill={i % 2 ? kit.text : "#0f172a"}>
                  {clubSign.toUpperCase()}
                </text>
              </g>
            ))}
            {/* the moment itself */}
            {moment === "poster" && (
              <g className="animate-pop" style={{ transformOrigin: "80px 55px" }}>
                <rect x={52} y={30} width={56} height={42} rx={1.5} fill="#f8fafc" stroke={kit.primary} strokeWidth={2} />
                <circle cx={80} cy={45} r={8} fill={kit.primary} />
                <text x={80} y={48.5} textAnchor="middle" fontSize={10} fontWeight={900} fill={kit.text}>
                  {number}
                </text>
                <text x={80} y={64} textAnchor="middle" fontSize={6.5} fontWeight={900} fill="#0f172a">
                  {surname}
                </text>
              </g>
            )}
            {moment === "banner" && (
              <g className="animate-pop" style={{ transformOrigin: "80px 50px" }}>
                <path d="M6 40 Q80 34 154 40 L154 60 Q80 54 6 60 Z" fill={kit.primary} stroke={kit.secondary} strokeWidth={1.2} />
                <text x={80} y={52} textAnchor="middle" fontSize={8} fontWeight={900} fill={kit.text}>{`${surname} ${number} ♥`}</text>
              </g>
            )}
            {moment === "tifo" && (
              <g className="animate-pop" style={{ transformOrigin: "80px 60px" }}>
                <rect x={0} y={14} width={160} height={92} fill={kit.primary} opacity={0.93} />
                {Array.from({ length: 8 }, (_, i) => (
                  <rect key={i} x={i * 20} y={14} width={10} height={92} fill={kit.secondary} opacity={0.25} />
                ))}
                <text x={80} y={66} textAnchor="middle" fontSize={30} fontWeight={900} fill={kit.text} stroke="rgba(0,0,0,0.3)" strokeWidth={0.6}>
                  {number}
                </text>
                <text x={80} y={84} textAnchor="middle" fontSize={10} fontWeight={900} fill={kit.text}>
                  {surname}
                </text>
              </g>
            )}
            {moment === "kidShirt" && (
              <g className="animate-pop" style={{ transformOrigin: "80px 70px" }}>
                <path d="M68 60 L74 56 Q80 59 86 56 L92 60 L89 66 L87 65 L87 84 L73 84 L73 65 L71 66 Z" fill={kit.primary} stroke="#0f172a" strokeWidth={0.4} />
                <text x={80} y={76} textAnchor="middle" fontSize={8} fontWeight={900} fill={kit.text}>
                  {number}
                </text>
                <circle cx={80} cy={52} r={4} fill="#e0b08a" />
                <path d="M76 51 Q80 45 84 51" fill="#4a2c1b" />
              </g>
            )}
            {moment === "song" &&
              ["♪", "♫", "♪", "♬", "♫"].map((n, i) => (
                <text key={i} x={20 + i * 30} y={22 + (i % 2) * 8} fontSize={10} fill="#fde68a" className="motion-safe:animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
                  {n}
                </text>
              ))}
            {/* pyro: flares with glow and drifting smoke */}
            {[10, 46, 112, 150].map((x, i) => (
              <g key={i}>
                {[0, 1, 2].map((k) => (
                  <circle key={k} cx={x + (rnd(i, k) - 0.5) * 6} cy={50 + i * 9} r={5} fill="#94a3b8" opacity={0.4} className="motion-safe:animate-[smoke_2.4s_ease-out_infinite]" style={{ animationDelay: `${k * 0.8 + i * 0.2}s`, transformBox: "fill-box", transformOrigin: "center" }} />
                ))}
                <circle cx={x} cy={56 + i * 9} r={9} fill="url(#flareGlow)" className="motion-safe:animate-[flare_0.35s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.1}s`, transformBox: "fill-box", transformOrigin: "center" }} />
                <circle cx={x} cy={56 + i * 9} r={1.4} fill="#fff" />
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-5 font-heading text-2xl font-black sm:text-3xl">{f.items[moment].title}</p>
        <p className="mx-auto mt-2 max-w-md text-white/80">{f.items[moment].text.replace("{name}", surname)}</p>
        <p className="mt-2 text-sm font-semibold text-amber-300">{f.bonus}</p>
        <Button size="lg" className="mt-6 h-14 w-full bg-amber-400 text-base font-bold text-black hover:bg-amber-300 sm:w-auto sm:px-10" onClick={onClose} autoFocus>
          {t.next}
        </Button>
      </div>
    </Takeover>
  );
}

/** The European draw: balls spin out of the pots one by one, each one a club you'll face. */
export function DrawTakeover({ comp, clubs, names, t, onClose }: { comp: EuroComp; clubs: WorldClub[]; names: string[]; t: CareerDict; onClose: () => void }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= clubs.length) return;
    const timer = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 900 : 750);
    return () => clearTimeout(timer);
  }, [shown, clubs.length]);
  const title = t.comps[comp];
  return (
    <Takeover tone={comp === "cl" ? "blue" : "gold"} label={title}>
      <div className="text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-white/60 uppercase">{t.draw.title}</p>
        <p className="mt-1 font-heading text-3xl font-black sm:text-4xl">{title}</p>
        <div className="mt-3 flex justify-center gap-1 text-3xl" aria-hidden>
          {comp === "cl" ? "⭐⭐⭐" : "🟠🟠🟠"}
        </div>
        <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {clubs.map((c, i) => (
            <li key={c.id} className="flex flex-col items-center gap-2">
              <span className={cn("grid size-20 place-items-center rounded-full border-2 shadow-xl", i < shown ? "animate-spin-in border-white/60 bg-white" : "border-dashed border-white/20 bg-white/5")}>
                {i < shown ? <Crest club={c} className="size-12" /> : <span className="text-xl text-white/30">?</span>}
              </span>
              <span className={cn("min-h-[2.5em] text-sm leading-tight font-semibold", i < shown ? "animate-rise" : "opacity-0")}>
                {names[i]}
                <span className="block text-xs font-normal text-white/50">{t.draw.pot.replace("{n}", String(i < 2 ? 1 : i < 4 ? 2 : i < 5 ? 3 : 4))}</span>
              </span>
            </li>
          ))}
        </ol>
        <Button size="lg" disabled={shown < clubs.length} className="mt-6 h-14 w-full bg-white text-base font-bold text-black hover:bg-white/90 sm:w-auto sm:px-10" onClick={onClose}>
          {shown < clubs.length ? t.draw.drawing : t.next}
        </Button>
      </div>
    </Takeover>
  );
}

export interface Toast {
  id: string;
  icon: string;
  text: string;
  tone?: "gold" | "green" | "red" | "blue";
}

/** Small achievement chips under the progress bar: they never cover the match. */
export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div aria-live="polite" className={cn("pointer-events-none flex flex-wrap justify-center gap-1.5 transition-[margin] duration-300", items.length ? "mt-2" : "mt-0")}>
      {items.map((x) => (
        <span
          key={x.id}
          className={cn(
            "animate-chip inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 ps-1 pe-2.5 text-xs font-bold shadow-sm",
            x.tone === "green" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : x.tone === "red" ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300" : x.tone === "blue" ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300" : "border-amber-500/50 bg-amber-400/20 text-amber-800 dark:text-amber-200",
          )}
        >
          <span className="grid size-5 place-items-center rounded-full bg-background/70 text-sm leading-none" aria-hidden>
            {x.icon}
          </span>
          <span className="truncate">{x.text}</span>
        </span>
      ))}
    </div>
  );
}
