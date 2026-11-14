import { growAttrs, overall, roleFor } from "./attrs";
import { afterLeaguePhase, CUP_STAGES, EURO_KO, europeDraw, europeThisSeason, euroPoints, knockoutOpponent, qualification, wonTie } from "./competitions";
import { BALANCE } from "./balance";
import { readPotential } from "./career";
import { clamp, Rng } from "./rng";
import type { Attrs, CareerSave, Comp, EuroComp, Highlight, InjuryKind, KnockoutStage, MatchResult, MatchStats, Position, SetPieceKind, TableRow, World, WorldClub } from "./types";

/** Share of a team's goals / assists a player in this position is involved in (per 90, as a starter). */
const GOAL_SHARE: Record<Position, number> = { GK: 0, CB: 0.04, LB: 0.03, RB: 0.03, DM: 0.04, CM: 0.08, AM: 0.15, LW: 0.17, RW: 0.17, ST: 0.3 };
const ASSIST_SHARE: Record<Position, number> = { GK: 0.01, CB: 0.03, LB: 0.08, RB: 0.08, DM: 0.06, CM: 0.12, AM: 0.18, LW: 0.17, RW: 0.17, ST: 0.12 };

/** Per-90 rates of a starter in each position (an average player for his team level). */
const RATES: Record<Position, { shots: number; keyPasses: number; passes: number; dribbles: number; tackles: number; interceptions: number }> = {
  GK: { shots: 0, keyPasses: 0.05, passes: 28, dribbles: 0, tackles: 0, interceptions: 0.3 },
  CB: { shots: 0.5, keyPasses: 0.3, passes: 55, dribbles: 0.3, tackles: 2.2, interceptions: 1.8 },
  LB: { shots: 0.5, keyPasses: 0.9, passes: 45, dribbles: 1, tackles: 2, interceptions: 1.2 },
  RB: { shots: 0.5, keyPasses: 0.9, passes: 45, dribbles: 1, tackles: 2, interceptions: 1.2 },
  DM: { shots: 0.7, keyPasses: 0.8, passes: 62, dribbles: 0.6, tackles: 2.8, interceptions: 1.9 },
  CM: { shots: 1.2, keyPasses: 1.4, passes: 58, dribbles: 1.4, tackles: 1.8, interceptions: 1 },
  AM: { shots: 2.2, keyPasses: 2.2, passes: 42, dribbles: 2.6, tackles: 0.8, interceptions: 0.4 },
  LW: { shots: 2.2, keyPasses: 1.8, passes: 30, dribbles: 3.6, tackles: 0.7, interceptions: 0.3 },
  RW: { shots: 2.2, keyPasses: 1.8, passes: 30, dribbles: 3.6, tackles: 0.7, interceptions: 0.3 },
  ST: { shots: 3.2, keyPasses: 1, passes: 22, dribbles: 2, tackles: 0.4, interceptions: 0.2 },
};

/**
 * How good an attribute is for the level you play at (1 = average there).
 * This is what makes training matter: +shooting -> more goals, +passing -> more assists.
 */
export const attrEdge = (value: number, teamLevel: number) => clamp(Math.exp((value - teamLevel) * 0.05), 0.35, 2.6);

/** Keeper skill = diving + reflexes (stored in pace / dribbling). */
export const keeperSkill = (a: Attrs) => (a.pace + a.dribbling) / 2;

