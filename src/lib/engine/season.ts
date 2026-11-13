import { growAttrs, overall } from "./attrs";
import { BALANCE } from "./balance";
import { readPotential } from "./career";
import { clamp, Rng } from "./rng";
import type { CareerSave, Highlight, MatchResult, Position, SetPieceKind, TableRow, World, WorldClub } from "./types";

/** Share of a team's goals / assists a player in this position is involved in (per 90, as a starter). */
const GOAL_SHARE: Record<Position, number> = { GK: 0, CB: 0.04, LB: 0.03, RB: 0.03, DM: 0.04, CM: 0.08, AM: 0.15, LW: 0.17, RW: 0.17, ST: 0.3 };
const ASSIST_SHARE: Record<Position, number> = { GK: 0.01, CB: 0.03, LB: 0.08, RB: 0.08, DM: 0.06, CM: 0.12, AM: 0.18, LW: 0.17, RW: 0.17, ST: 0.12 };

export interface HalfEvent {
  key: string; // i18n key under career.events
  params?: Record<string, string | number>;
}

export interface HalfResult {
  save: CareerSave;
  events: HalfEvent[];
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

/** Expected goals for a side given both strengths. */
function xg(own: number, opp: number, home: boolean) {
  const diff = own - opp + (home ? BALANCE.season.homeAdvantage : 0);
  return clamp(BALANCE.season.baseGoals * Math.exp(diff * 0.055), 0.2, 4.5);
}

/** Round-robin rounds (circle method). Returns [home, away] index pairs per round. */
export function roundRobin(n: number): [number, number][][] {
  const ids = [...Array(n).keys()];
  if (n % 2) ids.push(-1);
  const m = ids.length;
  const rounds: [number, number][][] = [];
  for (let r = 0; r < m - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < m / 2; i++) {
      const a = ids[i];
      const b = ids[m - 1 - i];
      if (a !== -1 && b !== -1) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    ids.splice(1, 0, ids.pop()!);
  }
  return rounds;
}

function emptyRow(clubId: string): TableRow {
  return { clubId, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
}

export function unrecord(row: TableRow, gf: number, ga: number) {
  row.p--;
  row.gf -= gf;
  row.ga -= ga;
  if (gf > ga) {
    row.w--;
    row.pts -= 3;
  } else if (gf === ga) {
    row.d--;
    row.pts -= 1;
  } else row.l--;
}

export function record(row: TableRow, gf: number, ga: number) {
  row.p++;
  row.gf += gf;
  row.ga += ga;
  if (gf > ga) {
    row.w++;
    row.pts += 3;
  } else if (gf === ga) {
    row.d++;
    row.pts += 1;
  } else row.l++;
}

export function sortTable(table: TableRow[]) {
  return [...table].sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);
}

/**
 * Play the next half of the season: the whole league's fixtures for that half,
 * plus the player's own matches (first team, or the youth team's U19 games).
 */
export function playHalf(save: CareerSave, world: World): HalfResult {
  if (!save.season || !save.contract || save.season.halvesPlayed >= 2) return { save, events: [] };
  const rng = new Rng(save.rng);
  const season = save.season;
  const half = (season.halvesPlayed + 1) as 1 | 2;
  const clubs = world.clubs.filter((c) => c.leagueKey === season.leagueKey).sort((a, b) => a.id.localeCompare(b.id));
  const myClub = world.clubs.find((c) => c.id === save.contract!.clubId)!;
  const rounds = roundRobin(clubs.length);
  const table = new Map((season.table.length ? season.table : clubs.map((c) => emptyRow(c.id))).map((r) => [r.clubId, { ...r }]));

  const player = { ...save.player };
  const bars = { ...save.bars };
  const matches: MatchResult[] = [];
  const highlights: Highlight[] = [];
  const events: HalfEvent[] = [];
  const level = save.contract.level;
  const myStrength = level === "youth" ? myClub.teamRating - 12 : myClub.teamRating;

  // --- League fixtures (always simulated, so the table is real) ------------
  rounds.forEach((pairs, r) => {
    const roundNo = half === 1 ? r + 1 : rounds.length + r + 1;
    for (const [hi, ai] of pairs) {
      const [home, away] = half === 1 ? [clubs[hi], clubs[ai]] : [clubs[ai], clubs[hi]];
      const isMine = level === "first" && (home.id === myClub.id || away.id === myClub.id);
      if (isMine) {
        const opp = home.id === myClub.id ? away : home;
        const m = playMyMatch(rng, player, bars, myClub.teamRating, opp, home.id === myClub.id, half, roundNo, highlights);
        matches.push(m);
        const [h, a] = m.home ? [m.goalsFor, m.goalsAgainst] : [m.goalsAgainst, m.goalsFor];
        record(table.get(home.id)!, h, a);
        record(table.get(away.id)!, a, h);
      } else {
        const hg = poisson(xg(home.teamRating, away.teamRating, true), rng);
        const ag = poisson(xg(away.teamRating, home.teamRating, false), rng);
        record(table.get(home.id)!, hg, ag);
        record(table.get(away.id)!, ag, hg);
      }
    }
  });

  // --- Youth team: U19 matches against the youth sides of league rivals ----
  if (level === "youth") {
    const opponents = rng.shuffle(clubs.filter((c) => c.id !== myClub.id)).slice(0, BALANCE.season.youthMatchesPerHalf);
    opponents.forEach((opp, i) => {
      const youthOpp = { ...opp, teamRating: opp.teamRating - 12 };
      matches.push(playMyMatch(rng, player, bars, myStrength, youthOpp, i % 2 === 0, half, i + 1, highlights));
    });
  }

  // --- Growth (hidden potential decides speed and ceiling) -----------------
  const played = matches.filter((m) => m.minutes);
  const minutesShare = played.reduce((s, m) => s + (m.minutes ?? 0), 0) / Math.max(matches.length * 90, 1);
  const pot = readPotential(player.p);
  const gap = pot - player.rating;
  let growth = BALANCE.growth.perHalfByAge(player.age);
  if (growth > 0) growth *= clamp(gap / 12, 0, 1.4) * (0.7 + (bars.training / 100) * 0.6) * (0.6 + minutesShare * 0.6);
  growth += rng.normal() * 0.6;
  const before = player.rating;
  const target = clamp(player.rating + growth, 30, Math.max(pot, player.rating));
  player.attrs = growAttrs(player.attrs, player.position, target - player.rating, rng);
  player.rating = overall(player.attrs, player.position);
  if (player.rating > before) events.push({ key: "ratingUp", params: { from: before, to: player.rating } });
  else if (player.rating < before) events.push({ key: "ratingDown", params: { from: before, to: player.rating } });

  // Training points: earned by training well and playing.
  const points = Math.round(0.6 + bars.training / 45 + minutesShare * 1.2);
  player.trainingPoints += points;
  if (points) events.push({ key: "trainingPoints", params: { n: points } });

  // --- Bars -----------------------------------------------------------------
  const ratings = played.map((m) => m.rating!).filter(Boolean);
  const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;
  const goals = matches.reduce((s, m) => s + m.goals, 0);
  const assists = matches.reduce((s, m) => s + m.assists, 0);
  bars.form = Math.round(clamp(avg === null ? bars.form - 10 : 50 + (avg - 6.5) * 40, 0, 100));
  bars.trust = Math.round(clamp(bars.trust + (avg === null ? -3 : (avg - 6.6) * 12) + goals * 1.5, 0, 100));
  bars.fitness = Math.round(clamp(100 - minutesShare * 25 - rng.int(0, 8), 40, 100));
  bars.morale = Math.round(clamp(bars.morale + (minutesShare - 0.45) * 30 + goals, 0, 100));
  bars.fans = Math.round(clamp(bars.fans + goals * 2 + assists - (avg !== null && avg < 6 ? 3 : 0), 0, 100));
  bars.training = Math.round(clamp(bars.training + rng.int(-4, 6), 0, 100));

  // --- Youth → first team promotion ----------------------------------------
  let contract = save.contract;
  if (level === "youth" && player.rating >= myClub.teamRating - BALANCE.promotion.gapToFirstTeam && bars.trust >= BALANCE.promotion.minTrust) {
    contract = { ...contract, level: "first" };
    bars.trust = Math.max(40, bars.trust - 15);
    events.push({ key: "promoted", params: { club: myClub.id } });
  }

  if (goals) events.push({ key: "goals", params: { goals, assists } });
  else if (assists) events.push({ key: "assists", params: { assists } });
  if (level === "first" && matches.length && played.length / matches.length < 0.3) events.push({ key: "benchWarmer" });

  const newTable = sortTable([...table.values()]);
  const pos = newTable.findIndex((r) => r.clubId === myClub.id) + 1;
  events.push({ key: half === 1 ? "halfwayTable" : "finalTable", params: { pos, club: myClub.id } });

  return {
    save: {
      ...save,
      rng: rng.state,
      player,
      bars,
      contract,
      season: { ...season, halvesPlayed: half, matches: [...season.matches, ...matches], table: newTable, highlights: [...season.highlights, ...pickHighlights(highlights)] },
      phase: half === 2 ? "season-end" : "season",
      updatedAt: new Date().toISOString(),
    },
    events,
  };
}

/** Keep the best moments of this half: all goals first, then assists, then chances; max 8. */
function pickHighlights(list: Highlight[]) {
  const order = { goal: 0, assist: 1, save: 2, chance: 3 };
  return [...list].sort((a, b) => order[a.kind] - order[b.kind] || a.round - b.round).slice(0, 8).sort((a, b) => a.round - b.round || a.minute - b.minute);
}

function playMyMatch(
  rng: Rng,
  player: CareerSave["player"],
  bars: CareerSave["bars"],
  myStrength: number,
  opp: WorldClub,
  home: boolean,
  half: 1 | 2,
  round: number,
  highlights: Highlight[],
): MatchResult {
  // Selection: rating vs team level, coach trust, fitness.
  const edge = (player.rating - (myStrength - 2)) * 0.3 + (bars.trust - 50) * 0.05 + (bars.fitness - 80) * 0.03;
  const pStart = 1 / (1 + Math.exp(-edge));
  const started = rng.chance(pStart);
  const subOn = !started && rng.chance(0.55);
  const minutes = started ? (rng.chance(0.25) ? rng.int(60, 85) : 90) : subOn ? rng.int(10, 30) : null;

  // Player quality nudges the team a little when he plays.
  const boost = minutes ? ((player.rating - myStrength) / 11) * (minutes / 90) : 0;
  const gf = poisson(xg(myStrength + boost, opp.teamRating, home), rng);
  const ga = poisson(xg(opp.teamRating, myStrength + boost, !home), rng);

  let goals = 0;
  let assists = 0;
  const moments: { minute: number; kind: Highlight["kind"] }[] = [];
  if (minutes) {
    const quality = clamp(Math.exp((player.rating - myStrength) * 0.06), 0.4, 2.2);
    for (let g = 0; g < gf; g++) {
      const minute = rng.int(1, 90);
      const onPitch = started ? minute <= minutes : minute > 90 - minutes;
      if (!onPitch) continue;
      if (rng.chance(Math.min(0.42, GOAL_SHARE[player.position] * quality * 1.3 + 0.02))) {
        goals++;
        moments.push({ minute, kind: "goal" });
      } else if (rng.chance(Math.min(0.3, ASSIST_SHARE[player.position] * quality * 1.2))) {
        assists++;
        moments.push({ minute, kind: "assist" });
      }
    }
    if (player.position === "GK" && ga <= 1 && rng.chance(0.5)) moments.push({ minute: rng.int(10, 88), kind: "save" });
    if (!moments.length && rng.chance(0.25)) moments.push({ minute: rng.int(5, 88), kind: "chance" });
  }

  // A set piece for you to take (decided later by the player in the UI).
  let setPiece: MatchResult["setPiece"];
  if (minutes && minutes >= 30) {
    const kind: SetPieceKind | null =
      player.position === "GK"
        ? rng.chance(0.07)
          ? "penaltySave"
          : null
        : rng.chance(PENALTY_CHANCE[player.position])
          ? "penalty"
          : rng.chance(FREEKICK_CHANCE[player.position])
            ? "freekick"
            : null;
    if (kind) setPiece = { kind, minute: started ? rng.int(8, Math.min(88, minutes)) : rng.int(92 - minutes, 89), seed: rng.int(1, 2 ** 30) };
  }

  let rating: number | null = null;
  if (minutes) {
    const result = gf > ga ? 0.35 : gf === ga ? 0 : -0.3;
    const cleanSheet = ga === 0 && ["GK", "CB", "LB", "RB", "DM"].includes(player.position) ? 0.5 : 0;
    rating = Math.round(clamp(6.2 + goals * 1 + assists * 0.6 + result + cleanSheet + (player.rating - myStrength) * 0.04 + rng.normal() * 0.45 - (minutes < 30 ? 0.2 : 0), 3, 10) * 10) / 10;
  }

  // Score at each moment, for the 2D overlay.
  for (const mo of moments.sort((a, b) => a.minute - b.minute)) {
    const forBefore = Math.min(gf, Math.round((mo.minute / 90) * gf));
    const againstBefore = Math.min(ga, Math.round((mo.minute / 90) * ga));
    highlights.push({
      id: `h${half}-${round}-${mo.minute}-${rng.int(0, 999)}`,
      half,
      round,
      opponentId: opp.id,
      minute: mo.minute,
      kind: mo.kind,
      seed: rng.int(1, 2 ** 30),
      score: [Math.max(forBefore, mo.kind === "goal" || mo.kind === "assist" ? 1 : 0), againstBefore],
    });
  }

  return { half, round, opponentId: opp.id, home, goalsFor: gf, goalsAgainst: ga, minutes, started, goals, assists, rating, ...(setPiece ? { setPiece } : {}) };
}

const PENALTY_CHANCE: Record<Position, number> = { GK: 0, CB: 0.004, LB: 0.004, RB: 0.004, DM: 0.01, CM: 0.03, AM: 0.06, LW: 0.05, RW: 0.05, ST: 0.08 };
const FREEKICK_CHANCE: Record<Position, number> = { GK: 0, CB: 0.01, LB: 0.03, RB: 0.03, DM: 0.04, CM: 0.07, AM: 0.1, LW: 0.08, RW: 0.08, ST: 0.06 };
