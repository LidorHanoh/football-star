import { hash } from "./people";
import { Rng } from "./rng";
import type { CareerSave, Comp, EuroComp, KnockoutStage, MatchResult, TableRow, World, WorldClub } from "./types";

/**
 * Cups and Europe. Every first-team season has a domestic cup (knockout, second
 * half of the season) and, if your club qualified, a European campaign:
 * 6 league-phase games (3 per half), then single-match knockouts.
 */

const EUROPE = new Set(["England", "Spain", "Italy", "Germany", "France", "Portugal", "Netherlands", "Belgium", "Turkey", "Scotland", "Austria", "Switzerland", "Greece", "Denmark", "Israel"]);
const BIG5 = new Set(["England", "Spain", "Italy", "Germany", "France"]);

export const CUP_STAGES: KnockoutStage[] = ["r16", "qf", "sf", "final"];
export const EURO_KO: KnockoutStage[] = ["po", "r16", "qf", "sf", "final"];

const countryOf = (world: World, leagueKey: string) => world.leagues.find((l) => l.key === leagueKey)?.country ?? "";
const tierOf = (world: World, leagueKey: string) => world.leagues.find((l) => l.key === leagueKey)?.tier ?? 1;

/** European places for a league position. */
export function europeSlot(world: World, leagueKey: string, pos: number): EuroComp | null {
  const country = countryOf(world, leagueKey);
  if (!EUROPE.has(country) || tierOf(world, leagueKey) !== 1) return null;
  if (BIG5.has(country)) return pos <= 4 ? "cl" : pos <= 6 ? "el" : null;
  if (country === "Israel") return pos === 1 ? "cl" : pos <= 3 ? "el" : null;
  return pos <= 2 ? "cl" : pos <= 4 ? "el" : null;
}

/** Final league position → European place next season (null = none). */
export function qualification(world: World, leagueKey: string, table: TableRow[], clubId: string): EuroComp | null {
  const pos = table.findIndex((r) => r.clubId === clubId) + 1;
  return pos ? europeSlot(world, leagueKey, pos) : null;
}

/** Is your club in Europe this season? From last season's finish, or (new club / first season) its standing in the league. */
export function europeThisSeason(save: CareerSave, world: World, club: WorldClub): EuroComp | null {
  const last = save.history.at(-1);
  if (last && last.clubId === club.id && last.level === "first" && last.qualified !== undefined) return last.qualified ?? null;
  const ranked = world.clubs.filter((c) => c.leagueKey === club.leagueKey).sort((a, b) => b.teamRating - a.teamRating || b.reputation - a.reputation);
  return europeSlot(world, club.leagueKey, ranked.findIndex((c) => c.id === club.id) + 1);
}

/** Clubs that play in a European competition (from other countries). */
function europePool(world: World, comp: EuroComp, myCountry: string) {
  const all = world.clubs
    .filter((c) => EUROPE.has(countryOf(world, c.leagueKey)) && tierOf(world, c.leagueKey) === 1 && countryOf(world, c.leagueKey) !== myCountry)
    .sort((a, b) => b.teamRating - a.teamRating || b.reputation - a.reputation);
  return comp === "cl" ? all.slice(0, 40) : all.slice(22, 72);
}

/** The league-phase draw: six opponents, one or two from each pot. */
export function europeDraw(save: CareerSave, world: World, club: WorldClub, comp: EuroComp): string[] {
  const rng = new Rng(hash(`${save.id}:${save.season?.year}:draw`));
  const pool = europePool(world, comp, countryOf(world, club.leagueKey));
  const pots = [0, 1, 2, 3].map((p) => pool.slice(p * Math.ceil(pool.length / 4), (p + 1) * Math.ceil(pool.length / 4)));
  const picks: string[] = [];
  const take = (pot: WorldClub[], n: number) => {
    for (const c of rng.shuffle([...pot])) {
      if (n <= 0) break;
      if (!picks.includes(c.id)) {
        picks.push(c.id);
        n--;
      }
    }
  };
  take(pots[0], 2);
  take(pots[1], 2);
  take(pots[2], 1);
  take(pots[3], 1);
  return picks;
}

/** A knockout opponent: later rounds bring stronger teams. */
export function knockoutOpponent(rng: Rng, world: World, club: WorldClub, comp: Comp, stage: KnockoutStage, avoid: string[]): WorldClub {
  const depth = { po: 1, r16: 1, qf: 0.55, sf: 0.35, final: 0.2 }[stage];
  let pool: WorldClub[];
  if (comp === "cup") {
    const country = countryOf(world, club.leagueKey);
    pool = world.clubs.filter((c) => c.id !== club.id && countryOf(world, c.leagueKey) === country).sort((a, b) => b.teamRating - a.teamRating);
    // Early rounds: anyone (lower divisions too); the final: one of the best.
    pool = pool.slice(0, Math.max(3, Math.round(pool.length * depth)));
  } else {
    pool = europePool(world, comp as EuroComp, countryOf(world, club.leagueKey));
    pool = pool.slice(0, Math.max(4, Math.round(pool.length * (stage === "po" ? 1 : depth))));
  }
  const free = pool.filter((c) => !avoid.includes(c.id));
  return rng.pick(free.length ? free : pool);
}

/** League-phase points so far (3 a win, 1 a draw). */
export const euroPoints = (matches: MatchResult[]) => matches.filter((m) => (m.comp === "cl" || m.comp === "el") && !m.stage).reduce((s, m) => s + (m.goalsFor > m.goalsAgainst ? 3 : m.goalsFor === m.goalsAgainst ? 1 : 0), 0);

/** After six league-phase games: straight to the last 16, a play-off, or out. */
export const afterLeaguePhase = (pts: number): KnockoutStage | null => (pts >= 10 ? "r16" : pts >= 7 ? "po" : null);

/** Won a knockout match (draws go to penalties). */
export const wonTie = (m: MatchResult) => m.goalsFor > m.goalsAgainst || (m.goalsFor === m.goalsAgainst && m.pens === "won");

/** How far you went in a competition this season. */
export function runOf(matches: MatchResult[], comp: Comp): { last: KnockoutStage | "league" | null; won: boolean; alive: boolean } {
  const ms = matches.filter((m) => m.comp === comp);
  if (!ms.length) return { last: null, won: false, alive: false };
  const ko = ms.filter((m) => m.stage);
  const lastKo = ko.at(-1);
  if (!lastKo) return { last: "league", won: false, alive: false };
  const won = lastKo.stage === "final" && wonTie(lastKo);
  return { last: lastKo.stage!, won, alive: !won && wonTie(lastKo) };
}

export const isLeague = (m: MatchResult) => !m.comp || m.comp === "league";
