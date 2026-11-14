import { FACTS, factsFor } from "./facts";
import { hash } from "./people";
import { Rng } from "./rng";
import type { TriviaTopic } from "./types";

/**
 * Football trivia inside the career. Real transfers (from Transfermarkt) and
 * champions: "he moved from this club to that one in 2019 — who is it?".
 * The data lives in public/trivia/data.json (built by scripts/build-trivia.mjs).
 */
export interface TriviaData {
  /** tmId → club. c = country code (il, gb-eng, es, it, de, fr, …); big = a top European club. */
  clubs: Record<string, { en: string; he?: string; c: string; big?: 1 }>;
  /** tmId → player. g = position group. */
  players: Record<string, { en: string; he?: string; g: "GK" | "DF" | "MF" | "FW" }>;
  /** [player, from club, to club, year, fee in € (0 = free, -1 = loan, null = unknown)] */
  transfers: [number, number, number, number, number | null][];
  /** Champions by season (year the season ended). */
  champions: { cl: [number, number][]; isr: [number, number][] };
}

export type TriviaQuestion =
  | { id: string; kind: "transfer"; player: number; from: number; to: number; year: number; fee: number | null; options: number[]; answer: number }
  | { id: string; kind: "champion"; comp: "cl" | "isr"; year: number; options: number[]; answer: number }
  /** A hand-written fact (famous goal, trophy, manager, retirement, record): options are answer indexes into the fact. */
  | { id: string; kind: "fact"; fact: number; options: number[]; answer: number };

/** Question text and an answer's label for a fact question. */
export const factText = (fact: number, he: boolean) => FACTS[fact][he ? 3 : 2];
export const factAnswer = (fact: number, i: number, he: boolean) => FACTS[fact][4][i][he ? 1 : 0];

export const TOPICS: TriviaTopic[] = ["general", "cl", "top5", "israel"];
const TOP5 = new Set(["gb-eng", "es", "it", "de", "fr"]);

function topicFits(data: TriviaData, topics: TriviaTopic[], from: number, to: number) {
  if (topics.includes("general")) return true;
  const a = data.clubs[from];
  const b = data.clubs[to];
  if (!a || !b) return false;
  if (topics.includes("israel") && (a.c === "il" || b.c === "il")) return true;
  if (topics.includes("top5") && (TOP5.has(a.c) || TOP5.has(b.c))) return true;
  if (topics.includes("cl") && (a.big || b.big)) return true;
  return false;
}

/** A fresh question for the chosen topics (never one already seen, while there are others). */
export function makeQuestion(data: TriviaData, topics: TriviaTopic[], seed: string, seen: string[] = []): TriviaQuestion | null {
  if (!topics.length) return null;
  const rng = new Rng(hash(seed));
  const done = new Set(seen);
  // Famous goals, trophies, managers, retirements and records: about a third of the questions.
  const facts = factsFor(topics).filter(({ f }) => !done.has(`f${f[0]}`));
  if (facts.length && rng.chance(0.35)) {
    const { f, i } = rng.pick(facts);
    return { id: `f${f[0]}`, kind: "fact", fact: i, answer: 0, options: rng.shuffle([0, 1, 2, 3]) };
  }
  // Champions questions now and then (CL for the CL topic, Ligat Ha'Al for the Israeli one).
  const champComps = (["cl", "isr"] as const).filter((c) => topics.includes("general") || (c === "cl" ? topics.includes("cl") : topics.includes("israel")));
  if (champComps.length && rng.chance(0.18)) {
    const comp = rng.pick([...champComps]);
    const list = data.champions[comp].filter(([y]) => !done.has(`c${comp}${y}`));
    if (list.length) {
      const [year, answer] = rng.pick(list);
      const others = rng.shuffle([...new Set(data.champions[comp].map(([, c]) => c))].filter((c) => c !== answer)).slice(0, 3);
      if (others.length === 3) return { id: `c${comp}${year}`, kind: "champion", comp, year, answer, options: rng.shuffle([answer, ...others]) };
    }
  }
  const pool = data.transfers.filter(([p, f, t, y]) => !done.has(`t${p}-${y}`) && data.players[p] && data.clubs[f] && data.clubs[t] && topicFits(data, topics, f, t));
  const list = pool.length ? pool : data.transfers.filter(([, f, t]) => topicFits(data, topics, f, t));
  if (!list.length) return null;
  const [player, from, to, year, fee] = rng.pick(list);
  // Wrong answers: players of the same kind from the same years, so it isn't too easy.
  const g = data.players[player].g;
  const near = new Set<number>();
  for (const [p, f, t, y] of data.transfers) if (p !== player && Math.abs(y - year) <= 4 && data.players[p]?.g === g && f !== from && t !== to) near.add(p);
  let others = rng.shuffle([...near]).slice(0, 3);
  if (others.length < 3) others = [...others, ...rng.shuffle(Object.keys(data.players).map(Number).filter((p) => p !== player && !others.includes(p))).slice(0, 3 - others.length)];
  return { id: `t${player}-${year}`, kind: "transfer", player, from, to, year, fee, answer: player, options: rng.shuffle([player, ...others]) };
}

/** Where trivia pops up during a half (fractions of the half). Two a half. */
export function triviaSlots(saveId: string, year: number, half: number): number[] {
  const rng = new Rng(hash(`${saveId}:${year}:${half}:trivia`));
  return [rng.range(0.2, 0.42), rng.range(0.6, 0.9)];
}
