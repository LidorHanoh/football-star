import { attrWeight, DEFAULT_KIT, makeAttrs, overall, roleFor, upgradePlayerFields } from "./attrs";
import { BALANCE } from "./balance";
import { hash, personName } from "./people";
import { clamp, newSeed, Rng } from "./rng";
import type { Agent, Attrs, CareerSave, Level, Offer, Position, World, WorldClub } from "./types";

// ---------------------------------------------------------------------------
// Hidden potential: stored obfuscated, never shown.
// ---------------------------------------------------------------------------
const KEY = 0x5a17;
export const hidePotential = (p: number) => ((p * 131 + KEY) ^ 0x3c3c).toString(36);
export const readPotential = (s: string) => ((parseInt(s, 36) ^ 0x3c3c) - KEY) / 131;

// ---------------------------------------------------------------------------
// New career
// ---------------------------------------------------------------------------
export interface NewPlayerInput {
  name: string;
  nationality: string;
  position: Position;
  foot: "right" | "left";
  kit?: number;
  face?: number;
}

export function createCareer(input: NewPlayerInput, seed = newSeed()): CareerSave {
  const rng = new Rng(seed);
  const { potential, rating } = BALANCE.start;
  const pot = Math.round(clamp(potential.mean + rng.normal() * potential.sd, potential.min, potential.max));
  const start = rng.int(rating[0], rating[1]);
  const attrs = makeAttrs(input.position, start, rng);
  const now = new Date().toISOString();
  return {
    version: 2,
    id: `c${seed.toString(36)}${Date.now().toString(36)}`,
    createdAt: now,
    updatedAt: now,
    rng: rng.state,
    phase: "offers",
    player: {
      name: input.name,
      nationality: input.nationality,
      position: input.position,
      foot: input.foot,
      age: BALANCE.start.age,
      rating: overall(attrs, input.position),
      attrs,
      p: hidePotential(pot),
      trainingPoints: 2,
      kit: clamp(Math.round(input.kit ?? DEFAULT_KIT[input.position]), 1, 99),
      face: input.face ?? rng.int(1, 2 ** 30),
    },
    bars: { ...BALANCE.start.bars },
    contract: null,
    agent: null,
    offers: [],
    agentsOnOffer: [],
    season: null,
    history: [],
    talks: {},
  };
}

// ---------------------------------------------------------------------------
// Wages
// ---------------------------------------------------------------------------
const roundWage = (w: number) => (w >= 10_000 ? Math.round(w / 500) * 500 : w >= 1_000 ? Math.round(w / 50) * 50 : Math.round(w / 10) * 10);

export function youthWage(club: WorldClub, rng: Rng) {
  const o = BALANCE.offers;
  return roundWage(o.youthWageBase * Math.pow(o.youthWageGrowth, club.reputation) * rng.range(0.85, 1.15));
}

export function seniorWage(club: WorldClub, rating: number, rng: Rng) {
  const o = BALANCE.offers;
  return roundWage(o.seniorWageBase * Math.pow(o.seniorWageGrowth, club.reputation) * Math.pow(1.12, rating - 60) * rng.range(0.85, 1.15));
}

