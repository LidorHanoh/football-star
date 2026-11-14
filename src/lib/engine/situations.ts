import { keyAttrs, overall } from "./attrs";
import { hash } from "./people";
import { clamp, Rng } from "./rng";
import type { Attrs, Bars, CareerSave } from "./types";

/**
 * In-season situations: 2–3 off-the-pitch decisions a season, between matches.
 * Every option nudges your bars (and some your attributes or injury risk) a
 * little, and someone tells you what they think of your choice.
 */
export type AttrKey = keyof Attrs | "key1" | "key2";

/** Who reacts to your choice. */
export type Reactor = "captain" | "teammate" | "coach" | "fitnessCoach" | "physio" | "agent" | "journalist" | "friend" | "dad" | "fan" | "youngster";

export interface SituationOption {
  id: string;
  bars?: Partial<Bars>;
  attrs?: Partial<Record<AttrKey, number>>;
  /** Extra injury chance per match for the coming half. */
  risk?: number;
  /** Who tells you what they think of it, and whether they liked it. */
  who: Reactor;
  good: boolean;
  /** A 50/50 call: a roulette decides whether it works out (win) or backfires (lose). */
  gamble?: { win: Partial<Bars>; lose: Partial<Bars> };
}

/** Extra facts a situation may need. */
export interface SituationContext {
  /** Country of your club's league. */
  clubCountry?: string;
}

export interface Situation {
  id: string;
  options: [SituationOption, SituationOption];
  /** Only offered when this holds. */
  when?: (s: CareerSave, ctx: SituationContext) => boolean;
}

const isGk = (s: CareerSave) => s.player.position === "GK";
/** A 50/50 option: the reaction and the effects depend on how the roulette lands. */
const g = (id: string, who: Reactor, win: Partial<Bars>, lose: Partial<Bars>): SituationOption => ({ id, who, good: true, gamble: { win, lose } });
const o = (id: string, who: Reactor, good: boolean, bars: Partial<Bars> = {}, attrs?: SituationOption["attrs"], risk?: number): SituationOption => ({ id, who, good, bars, ...(attrs ? { attrs } : {}), ...(risk ? { risk } : {}) });