function binomial(n: number, p: number, rng: Rng) {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng.chance(p)) k++;
  return k;
}

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
  const risk = season.risk ?? 0;

  /** One of your matches: out injured, or played (and maybe injured in it). */
  const myMatch = (strength: number, opp: WorldClub, home: boolean, roundNo: number): MatchResult => {
    const out = (player.injury?.matches ?? 0) > 0;
    const m = playMyMatch(rng, player, bars, strength, opp, home, half, roundNo, highlights, out);
    if (out) {
      const left = player.injury!.matches - 1;
      player.injury = left > 0 ? { ...player.injury!, matches: left } : undefined;
      if (!left) events.push({ key: "recovered" });
      return { ...m, out: true };
    }
    if (m.minutes && rng.chance(injuryChance(bars.fitness, risk) * (m.minutes / 90))) {
      const kind = pickInjury(rng);
      const cfg = BALANCE.injuries.kinds[kind];
      const n = rng.int(cfg.out[0], cfg.out[1]);
      // An injury costs a little pace and strength for good (bigger ones cost more).
      player.attrs = { ...player.attrs, pace: clamp(player.attrs.pace - cfg.damage * rng.range(0.6, 1.4), 1, 99), physical: clamp(player.attrs.physical - cfg.damage * rng.range(0.6, 1.4), 1, 99) };
      player.attrs = { ...player.attrs, pace: Math.round(player.attrs.pace * 10) / 10, physical: Math.round(player.attrs.physical * 10) / 10 };
      player.rating = overall(player.attrs, player.position);
      player.injury = { kind, matches: n };
      bars.form = Math.max(0, bars.form - 8);
      events.push({ key: "injured", params: { kind, n } });
      return { ...m, injured: kind };
    }
    return m;
  };

  // --- Europe & the cup (first team only) ----------------------------------
  let europe = season.europe;
  if (level === "first" && half === 1 && europe === undefined) {
    const comp = europeThisSeason(save, world, myClub);
    europe = comp ? { comp, draw: europeDraw(save, world, myClub, comp) } : null;
  }
  if (level !== "first") europe = europe ?? null;
  const prior = season.matches;
  /** Plays one knockout tie: a draw goes to penalties. */
  const tie = (opp: WorldClub, comp: Comp, stage: KnockoutStage, roundNo: number) => {
    const home = stage === "final" ? false : rng.chance(0.5);
    const m: MatchResult = { ...myMatch(myClub.teamRating, opp, home, roundNo), comp, stage };
    if (m.goalsFor === m.goalsAgainst) m.pens = rng.chance(clamp(0.5 + (myClub.teamRating - opp.teamRating) / 60, 0.2, 0.8)) ? "won" : "lost";
    return m;
  };
  const euroMatches = () => [...prior, ...matches].filter((m) => m.comp === europe?.comp);
  const playEuro = (k: number) => {
    if (!europe) return;
    const done = euroMatches();
    const lp = done.filter((m) => !m.stage).length;
    const roundNo = 100 + done.length + 1;
    if (lp < 6) {
      const opp = world.clubs.find((c) => c.id === europe!.draw[lp]);
      if (opp) matches.push({ ...myMatch(myClub.teamRating, opp, lp % 2 === 0, roundNo), comp: europe.comp });
      return;
    }
    // Knockouts: where are we?
    const ko = done.filter((m) => m.stage);
    let stage: KnockoutStage | null;
    if (!ko.length) stage = afterLeaguePhase(euroPoints(done));
    else stage = wonTie(ko.at(-1)!) && ko.at(-1)!.stage !== "final" ? EURO_KO[EURO_KO.indexOf(ko.at(-1)!.stage!) + 1] : null;
    if (!stage || k < 0) return;
    const opp = knockoutOpponent(rng, world, myClub, europe.comp, stage, [...europe.draw, ...ko.map((m) => m.opponentId)]);
    matches.push(tie(opp, europe.comp, stage, roundNo));
  };
  const playCup = () => {
    const ko = [...prior, ...matches].filter((m) => m.comp === "cup");
    const last = ko.at(-1);
    if (last && (!wonTie(last) || last.stage === "final")) return;
    const stage = CUP_STAGES[ko.length];
    if (!stage) return;
    const opp = knockoutOpponent(rng, world, myClub, "cup", stage, ko.map((m) => m.opponentId));
    matches.push(tie(opp, "cup", stage, 200 + ko.length + 1));
  };
  // When each fixture comes up during the half (as a fraction of it).
  type Slot = { f: number; play: () => void };
  const slots: Slot[] = [];
  if (level === "first") {
    const euroAt = half === 1 ? [0.18, 0.5, 0.82] : [0.07, 0.19, 0.31, 0.45, 0.58, 0.7, 0.82, 0.96];
    if (europe) euroAt.forEach((f, k) => slots.push({ f, play: () => playEuro(k) }));
    if (half === 2) [0.25, 0.52, 0.76, 0.99].forEach((f) => slots.push({ f, play: playCup }));
  }

  // --- League fixtures (always simulated, so the table is real) ------------
  rounds.forEach((pairs, r) => slots.push({ f: (r + 0.5) / rounds.length, play: () => leagueRound(pairs, r) }));
  slots.sort((a, b) => a.f - b.f).forEach((s) => s.play());

  function leagueRound(pairs: [number, number][], r: number) {
    const roundNo = half === 1 ? r + 1 : rounds.length + r + 1;
    for (const [hi, ai] of pairs) {
      const [home, away] = half === 1 ? [clubs[hi], clubs[ai]] : [clubs[ai], clubs[hi]];
      const isMine = level === "first" && (home.id === myClub.id || away.id === myClub.id);
      if (isMine) {
        const opp = home.id === myClub.id ? away : home;
        const m = myMatch(myClub.teamRating, opp, home.id === myClub.id, roundNo);
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
  }

  // --- Youth team: U19 matches against the youth sides of league rivals ----
  if (level === "youth") {
    const opponents = rng.shuffle(clubs.filter((c) => c.id !== myClub.id)).slice(0, BALANCE.season.youthMatchesPerHalf);
    opponents.forEach((opp, i) => {
      const youthOpp = { ...opp, teamRating: opp.teamRating - 12 };
      matches.push(myMatch(myStrength, youthOpp, i % 2 === 0, i + 1));
    });
  }

  // --- Growth (hidden potential decides speed and ceiling) -----------------
  const played = matches.filter((m) => m.minutes);
  const ratings = played.map((m) => m.rating!).filter(Boolean);
  const roleBefore = roleFor(save.player.rating, myStrength, save.bars.trust);
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

  // Training points: earned by training well, playing — and playing WELL.
  const formBonus = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length - 6.6) * 2.2 : -0.6;
  const points = Math.max(0, Math.round(0.3 + bars.training / 55 + minutesShare * 1.1 + formBonus));
  player.trainingPoints += points;
  if (points) events.push({ key: "trainingPoints", params: { n: points } });

  // --- Bars -----------------------------------------------------------------
  const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;
  const goals = matches.reduce((s, m) => s + m.goals, 0);
  const assists = matches.reduce((s, m) => s + m.assists, 0);
  bars.form = Math.round(clamp(avg === null ? bars.form - 10 : 50 + (avg - 6.5) * 40, 0, 100));
  bars.trust = Math.round(clamp(bars.trust + (avg === null ? -3 : (avg - 6.6) * 12) + goals * 1.5, 0, 100));
  bars.fitness = Math.round(clamp(100 - minutesShare * 25 - rng.int(0, 8), 40, 100));
  bars.fans = Math.round(clamp(bars.fans + goals * 2 + assists - (avg !== null && avg < 6 ? 3 : 0), 0, 100));
  bars.training = Math.round(clamp(bars.training + rng.int(-4, 6), 0, 100));
  // Playing together builds chemistry; sitting out slowly loses it.
  bars.chemistry = Math.round(clamp((bars.chemistry ?? 50) + minutesShare * 8 - 3, 0, 100));

  // --- Your place in the squad changed? The manager tells you. --------------
  const roleAfter = roleFor(player.rating, myStrength, bars.trust);
  const ORDER = ["bench", "rotation", "starter", "star"];
  if (ORDER.indexOf(roleAfter) < ORDER.indexOf(roleBefore)) events.push({ key: "roleDown", params: { from: roleBefore, to: roleAfter } });
  else if (ORDER.indexOf(roleAfter) > ORDER.indexOf(roleBefore)) events.push({ key: "roleUp", params: { from: roleBefore, to: roleAfter } });

  // --- Youth → first team promotion ----------------------------------------
  let contract = save.contract;
  if (level === "youth" && canPromote(player.rating, player.age, myClub.teamRating, bars.trust)) {
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
  // Where the league finish takes the club next season.
  let qualified: EuroComp | null | undefined;
  if (half === 2) {
    qualified = qualification(world, season.leagueKey, newTable, myClub.id);
    if (qualified && level === "first") events.push({ key: qualified === "cl" ? "qualifiedCl" : "qualifiedEl" });
  }

  return {
    save: {
      ...save,
      rng: rng.state,
      player,
      bars,
      contract,
      season: { ...season, halvesPlayed: half, matches: [...season.matches, ...matches], table: newTable, highlights: [...season.highlights, ...pickHighlights(highlights)], risk: 0, europe: europe ?? null, ...(half === 2 ? { qualified: qualified ?? null } : {}) },
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
  unavailable = false,
): MatchResult {
  // Selection: rating vs team level, coach trust, fitness, how well you click with the team.
  const chem = bars.chemistry ?? 50;
  const edge = (player.rating - (myStrength - 2)) * 0.3 + (bars.trust - 50) * 0.05 + (bars.fitness - 80) * 0.03 + (chem - 50) * 0.02;
  const pStart = 1 / (1 + Math.exp(-edge));
  const started = !unavailable && rng.chance(pStart);
  const subOn = !unavailable && !started && rng.chance(0.55);
  const minutes = started ? (rng.chance(0.25) ? rng.int(60, 85) : 90) : subOn ? rng.int(10, 30) : null;

  // Player quality nudges the team a little when he plays.
  const a = player.attrs;
  const pos = player.position;
  const share = minutes ? minutes / 90 : 0;
  const boost = minutes ? ((player.rating - myStrength) / 11) * share : 0;
  // A strong keeper / defender keeps more out.
  const wall = pos === "GK" ? attrEdge(keeperSkill(a), myStrength) ** 0.3 : ["CB", "LB", "RB", "DM"].includes(pos) ? attrEdge(a.defending, myStrength) ** 0.12 : 1;
  const gf = poisson(xg(myStrength + boost, opp.teamRating, home), rng);
  const oppXg = xg(opp.teamRating, myStrength + boost, !home) / (1 + (wall - 1) * share);
  const ga = poisson(oppXg, rng);

  let goals = 0;
  let assists = 0;
  const moments: { minute: number; kind: Highlight["kind"] }[] = [];
  if (minutes) {
    const quality = clamp(Math.exp((player.rating - myStrength) * 0.06), 0.4, 2.2);
    // Finishing comes from shooting; creating from passing (and a bit of dribbling).
    const goalQ = quality ** 0.35 * attrEdge(a.shooting, myStrength) ** 0.9 * attrEdge(a.pace, myStrength) ** 0.15;
    const assistQ = quality ** 0.35 * attrEdge(a.passing, myStrength) ** 0.8 * attrEdge(a.dribbling, myStrength) ** 0.25 * (0.85 + chem * 0.003);
    for (let g = 0; g < gf; g++) {
      const minute = rng.int(1, 90);
      const onPitch = started ? minute <= minutes : minute > 90 - minutes;
      if (!onPitch) continue;
      if (rng.chance(Math.min(0.5, GOAL_SHARE[pos] * goalQ * 1.3 + 0.02))) {
        goals++;
        moments.push({ minute, kind: "goal" });
      } else if (rng.chance(Math.min(0.38, ASSIST_SHARE[pos] * assistQ * 1.2))) {
        assists++;
        moments.push({ minute, kind: "assist" });
      }
    }
    if (player.position === "GK" && ga <= 1 && rng.chance(0.5)) moments.push({ minute: rng.int(10, 88), kind: "save" });
    if (!moments.length && rng.chance(0.25)) moments.push({ minute: rng.int(5, 88), kind: "chance" });
  }
  const stats = minutes ? matchStats(rng, a, pos, myStrength, share, goals, assists, ga, oppXg) : undefined;

  // A set piece for you to take (decided later by the player in the UI).
  let setPiece: MatchResult["setPiece"];
  if (minutes && minutes >= 30) {
    const kind: SetPieceKind | null =
      player.position === "GK"
        ? rng.chance(0.07)
          ? "penaltySave"
          : null
        : rng.chance(PENALTY_CHANCE[player.position] * clamp(0.6 + (a.shooting - 50) / 50, 0.5, 1.8))
          ? "penalty"
          : null;
    if (kind) setPiece = { kind, minute: started ? rng.int(8, Math.min(88, minutes)) : rng.int(92 - minutes, 89), seed: rng.int(1, 2 ** 30) };
  }

  let rating: number | null = null;
  if (minutes) {
    const result = gf > ga ? 0.35 : gf === ga ? 0 : -0.3;
    const cleanSheet = ga === 0 && ["GK", "CB", "LB", "RB", "DM"].includes(player.position) ? 0.5 : 0;
    const st = stats!;
    const work = Math.min(1.1, (st.keyPasses - assists) * 0.12 + st.dribblesWon * 0.06 + (st.tackles + st.interceptions) * 0.05 + st.saves * 0.12 + (st.passes ? (st.passesDone / st.passes - 0.78) * 1.2 : 0));
    rating = Math.round(clamp(6.0 + goals * 1 + assists * 0.6 + result + cleanSheet + work + (player.rating - myStrength) * 0.03 + rng.normal() * 0.4 - (minutes < 30 ? 0.2 : 0), 3, 10) * 10) / 10;
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

  return { half, round, opponentId: opp.id, home, goalsFor: gf, goalsAgainst: ga, minutes, started, goals, assists, rating, ...(setPiece ? { setPiece } : {}), ...(stats ? { stats } : {}) };
}

/** Your numbers in one match. Each one is pushed by the matching attribute. */
function matchStats(rng: Rng, a: Attrs, pos: Position, level: number, share: number, goals: number, assists: number, ga: number, oppXg: number): MatchStats {
  const r = RATES[pos];
  const e = (v: number, pow: number) => attrEdge(v, level) ** pow;
  const shots = goals + poisson(r.shots * share * e(a.shooting, 0.5), rng);
  const onTarget = goals + binomial(shots - goals, clamp(0.22 + (a.shooting - 50) / 250, 0.12, 0.45), rng);
  const passes = poisson(r.passes * share * (0.85 + e(a.passing, 0.3) * 0.15), rng);
  const passesDone = binomial(passes, clamp(0.62 + (a.passing - 50) * 0.006, 0.5, 0.95), rng);
  const dribbles = poisson(r.dribbles * share * e(a.dribbling, 0.6) * e(a.pace, 0.2), rng);
  const dribblesWon = binomial(dribbles, clamp(0.35 + (a.dribbling - 50) * 0.008, 0.2, 0.85), rng);
  const defQ = e(a.defending, 0.5) * e(a.physical, 0.15);
  const saves = pos === "GK" ? poisson(oppXg * 1.5 * share * e(keeperSkill(a), 0.5), rng) : 0;
  return {
    shots,
    onTarget,
    keyPasses: assists + poisson(r.keyPasses * share * e(a.passing, 0.8), rng),
    passes,
    passesDone,
    dribbles,
    dribblesWon,
    tackles: poisson(r.tackles * share * defQ, rng),
    interceptions: poisson(r.interceptions * share * defQ, rng),
    saves,
    cleanSheet: ga === 0 && share >= 0.66 ? 1 : 0,
  };
}

/** Rating a youth player needs for a first-team call-up (younger talents get called up a bit earlier). */
export const promotionRating = (age: number, teamRating: number) => Math.round(teamRating - BALANCE.promotion.gapToFirstTeam - Math.max(0, 19 - age) * 1.5);
export const canPromote = (rating: number, age: number, teamRating: number, trust: number) => rating >= promotionRating(age, teamRating) && trust >= BALANCE.promotion.minTrust;

/** Chance of getting injured in a full match. */
export const injuryChance = (fitness: number, risk = 0) => BALANCE.injuries.base + Math.max(0, 100 - fitness) * BALANCE.injuries.lowFitness + risk;

function pickInjury(rng: Rng): InjuryKind {
  const kinds = Object.entries(BALANCE.injuries.kinds);
  let roll = rng.range(0, kinds.reduce((s, [, k]) => s + k.weight, 0));
  for (const [kind, k] of kinds) {
    roll -= k.weight;
    if (roll <= 0) return kind as InjuryKind;
  }
  return "knock";
}

/** Chance per match (≥30 min played) that you step up for a penalty. */
const PENALTY_CHANCE: Record<Position, number> = { GK: 0, CB: 0.012, LB: 0.015, RB: 0.015, DM: 0.03, CM: 0.06, AM: 0.1, LW: 0.09, RW: 0.09, ST: 0.13 };