// ---------------------------------------------------------------------------
// Start offers: 3 youth-team offers in the chosen league — one big club
// (slower path), one mid-table (steady), one small club (fast track).
// ---------------------------------------------------------------------------
export function startOffers(save: CareerSave, world: World, leagueKey: string | string[]): CareerSave {
  const rng = new Rng(save.rng);
  // Several leagues (a region): the big club comes from the strongest league,
  // the small one from the weakest (e.g. Liga Leumit), the middle one from any.
  const keys = (Array.isArray(leagueKey) ? leagueKey : [leagueKey]).filter((k) => world.clubs.some((c) => c.leagueKey === k));
  const byStrength = [...keys].sort((a, b) => (world.leagues.find((l) => l.key === b)?.strength ?? 0) - (world.leagues.find((l) => l.key === a)?.strength ?? 0));
  const clubsOf = (k: string) => world.clubs.filter((c) => c.leagueKey === k).sort((a, b) => b.reputation - a.reputation);
  const thirds = (k: string) => {
    const clubs = clubsOf(k);
    const third = Math.max(1, Math.floor(clubs.length / 3));
    return [clubs.slice(0, third), clubs.slice(third, third * 2), clubs.slice(third * 2)];
  };
  const big = rng.pick(thirds(byStrength[0])[0]);
  const mid = rng.pick(thirds(rng.pick(byStrength))[1]);
  const small = rng.pick(thirds(byStrength[byStrength.length - 1])[2]);
  const rating = save.player.rating;
  const make = (club: WorldClub, tag: Offer["tag"], trust: number): Offer => ({
    id: `o${club.id.slice(0, 8)}${rng.int(0, 9999)}`,
    clubId: club.id,
    level: "youth",
    years: rng.int(BALANCE.offers.youthYears[0], BALANCE.offers.youthYears[1]),
    wage: youthWage(club, rng),
    trust,
    tag,
    role: offerRole(rating, club, "youth", trust),
  });
  const offers = [make(big, "big", 40), make(mid, "steady", 50), make(small, "fast", 62)];
  return { ...save, rng: rng.state, offers };
}

// ---------------------------------------------------------------------------
// "Ask for more": 50/50. Win → wage +15–30%. Lose → that club trusts you less.
// ---------------------------------------------------------------------------
export function askForMore(save: CareerSave, offerId: string): { save: CareerSave; won: boolean; offer: Offer } {
  const rng = new Rng(save.rng);
  const n = BALANCE.negotiation;
  const won = rng.chance(n.winChance);
  let updated!: Offer;
  const offers = save.offers.map((o) => {
    if (o.id !== offerId || o.negotiated) return o;
    updated = won
      ? { ...o, wage: roundWage(o.wage * (1 + rng.range(n.raise[0], n.raise[1]))), negotiated: "won" }
      : { ...o, trust: Math.max(5, o.trust - n.trustPenalty), negotiated: "lost" };
    return updated;
  });
  return { save: { ...save, rng: rng.state, offers }, won, offer: updated };
}

// ---------------------------------------------------------------------------
// Agents (fictional people). Better agents cost a bigger cut but bring better offers.
// ---------------------------------------------------------------------------

/** Best agent quality (1..5) that will work with a player of this rating. A young player only gets 1★ agents. */
export const agentTierFor = (rating: number) => [5, 4, 3, 2, 1].find((q) => rating >= BALANCE.agents.unlockRating[q])!;
export const agentUnlockRating = (quality: number) => BALANCE.agents.unlockRating[quality];

/** A better agent than the current one now wants to represent you. */
export const betterAgentAvailable = (save: CareerSave) => agentTierFor(save.player.rating) > (save.agent?.quality ?? 1);

export function rollAgents(save: CareerSave): CareerSave {
  const rng = new Rng(save.rng);
  const qualities = [1, 2, 3, 4, 5];
  const agentsOnOffer: Agent[] = qualities.map((quality) => {
    const [lo, hi] = BALANCE.agents.commission[quality];
    const face = rng.int(1, 2 ** 30);
    return { id: `a${quality}${rng.int(100, 999)}`, name: personName(face, save.player.nationality === "Israel" && rng.chance(0.7)), face, quality, commission: rng.int(lo, hi) };
  });
  return { ...save, rng: rng.state, agentsOnOffer };
}

export function hireAgent(save: CareerSave, agentId: string | null): CareerSave {
  const agent = agentId ? (save.agentsOnOffer.find((a) => a.id === agentId && a.quality <= agentTierFor(save.player.rating)) ?? null) : null;
  return { ...save, agent, phase: save.contract ? "season" : save.phase };
}

/** At the end of a season: switch to a better agent who now wants you (or keep yours). Doesn't change the phase. */
export function switchAgent(save: CareerSave, agentId: string | null): CareerSave {
  const agent = agentId ? save.agentsOnOffer.find((a) => a.id === agentId && a.quality <= agentTierFor(save.player.rating)) : undefined;
  return { ...save, agent: agent ?? save.agent, talks: { ...save.talks, newAgent: agent ? agent.id : "kept" } };
}

