import { keyAttrs, overall } from "./attrs";
import { hash } from "./people";
import { clamp, Rng } from "./rng";
import type { Attrs, Bars, CareerSave } from "./types";

/**
 * In-season situations: before each half season you face two off-the-pitch
 * decisions. Every option moves your bars and some move your attributes or
 * your injury risk, so the choice shows up in the matches that follow.
 */
export type AttrKey = keyof Attrs | "key1" | "key2";

export interface SituationOption {
  id: string;
  bars?: Partial<Bars>;
  attrs?: Partial<Record<AttrKey, number>>;
  /** Extra injury chance per match for the coming half. */
  risk?: number;
}

export interface Situation {
  id: string;
  options: [SituationOption, SituationOption];
  /** Only offered when this holds. */
  when?: (s: CareerSave) => boolean;
}

const isGk = (s: CareerSave) => s.player.position === "GK";

export const SITUATIONS: Situation[] = [
  {
    id: "welcomeNight",
    when: (s) => newAtClub(s) && (s.season?.halvesPlayed ?? 0) === 0,
    options: [
      { id: "go", bars: { chemistry: 18, morale: 6, form: -8, fitness: -4 } },
      { id: "skip", bars: { form: 4, chemistry: -10 } },
    ],
  },
  {
    id: "teamDinner",
    options: [
      { id: "go", bars: { chemistry: 12, morale: 5, form: -6, fitness: -3 } },
      { id: "rest", bars: { form: 5, fitness: 4, chemistry: -6 } },
    ],
  },
  {
    id: "sponsorShoot",
    options: [
      { id: "shoot", bars: { fans: 12, morale: 4, training: -10, form: -5 } },
      { id: "train", bars: { training: 8, form: 3 }, attrs: { key1: 1 } },
    ],
  },
  {
    id: "extraGym",
    options: [
      { id: "yes", bars: { fitness: -8 }, attrs: { physical: 1.5, pace: 0.5 }, risk: 0.02 },
      { id: "no", bars: { fitness: 5 } },
    ],
  },
  {
    id: "tvInterview",
    options: [
      { id: "accept", bars: { fans: 8, morale: 3, trust: -4 } },
      { id: "decline", bars: { trust: 3 } },
    ],
  },
  {
    id: "videoSession",
    options: [
      { id: "go", bars: { trust: 6, morale: -3 }, attrs: { key2: 1 } },
      { id: "skip", bars: { morale: 3, trust: -5 } },
    ],
  },
  {
    id: "friendParty",
    options: [
      { id: "go", bars: { morale: 10, fans: 2, form: -10, fitness: -5 } },
      { id: "stay", bars: { form: 5, morale: -4 } },
    ],
  },
  {
    id: "mentorKid",
    when: (s) => s.player.age >= 24,
    options: [
      { id: "help", bars: { chemistry: 10, trust: 5, fitness: -3 } },
      { id: "no", bars: { fitness: 2, chemistry: -3 } },
    ],
  },
  {
    id: "socialMedia",
    options: [
      { id: "post", bars: { fans: 10, morale: 3, form: -4 } },
      { id: "focus", bars: { form: 4, fans: -2 } },
    ],
  },
  {
    id: "gamingNight",
    options: [
      { id: "join", bars: { chemistry: 8, morale: 4, fitness: -6 } },
      { id: "sleep", bars: { fitness: 6, form: 3, chemistry: -4 } },
    ],
  },
  {
    id: "finishingDrills",
    when: (s) => !isGk(s),
    options: [
      { id: "stay", bars: { fitness: -5 }, attrs: { shooting: 1.2 } },
      { id: "rest", bars: { fitness: 3, morale: 2 } },
    ],
  },
  {
    id: "keeperDrills",
    when: isGk,
    options: [
      { id: "stay", bars: { fitness: -5 }, attrs: { pace: 0.8, dribbling: 0.8 } },
      { id: "rest", bars: { fitness: 3, morale: 2 } },
    ],
  },
  {
    id: "schoolExams",
    when: (s) => s.player.age <= 17,
    options: [
      { id: "study", bars: { morale: 6, training: -6, trust: -2 } },
      { id: "camp", bars: { training: 10, morale: -5 }, attrs: { key1: 0.8 } },
    ],
  },
  {
    id: "playThroughPain",
    when: (s) => s.bars.fitness < 80,
    options: [
      { id: "play", bars: { trust: 6, fitness: -6 }, risk: 0.05 },
      { id: "rest", bars: { fitness: 12, trust: -4 } },
    ],
  },
];

const byId = new Map(SITUATIONS.map((s) => [s.id, s]));
export const situationById = (id: string) => byId.get(id);

/** You joined this club this season (and it isn't your first club). */
export function newAtClub(s: CareerSave) {
  const last = s.history.at(-1);
  return !!last && !!s.contract && last.clubId !== s.contract.clubId;
}

/** The half you're about to play (1 or 2), or null when the season is done. */
const nextHalf = (s: CareerSave) => (s.season && s.season.halvesPlayed < 2 ? ((s.season.halvesPlayed + 1) as 1 | 2) : null);

/** The (two) situations before the next half. Deterministic for a save, so a reload shows the same ones. */
export function upcomingSituations(save: CareerSave): Situation[] {
  const half = nextHalf(save);
  if (!half || !save.season) return [];
  const rng = new Rng(hash(`${save.id}:${save.season.year}:${half}`));
  const pool = SITUATIONS.filter((s) => !s.when || s.when(save));
  const forced = pool.filter((s) => s.id === "welcomeNight");
  const rest = rng.shuffle(pool.filter((s) => s.id !== "welcomeNight"));
  return [...forced, ...rest].slice(0, 2);
}

const key = (save: CareerSave, id: string) => `${nextHalf(save)}:${id}`;
export const choiceOf = (save: CareerSave, id: string) => save.season?.choices?.[key(save, id)];
export const situationsPending = (save: CareerSave) => upcomingSituations(save).some((s) => !choiceOf(save, s.id));

/** Resolve "key1"/"key2" to the position's most important attributes. */
export function resolveAttr(save: CareerSave, k: AttrKey): keyof Attrs {
  if (k === "key1") return keyAttrs(save.player.position)[0];
  if (k === "key2") return keyAttrs(save.player.position)[1];
  return k;
}

export function chooseSituation(save: CareerSave, situationId: string, optionId: string): CareerSave {
  const sit = byId.get(situationId);
  const opt = sit?.options.find((o) => o.id === optionId);
  if (!sit || !opt || !save.season || choiceOf(save, situationId)) return save;
  const bars = { ...save.bars };
  for (const [k, v] of Object.entries(opt.bars ?? {}) as [keyof Bars, number][]) bars[k] = Math.round(clamp((bars[k] ?? 50) + v, 0, 100));
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
      choices: { ...save.season.choices, [key(save, situationId)]: optionId },
      risk: (save.season.risk ?? 0) + (opt.risk ?? 0),
    },
  };
}
