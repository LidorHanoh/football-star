import { hash } from "./people";
import { clamp, Rng } from "./rng";
import type { CareerSave, Position } from "./types";

/**
 * The national team. International breaks happen during the season and a big
 * tournament some summers (World Cup, Euro, Copa América). You only go if
 * you're picked: your rating has to be close to your country's level.
 */

/** National team strength on the same scale as club team ratings. Unlisted countries: 62. */
export const NATION_STRENGTH: Record<string, number> = {
  France: 86, Spain: 86, England: 85, Argentina: 85, Brazil: 84, Portugal: 84, Germany: 83, Netherlands: 82, Italy: 81, Belgium: 80,
  Croatia: 79, Uruguay: 79, Colombia: 78, Morocco: 78, Denmark: 77, Switzerland: 77, Norway: 76, Austria: 76, "United States": 76, USA: 76,
  Mexico: 76, Japan: 76, Senegal: 76, Türkiye: 75, Turkey: 75, Serbia: 75, Poland: 75, Sweden: 75, Ukraine: 75, Ecuador: 75,
  "Korea, South": 74, Nigeria: 74, "Cote d'Ivoire": 74, Paraguay: 74, Scotland: 73, "Czech Republic": 73, Hungary: 73, Greece: 73, Egypt: 73, Algeria: 73,
  Canada: 73, Wales: 72, Iran: 72, Australia: 72, Slovakia: 72, Romania: 72, Georgia: 72, Ghana: 72, Cameroon: 72, Chile: 72,
  Ireland: 71, Slovenia: 71, Tunisia: 71, Peru: 71, Venezuela: 71, Albania: 70, "Saudi Arabia": 70, "Saudi-Arabia": 70, Israel: 69, "Bosnia-Herzegovina": 69,
  Iceland: 68, Finland: 68, "Northern Ireland": 68, "North Macedonia": 67, Bulgaria: 67, Montenegro: 67, Kosovo: 66, Qatar: 66, Bolivia: 65, Jamaica: 65,
  Armenia: 64, Kazakhstan: 64, Cyprus: 63, Luxembourg: 63, Belarus: 63, Azerbaijan: 62, Lithuania: 61, Latvia: 60, Estonia: 60, Moldova: 59,
  "Faroe Islands": 56, Malta: 55, Liechtenstein: 50,
};
export const nationStrength = (country: string) => NATION_STRENGTH[country] ?? 62;

const CONMEBOL = new Set(["Argentina", "Brazil", "Uruguay", "Colombia", "Ecuador", "Paraguay", "Chile", "Peru", "Venezuela", "Bolivia"]);
const UEFA = new Set([
  "France", "Spain", "England", "Portugal", "Germany", "Netherlands", "Italy", "Belgium", "Croatia", "Denmark", "Switzerland", "Norway", "Austria", "Türkiye", "Turkey", "Serbia", "Poland",
  "Sweden", "Ukraine", "Scotland", "Czech Republic", "Hungary", "Greece", "Wales", "Slovakia", "Romania", "Georgia", "Ireland", "Slovenia", "Albania", "Israel", "Bosnia-Herzegovina", "Iceland",
  "Finland", "Northern Ireland", "North Macedonia", "Bulgaria", "Montenegro", "Kosovo", "Armenia", "Kazakhstan", "Cyprus", "Luxembourg", "Belarus", "Azerbaijan", "Lithuania", "Latvia", "Estonia",
  "Moldova", "Faroe Islands", "Malta", "Liechtenstein", "Russia",
]);

export type IntlComp = "wc" | "euro" | "copa";
export type IntlKind = "qualifier" | "nationsLeague" | "friendly";
export type IntlStage = "group" | "r16" | "qf" | "sf" | "final";

export interface IntlMatch {
  opp: string;
  home: boolean;
  gf: number;
  ga: number;
  /** null = in the squad but didn't play. */
  minutes: number | null;
  goals: number;
  assists: number;
  rating: number | null;
  kind?: IntlKind;
  stage?: IntlStage;
  pens?: "won" | "lost";
}

/** One international break: picked or not, and the two games. */
export interface IntlBreak {
  half: 1 | 2;
  /** Where in the half it falls (0..1). */
  at: number;
  picked: boolean;
  /** Only when you weren't picked: how close you were (shown only if close). */
  close?: boolean;
  matches: IntlMatch[];
  firstCap?: boolean;
}