/** Wage after the agent's commission. */
export const netWage = (wage: number, agent: Agent | null) => Math.round(wage * (1 - (agent?.commission ?? 0) / 100));

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------
export const SEASON_START_YEAR = 2026;

export function signOffer(save: CareerSave, offerId: string, world: World): CareerSave {
  const signed = signOfferRaw(save, offerId, world);
  return signed.phase === "agent" && !signed.agentsOnOffer.length ? rollAgents(signed) : signed;
}

function signOfferRaw(save: CareerSave, offerId: string, world: World): CareerSave {
  const offer = save.offers.find((o) => o.id === offerId);
  if (!offer) return save;
  const club = world.clubs.find((c) => c.id === offer.clubId)!;
  const year = save.season ? save.season.year + (save.season.halvesPlayed === 2 ? 1 : 0) : SEASON_START_YEAR;
  return {
    ...save,
    contract: { clubId: offer.clubId, level: offer.level, wage: offer.wage, until: year + offer.years - 1 },
    bars: { ...save.bars, trust: offer.trust, morale: clamp(save.bars.morale + (offer.negotiated === "won" ? 8 : 0), 0, 100) },
    offers: [],
    phase: save.agent || save.history.length ? "season" : "agent",
    season: newSeason(year, club.leagueKey),
  };
}

export function newSeason(year: number, leagueKey: string) {
  return { year, leagueKey, halvesPlayed: 0 as const, matches: [], table: [], highlights: [] };
}

// ---------------------------------------------------------------------------
// Squad role and strength of the team you'd play in
// ---------------------------------------------------------------------------
/** The youth team is about 12 points weaker than the first team. */
export const teamStrength = (club: WorldClub, level: Level) => (level === "youth" ? club.teamRating - 12 : club.teamRating);

export const offerRole = (rating: number, club: WorldClub, level: Level, trust: number) => roleFor(rating, teamStrength(club, level), trust);

// ---------------------------------------------------------------------------
// Training: spend points on attributes.
// ---------------------------------------------------------------------------
export function canTrain(save: CareerSave, k: keyof Attrs) {
  const p = save.player;
  return p.trainingPoints > 0 && p.attrs[k] < 99;
}

/** One point = +1, but past your natural ceiling every point gives less (points never get stuck). */
export function trainingGain(save: CareerSave) {
  const over = save.player.rating - readPotential(save.player.p);
  return over < 0 ? 1 : over < 3 ? 0.7 : over < 6 ? 0.45 : 0.3;
}

export function train(save: CareerSave, k: keyof Attrs): CareerSave {
  if (!canTrain(save, k)) return save;
  const p = save.player;
  const attrs = { ...p.attrs, [k]: Math.min(99, Math.round((p.attrs[k] + trainingGain(save)) * 10) / 10) };
  return {
    ...save,
    player: { ...p, attrs, rating: overall(attrs, p.position), trainingPoints: p.trainingPoints - 1 },
    bars: { ...save.bars, training: Math.min(100, save.bars.training + 2) },
  };
}

export { attrWeight };

// ---------------------------------------------------------------------------
// Old saves → current shape.
// ---------------------------------------------------------------------------
export function migrateSave(save: CareerSave): CareerSave {
  if ((save as { version: number }).version === 2) return save;
  const seed = hash(save.id);
  const player = upgradePlayerFields(save.player, seed);
  const rating = overall(player.attrs, player.position);
  return {
    ...save,
    version: 2,
    player: { ...player, rating },
    agent: save.agent ? { ...save.agent, face: save.agent.face ?? hash(save.agent.id) } : null,
    agentsOnOffer: save.agentsOnOffer.map((a) => ({ ...a, face: a.face ?? hash(a.id) })),
    offers: save.offers.map((o) => ({ ...o, role: o.role ?? "rotation" })),
  };
}
