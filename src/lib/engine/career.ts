import { BALANCE } from "./balance";
import { clamp, newSeed, Rng } from "./rng";
import type { Agent, CareerSave, Offer, Position, World, WorldClub } from "./types";

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
}

export function createCareer(input: NewPlayerInput, seed = newSeed()): CareerSave {
  const rng = new Rng(seed);
  const { potential, rating } = BALANCE.start;
  const pot = Math.round(clamp(potential.mean + rng.normal() * potential.sd, potential.min, potential.max));
  const now = new Date().toISOString();
  return {
    version: 1,
    id: `c${seed.toString(36)}${Date.now().toString(36)}`,
    createdAt: now,
    updatedAt: now,
    rng: rng.state,
    phase: "offers",
    player: { ...input, age: BALANCE.start.age, rating: rng.int(rating[0], rating[1]), p: hidePotential(pot), trainingPoints: 0 },
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
export function startOffers(save: CareerSave, world: World, leagueKey: string): CareerSave {
  const rng = new Rng(save.rng);
  const clubs = world.clubs.filter((c) => c.leagueKey === leagueKey).sort((a, b) => b.reputation - a.reputation);
  const third = Math.max(1, Math.floor(clubs.length / 3));
  const big = rng.pick(clubs.slice(0, third));
  const mid = rng.pick(clubs.slice(third, third * 2));
  const small = rng.pick(clubs.slice(third * 2));
  const make = (club: WorldClub, tag: Offer["tag"], trust: number): Offer => ({
    id: `o${club.id.slice(0, 8)}${rng.int(0, 9999)}`,
    clubId: club.id,
    level: "youth",
    years: rng.int(BALANCE.offers.youthYears[0], BALANCE.offers.youthYears[1]),
    wage: youthWage(club, rng),
    trust,
    tag,
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
const FIRST = ["Avi", "Moshe", "Dani", "Eli", "Yossi", "Marco", "Carlos", "Jorge", "Luca", "Pierre", "Tom", "Max", "Ibrahim", "Nikos", "Sven"];
const LAST = ["Levi", "Cohen", "Mizrahi", "Rossi", "Silva", "Mendes", "Dupont", "Becker", "Novak", "Khalil", "Andersen", "Kaplan", "Ferreira", "Bauer", "Haddad"];

export function rollAgents(save: CareerSave): CareerSave {
  const rng = new Rng(save.rng);
  const qualities = [1, 2, 3, 4, 5];
  const agentsOnOffer: Agent[] = qualities.map((quality) => {
    const [lo, hi] = BALANCE.agents.commission[quality];
    return { id: `a${quality}${rng.int(100, 999)}`, name: `${rng.pick(FIRST)} ${rng.pick(LAST)}`, quality, commission: rng.int(lo, hi) };
  });
  return { ...save, rng: rng.state, agentsOnOffer };
}

export function hireAgent(save: CareerSave, agentId: string | null): CareerSave {
  const agent = agentId ? (save.agentsOnOffer.find((a) => a.id === agentId) ?? null) : null;
  return { ...save, agent, phase: save.contract ? "season" : save.phase };
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