// Small nudges: a choice tilts things a little, it never makes or breaks a season.
export const SITUATIONS: Situation[] = [
  { id: "welcomeNight", when: (s) => newAtClub(s) && (s.season?.halvesPlayed ?? 0) === 0, options: [o("go", "captain", true, { chemistry: 6, form: -3 }), o("skip", "teammate", false, { form: 2, chemistry: -4 })] },
  { id: "teamDinner", options: [o("go", "captain", true, { chemistry: 4, fitness: -2 }), o("rest", "teammate", false, { fitness: 3, chemistry: -2 })] },
  { id: "sponsorShoot", options: [o("shoot", "agent", true, { fans: 5, training: -3 }), o("train", "coach", true, { training: 3 }, { key1: 0.3 })] },
  { id: "extraGym", options: [o("yes", "fitnessCoach", true, { fitness: -3 }, { physical: 0.5 }, 0.01), o("no", "fitnessCoach", false, { fitness: 2 })] },
  { id: "tvInterview", options: [o("accept", "journalist", true, { fans: 4, trust: -2 }), o("decline", "coach", true, { trust: 2 })] },
  { id: "videoSession", options: [o("go", "coach", true, { trust: 3 }, { key2: 0.3 }), o("skip", "coach", false, { trust: -3, fitness: 1 })] },
  { id: "friendParty", options: [o("go", "friend", true, { fans: 1, form: -4, fitness: -2 }), o("stay", "coach", true, { form: 2 })] },
  { id: "mentorKid", when: (s) => s.player.age >= 24, options: [o("help", "youngster", true, { chemistry: 4, trust: 2 }), o("no", "youngster", false, { fitness: 1, chemistry: -2 })] },
  { id: "socialMedia", options: [o("post", "agent", true, { fans: 4, form: -2 }), o("focus", "coach", true, { form: 2, fans: -1 })] },
  { id: "gamingNight", options: [o("join", "teammate", true, { chemistry: 3, fitness: -2 }), o("sleep", "teammate", false, { fitness: 3, chemistry: -1 })] },
  { id: "finishingDrills", when: (s) => !isGk(s), options: [o("stay", "coach", true, { fitness: -2 }, { shooting: 0.5 }), o("rest", "coach", false, { fitness: 2 })] },
  { id: "keeperDrills", when: isGk, options: [o("stay", "coach", true, { fitness: -2 }, { pace: 0.3, dribbling: 0.3 }), o("rest", "coach", false, { fitness: 2 })] },
  { id: "schoolExams", when: (s) => s.player.age <= 17, options: [o("study", "dad", true, { training: -3, trust: -1 }), o("camp", "dad", false, { training: 4 }, { key1: 0.3 })] },
  { id: "playThroughPain", when: (s) => s.bars.fitness < 80, options: [o("play", "coach", true, { trust: 3, fitness: -3 }, undefined, 0.03), o("rest", "physio", true, { fitness: 5, trust: -2 })] },
  { id: "charityVisit", options: [o("go", "fan", true, { fans: 4, fitness: -1 }), o("skip", "fan", false, { training: 2, fans: -1 })] },
  { id: "yogaClass", options: [o("try", "physio", true, { fitness: 3, training: -1 }), o("skip", "physio", false, { training: 1 })] },
  { id: "nutritionist", options: [o("follow", "fitnessCoach", true, { fitness: 3, form: 1 }), o("ignore", "fitnessCoach", false, { form: -1, fans: 1 })] },
  { id: "lateNightFood", options: [o("join", "teammate", true, { chemistry: 3, fitness: -2 }), o("home", "teammate", false, { fitness: 2 })] },
  { id: "derbyPress", options: [o("bold", "journalist", true, { fans: 4, trust: -2 }), o("humble", "coach", true, { trust: 2 })] },
  { id: "rivalTaunt", options: [g("reply", "fan", { fans: 5, form: 2 }, { trust: -4, fans: -2 }), o("ignore", "coach", true, { trust: 2 })] },
  { id: "leadWarmup", options: [o("lead", "captain", true, { chemistry: 3, trust: 2 }), o("decline", "captain", false, { chemistry: -1 })] },
  { id: "newRole", options: [o("learn", "coach", true, { trust: 3, form: -1 }, { key2: 0.3 }), o("stick", "coach", false, { form: 2, trust: -2 })] },
  { id: "newBoots", options: [o("wear", "agent", true, { fans: 3, form: -2 }), o("old", "teammate", true, { form: 2 })] },
  { id: "familyVisit", options: [o("family", "dad", true, { form: 2, fitness: 2, training: -2 }), o("train", "dad", false, { training: 3 })] },
  { id: "iceBath", options: [o("bath", "physio", true, { fitness: 4 }), o("home", "physio", false, { fitness: -1, form: 1 })] },
  { id: "overslept", options: [o("sorry", "coach", true, { trust: -1 }), o("excuse", "coach", false, { trust: -4 })] },
  { id: "youthClinic", options: [o("go", "youngster", true, { fans: 3, chemistry: 1 }), o("skip", "youngster", false, { training: 2 })] },
  { id: "podcast", options: [o("accept", "journalist", true, { fans: 4, training: -2 }), o("decline", "agent", false, { training: 2 })] },
  { id: "dressingRoomFight", options: [g("calm", "captain", { chemistry: 6, trust: 2 }, { chemistry: -4, fitness: -2 }), o("stayOut", "teammate", false, { chemistry: -1 })] },
  { id: "askToStart", options: [g("ask", "coach", { trust: 4, form: 2 }, { trust: -5 }), o("wait", "coach", true, { trust: 1 })] },
  { id: "trickShot", when: (s) => !isGk(s), options: [g("try", "teammate", { fans: 3, chemistry: 3 }, { fitness: -4, chemistry: -1 }), o("simple", "teammate", false, { training: 1 })] },
  { id: "teamMeeting", options: [g("speak", "captain", { chemistry: 5, trust: 2 }, { chemistry: -3, trust: -2 }), o("quiet", "captain", false, { chemistry: -1 })] },
  { id: "refereeRow", options: [g("argue", "coach", { fans: 4, form: 1 }, { trust: -4, form: -2 }), o("walkAway", "coach", true, { trust: 2 })] },
  { id: "sprintCoach", when: (s) => !isGk(s), options: [o("hire", "fitnessCoach", true, { fitness: -2 }, { pace: 0.5 }), o("no", "agent", false, { fitness: 1 })] },
  { id: "birthday", options: [o("go", "teammate", true, { chemistry: 4, form: -2 }), o("gift", "teammate", false, { chemistry: 1 })] },
  { id: "stormTraining", options: [o("go", "coach", true, { training: 3, fitness: -2 }, undefined, 0.01), o("gym", "coach", false, { fitness: 1 })] },
  { id: "fanSelfies", options: [o("stay", "fan", true, { fans: 4, fitness: -1 }), o("leave", "fan", false, { fitness: 1, fans: -2 })] },
  { id: "agentDinner", when: (s) => !!s.agent, options: [o("go", "agent", true, { trust: -3, fans: 1 }), o("decline", "agent", false, { trust: 2 })] },
  { id: "language", when: (s, ctx) => !!ctx.clubCountry && ctx.clubCountry !== s.player.nationality, options: [o("learn", "teammate", true, { chemistry: 4, training: -2 }), o("skip", "teammate", false, { chemistry: -2 })] },
  { id: "penaltyPractice", when: (s) => !isGk(s), options: [o("practice", "coach", true, { fitness: -1 }, { shooting: 0.4 }), o("skip", "coach", false, { fitness: 1 })] },
];