export interface Tournament {
  comp: IntlComp;
  year: number;
  qualified: boolean;
  picked: boolean;
  matches: IntlMatch[];
  /** Furthest stage reached. */
  last: IntlStage;
  won: boolean;
}

/** Which tournament (if any) is played in the summer after this season. */
export function summerTournament(country: string, seasonYear: number): IntlComp | null {
  const summer = seasonYear + 1;
  if (summer % 4 === 2) return "wc";
  if (summer % 4 === 0) return UEFA.has(country) ? "euro" : CONMEBOL.has(country) ? "copa" : null;
  return null;
}

/** Your country's opponents: nations from the same confederation, around the same level. */
function opponents(country: string, rng: Rng, n: number, spread = 8, world = false) {
  const me = nationStrength(country);
  const conf = UEFA.has(country) ? UEFA : CONMEBOL.has(country) ? CONMEBOL : null;
  const pool = Object.keys(NATION_STRENGTH).filter((c) => c !== country && !["USA", "Turkey", "Saudi-Arabia"].includes(c) && (world || !conf || conf.has(c)) && Math.abs(nationStrength(c) - me) <= spread);
  const list = rng.shuffle(pool.length >= n ? pool : Object.keys(NATION_STRENGTH).filter((c) => c !== country && !["USA", "Turkey", "Saudi-Arabia"].includes(c)));
  return list.slice(0, n);
}

/** Good enough for a call-up? Fit, playing and close to the national team's level. */
export function callUpScore(save: CareerSave) {
  const p = save.player;
  if (p.age < 17 || p.injury) return -99;
  const formEdge = (save.bars.form - 50) * 0.06; // ±3
  return p.rating + formEdge - (nationStrength(p.nationality) - 6);
}

const GOAL_SHARE: Record<Position, number> = { ST: 0.36, LW: 0.22, RW: 0.22, AM: 0.18, CM: 0.09, DM: 0.05, LB: 0.03, RB: 0.03, CB: 0.04, GK: 0 };
const ASSIST_SHARE: Record<Position, number> = { ST: 0.14, LW: 0.2, RW: 0.2, AM: 0.24, CM: 0.15, DM: 0.08, LB: 0.1, RB: 0.1, CB: 0.03, GK: 0.01 };

function xg(own: number, opp: number, home: boolean) {
  return clamp(1.3 * Math.exp((own - opp + (home ? 2 : 0)) * 0.055), 0.2, 4);
}
function poisson(lambda: number, rng: Rng) {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > l);
  return k - 1;
}

/** One national-team game. Your share of the goals depends on your position and how good you are. */
function playIntl(rng: Rng, save: CareerSave, opp: string, home: boolean, starter: boolean, extra: Partial<IntlMatch> = {}): IntlMatch {
  const p = save.player;
  const me = nationStrength(p.nationality);
  const them = nationStrength(opp);
  const gf = poisson(xg(me, them, home), rng);
  const ga = poisson(xg(them, me, !home), rng);
  const minutes = starter ? rng.int(70, 90) : rng.chance(0.7) ? rng.int(10, 30) : null;
  let goals = 0;
  let assists = 0;
  if (minutes) {
    const share = (minutes / 90) * clamp(1 + (p.rating - me) * 0.05, 0.5, 1.6);
    for (let i = 0; i < gf; i++) {
      if (rng.chance(GOAL_SHARE[p.position] * share)) goals++;
      else if (rng.chance(ASSIST_SHARE[p.position] * share)) assists++;
    }
  }
  const rating = minutes ? Math.round(clamp(6.3 + goals * 0.9 + assists * 0.5 + (gf > ga ? 0.3 : gf < ga ? -0.3 : 0) + (p.position === "GK" || p.position === "CB" ? (ga === 0 ? 0.6 : -ga * 0.2) : 0) + rng.normal() * 0.35, 4.5, 10) * 10) / 10 : null;
  return { opp, home, gf, ga, minutes, goals, assists, rating, ...extra };
}

