import { isLeague } from "./competitions";
import { hash } from "./people";
import { clamp, Rng } from "./rng";
import type { CareerSave, Position } from "./types";

// ---------------------------------------------------------------------------
// The league's individual awards, decided like the real ones: whoever tops the
// table wins. Every club has its key players (a striker, a playmaker, a
// keeper…) whose numbers follow how their team is actually doing — a club
// scoring goals for fun has a striker near the top of the scoring chart.
// ---------------------------------------------------------------------------

export type AwardKey = "goldenBoot" | "playmaker" | "playerOfSeason" | "goldenGlove" | "wall";
export const AWARD_KEYS: AwardKey[] = ["goldenBoot", "playmaker", "playerOfSeason", "goldenGlove", "wall"];

export interface LeaderLine {
  id: string;
  clubId: string;
  /** Which key player of the club (see SLOTS), -1 = you. */
  slot: number;
  position: Position;
  apps: number;
  goals: number;
  assists: number;
  /** Average match rating. */
  rating: number;
  cleanSheets: number;
  /** Games the club has played (for "played enough" rules). */
  games: number;
  you?: boolean;
}

/** Each club's key players: goals and assists per game for an average side, a rating edge. */
export const SLOTS: { pos: Position; g: number; a: number; r: number }[] = [
  { pos: "ST", g: 0.36, a: 0.08, r: 0.15 },
  { pos: "ST", g: 0.21, a: 0.07, r: 0 },
  { pos: "LW", g: 0.17, a: 0.17, r: 0.05 },
  { pos: "AM", g: 0.12, a: 0.23, r: 0.1 },
  { pos: "CM", g: 0.06, a: 0.12, r: 0.02 },
  { pos: "CB", g: 0.04, a: 0.02, r: 0.05 },
  { pos: "RB", g: 0.02, a: 0.08, r: -0.05 },
  { pos: "GK", g: 0, a: 0, r: 0.05 },
];

const DEFENDERS: Position[] = ["CB", "LB", "RB", "DM"];

/** The league's player lines (you included) as the season stands right now. */
export function leagueLeaders(save: CareerSave): LeaderLine[] {
  const s = save.season;
  if (!s || !save.contract) return [];
  const rows = s.table.filter((r) => r.p > 0);
  if (!rows.length) return [];
  const avgGf = rows.reduce((t, r) => t + r.gf / r.p, 0) / rows.length || 1.3;
  const avgGa = rows.reduce((t, r) => t + r.ga / r.p, 0) / rows.length || 1.3;
  const avgPpg = rows.reduce((t, r) => t + r.pts / r.p, 0) / rows.length;
  const youth = save.contract.level === "youth" ? "y" : "";
  const lines: LeaderLine[] = [];
  for (const row of rows) {
    const attack = clamp(row.gf / row.p / avgGf, 0.4, 2.2);
    const defence = row.ga / row.p;
    const form = row.pts / row.p - avgPpg;
    SLOTS.forEach((slot, i) => {
      const rng = new Rng(hash(`${row.clubId}:${s.year}:${youth}lead${i}`));
      const talent = rng.normal() * 0.25;
      const share = clamp(0.84 + rng.normal() * 0.1, 0.5, 1);
      const apps = Math.round(row.p * share);
      const goals = Math.round(slot.g * attack * Math.exp(talent) * apps);
      const assists = Math.round(slot.a * attack * Math.exp(talent + rng.normal() * 0.15) * apps);
      const cleanSheets = slot.pos === "GK" ? Math.round(apps * clamp(0.3 + (avgGa - defence) * 0.28 + rng.normal() * 0.04, 0.04, 0.62)) : 0;
      const rating = Math.round(clamp(6.55 + form * 0.35 + slot.r + talent * 0.6 + ((goals + assists * 0.7) / Math.max(apps, 1)) * 0.55, 5.8, 8.3) * 100) / 100;
      lines.push({ id: `${row.clubId}:${i}`, clubId: row.clubId, slot: i, position: slot.pos, apps, goals, assists, rating, cleanSheets, games: row.p });
    });
  }
  // You.
  const league = s.matches.filter(isLeague);
  const played = league.filter((m) => m.minutes);
  const ratings = played.map((m) => m.rating).filter((r): r is number => !!r);
  const mine = s.table.find((r) => r.clubId === save.contract!.clubId);
  lines.push({
    id: "you",
    clubId: save.contract.clubId,
    slot: -1,
    position: save.player.position,
    apps: played.length,
    goals: league.reduce((t, m) => t + m.goals, 0),
    assists: league.reduce((t, m) => t + m.assists, 0),
    rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : 0,
    cleanSheets: save.player.position === "GK" ? played.filter((m) => m.goalsAgainst === 0).length : 0,
    games: mine?.p ?? league.length,
    you: true,
  });
  return lines;
}

/** Played enough to be judged on ratings (60% of the club's games). */
const regular = (l: LeaderLine) => l.games > 0 && l.apps >= l.games * 0.6;

/** The table for one award, best first (you win ties). */
export function awardTable(lines: LeaderLine[], key: AwardKey): LeaderLine[] {
  const by = (v: (l: LeaderLine) => number, ok: (l: LeaderLine) => boolean = () => true) =>
    lines.filter((l) => ok(l) && v(l) > 0).sort((a, b) => v(b) - v(a) || (a.you ? -1 : b.you ? 1 : 0) || a.apps - b.apps);
  switch (key) {
    case "goldenBoot":
      return by((l) => l.goals);
    case "playmaker":
      return by((l) => l.assists);
    case "goldenGlove":
      return by((l) => l.cleanSheets, (l) => l.position === "GK" && regular(l));
    case "wall":
      return by((l) => l.rating, (l) => DEFENDERS.includes(l.position) && regular(l));
    case "playerOfSeason":
      return by((l) => l.rating, regular);
  }
}

/** The awards you won: you top the table. */
export function awardsWon(lines: LeaderLine[]): AwardKey[] {
  return AWARD_KEYS.filter((k) => awardTable(lines, k)[0]?.you);
}
