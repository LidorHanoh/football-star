import type { AwardKey } from "./awards";
import { STAT_KEYS, type Level, type MatchResult, type MatchStats, type SeasonSummary, type Trophy } from "./types";

export const emptyStats = (): MatchStats => Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as unknown as MatchStats;

export function addStats(a: MatchStats, b: MatchStats): MatchStats {
  const out = emptyStats();
  for (const k of STAT_KEYS) out[k] = (a[k] ?? 0) + (b[k] ?? 0);
  return out;
}

/** Totals of the matches you played that have stats, and how many there were. */
export function sumMatchStats(matches: MatchResult[]) {
  let total = emptyStats();
  let apps = 0;
  for (const m of matches) {
    if (!m.minutes || !m.stats) continue;
    total = addStats(total, m.stats);
    apps++;
  }
  return { total, apps };
}

/** Career totals: finished seasons + the season being played. */
export function careerStats(history: SeasonSummary[], current: MatchResult[] = []) {
  let total = emptyStats();
  let apps = 0;
  for (const h of history) {
    if (!h.stats || !h.statApps) continue;
    total = addStats(total, h.stats);
    apps += h.statApps;
  }
  const cur = sumMatchStats(current);
  return { total: addStats(total, cur.total), apps: apps + cur.apps };
}

export const perMatch = (v: number, apps: number) => (apps ? v / apps : 0);
export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Trophies won in a season. League titles come from the real table; individual
 * awards go to whoever tops the league's charts (see awards.ts).
 */
export function seasonTrophies(input: { level: Level; leaguePosition: number | null; matches: MatchResult[]; awards: AwardKey[] }): Trophy[] {
  const { level, leaguePosition, matches, awards } = input;
  const n = matches.length;
  if (!n) return [];
  const out: Trophy[] = [];
  if (level === "first" && leaguePosition === 1) out.push("league");
  if (level === "youth") {
    const wins = matches.filter((m) => m.goalsFor > m.goalsAgainst).length;
    if (wins / n >= 0.65) out.push("youthCup");
  }
  return [...out, ...awards];
}

/** Every trophy of the career, newest season last. */
export function trophyCabinet(history: SeasonSummary[]) {
  return history.flatMap((h) => (h.trophies ?? []).map((trophy) => ({ trophy, year: h.year, clubId: h.clubId, level: h.level })));
}