const byId = new Map(SITUATIONS.map((s) => [s.id, s]));
export const situationById = (id: string) => byId.get(id);

/** You joined this club this season (and it isn't your first club). */
export function newAtClub(s: CareerSave) {
  const last = s.history.at(-1);
  return !!last && !!s.contract && last.clubId !== s.contract.clubId;
}

/**
 * The situations of a half season and when they come up (as a fraction of the
 * half). 2–3 per season: 1–2 in the first half, 1 in the second. Recent ones
 * don't come back too soon. Deterministic, so a reload brings the same ones.
 * `save` is the state BEFORE the half is played.
 */
export function halfSituations(save: CareerSave, half: 1 | 2, ctx: SituationContext = {}): { situation: Situation; at: number }[] {
  if (!save.season) return [];
  const rng = new Rng(hash(`${save.id}:${save.season.year}:${half}`));
  const recent = new Set(save.seenSituations ?? []);
  const fits = SITUATIONS.filter((s) => !s.when || s.when(save, ctx));
  const fresh = fits.filter((s) => !recent.has(s.id));
  const pool = fresh.length >= 3 ? fresh : fits;
  const forced = half === 1 ? pool.filter((s) => s.id === "welcomeNight") : [];
  const rest = rng.shuffle(pool.filter((s) => s.id !== "welcomeNight"));
  const count = half === 1 ? (forced.length || rng.chance(0.5) ? 2 : 1) : 1;
  const picked = [...forced, ...rest].slice(0, count);
  // Most seasons bring at least one 50/50 call.
  const isGamble = (x: Situation) => x.options.some((op) => op.gamble);
  const gambles = rest.filter((x) => isGamble(x) && !picked.includes(x));
  if (half === 2 && !picked.some(isGamble) && gambles.length && rng.chance(0.6)) picked[picked.length - 1] = gambles[0];
  // Spread them out: the welcome night comes right away, the rest during the half.
  return picked.map((situation, i) => ({ situation, at: situation.id === "welcomeNight" ? 0 : count === 1 ? rng.range(0.3, 0.7) : i === 0 ? rng.range(0.15, 0.4) : rng.range(0.55, 0.85) }));
}

const key = (half: number, id: string) => `${half}:${id}`;
export const choiceOf = (save: CareerSave, half: number, id: string) => save.season?.choices?.[key(half, id)];

/** Resolve "key1"/"key2" to the position's most important attributes. */
export function resolveAttr(save: CareerSave, k: AttrKey): keyof Attrs {
  if (k === "key1") return keyAttrs(save.player.position)[0];
  if (k === "key2") return keyAttrs(save.player.position)[1];
  return k;
}

/** How a 50/50 option lands (decided up front, so a reload gives the same result). */
export const gambleWon = (save: CareerSave, half: number, situationId: string) => new Rng(hash(`${save.id}:${save.season?.year}:${half}:${situationId}:gamble`)).chance(0.5);

/** The effects an option will have (a gamble's depend on the roulette). */
export const optionBars = (opt: SituationOption, won: boolean) => (opt.gamble ? (won ? opt.gamble.win : opt.gamble.lose) : opt.bars) ?? {};

/** Apply a choice. Effects land straight away (bars, attributes) and risky ones raise the injury risk for the next stretch. */
export function chooseSituation(save: CareerSave, half: number, situationId: string, optionId: string): CareerSave {
  const sit = byId.get(situationId);
  const opt = sit?.options.find((x) => x.id === optionId);
  if (!sit || !opt || !save.season || choiceOf(save, half, situationId)) return save;
  const won = gambleWon(save, half, situationId);
  const bars = { ...save.bars };
  for (const [k, v] of Object.entries(optionBars(opt, won)) as [keyof Bars, number][]) bars[k] = Math.round(clamp((bars[k] ?? 50) + v, 0, 100));
  const attrs = { ...save.player.attrs };
  for (const [k, v] of Object.entries(opt.attrs ?? {}) as [AttrKey, number][]) {
    const a = resolveAttr(save, k);
    attrs[a] = Math.round(clamp(attrs[a] + v, 1, 99) * 10) / 10;
  }
  return {
    ...save,
    bars,
    player: { ...save.player, attrs, rating: overall(attrs, save.player.position) },
    season: {
      ...save.season,
      choices: { ...save.season.choices, [key(half, situationId)]: optionId },
      ...(opt.gamble ? { gambles: { ...save.season.gambles, [key(half, situationId)]: won } } : {}),
      risk: (save.season.risk ?? 0) + (opt.risk ?? 0),
    },
    seenSituations: [...(save.seenSituations ?? []).filter((id) => id !== situationId), situationId].slice(-24),
  };
}