/** International breaks in a half: three in the autumn, one in March. */
export function internationalBreaks(save: CareerSave, half: 1 | 2): IntlBreak[] {
  const year = save.season?.year ?? 2026;
  const rng = new Rng(hash(`${save.id}:${year}:${half}:intl`));
  const country = save.player.nationality;
  const tournament = summerTournament(country, year);
  const kind: IntlKind = tournament ? "qualifier" : UEFA.has(country) ? "nationsLeague" : "friendly";
  const slots = half === 1 ? [0.22, 0.48, 0.76] : [0.42];
  let capped = (save.history ?? []).some((h) => (h.intl?.caps ?? 0) > 0) || (save.season?.intl ?? []).some((b) => b.matches.some((m) => m.minutes));
  return slots.map((at) => {
    const score = callUpScore(save) + rng.normal() * 1.2;
    const picked = score >= 0;
    if (!picked) return { half, at, picked, close: score > -3, matches: [] };
    const starter = score >= 4;
    const opps = opponents(country, rng, 2);
    const matches = opps.map((o, i) => playIntl(rng, save, o, i === 0, starter, { kind }));
    const firstCap = !capped && matches.some((m) => m.minutes);
    if (firstCap) capped = true;
    return { half, at, picked, matches, ...(firstCap ? { firstCap } : {}) };
  });
}

/** The summer tournament after this season (if there is one): qualified? picked? how far? */
export function playTournament(save: CareerSave): Tournament | null {
  const year = save.season?.year ?? 2026;
  const country = save.player.nationality;
  const comp = summerTournament(country, year);
  if (!comp) return null;
  const rng = new Rng(hash(`${save.id}:${year}:tournament`));
  const me = nationStrength(country);
  // Qualifying: the stronger the country the likelier (and the qualifiers you played count a bit).
  const quals = (save.season?.intl ?? []).flatMap((b) => b.matches);
  const form = quals.reduce((s, m) => s + (m.gf > m.ga ? 0.03 : m.gf < m.ga ? -0.03 : 0), 0);
  const chance = comp === "copa" ? 1 : clamp((me - 62) / 22 + (comp === "wc" ? 0.12 : 0) + form, 0.05, 0.97);
  const qualified = rng.chance(chance);
  const picked = qualified && callUpScore(save) + rng.normal() * 1.2 >= 0;
  const starter = callUpScore(save) >= 4;
  const matches: IntlMatch[] = [];
  let last: IntlStage = "group";
  let won = false;
  if (qualified) {
    const play = (opp: string, stage: IntlStage) => {
      const m = playIntl(rng, picked ? save : { ...save, player: { ...save.player, rating: 0 } }, opp, false, picked && starter, { stage });
      if (!picked) Object.assign(m, { minutes: null, goals: 0, assists: 0, rating: null });
      return m;
    };
    const group = opponents(country, rng, 3, 14, comp === "wc");
    let pts = 0;
    for (const o of group) {
      const m = play(o, "group");
      matches.push(m);
      pts += m.gf > m.ga ? 3 : m.gf === m.ga ? 1 : 0;
    }
    if (pts >= 4 || (pts === 3 && rng.chance(0.5))) {
      const ko = opponents(country, rng, 8, 30, true).sort((a, b) => nationStrength(a) - nationStrength(b));
      for (const [i, stage] of (["r16", "qf", "sf", "final"] as IntlStage[]).entries()) {
        last = stage;
        const m = play(ko[Math.min(ko.length - 1, 3 + i)] ?? ko[0], stage);
        if (m.gf === m.ga) m.pens = rng.chance(clamp(0.5 + (me - nationStrength(m.opp)) / 60, 0.25, 0.75)) ? "won" : "lost";
        matches.push(m);
        if (m.gf < m.ga || m.pens === "lost") break;
        if (stage === "final") won = true;
      }
    }
  }
  return { comp, year: year + 1, qualified, picked, matches, last, won };
}

/** Caps and goals over a list of breaks/tournament. */
export function intlTotals(breaks: IntlBreak[] = [], tournament?: Tournament | null) {
  const all = [...breaks.flatMap((b) => b.matches), ...(tournament?.picked ? tournament.matches : [])];
  return { caps: all.filter((m) => m.minutes).length, goals: all.reduce((s, m) => s + m.goals, 0) };
}
