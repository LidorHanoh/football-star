import { BALANCE } from "./balance";
import type { CareerSave, Offer, Role, World } from "./types";

/**
 * What your agent thinks of an offer. Better agents read the market better:
 * they explain more, and they win more "ask for more" talks.
 */
export type Verdict = "sign" | "askMore" | "maybe" | "avoid";
export type Reason = "minutes" | "bench" | "rotation" | "stepUp" | "stepDown" | "wageLow" | "wageGood" | "firstTeam" | "loyalty" | "abroad";

export interface Advice {
  verdict: Verdict;
  reasons: Reason[];
  /** The agent's favourite of all the offers on the table. */
  best: boolean;
  score: number;
}

const ROLE_SCORE: Record<Role, number> = { star: 2, starter: 1.5, rotation: 0, bench: -2 };

/** What a club like this would normally pay a player like you (no luck involved). */
export function fairWage(world: World, offer: Offer, rating: number) {
  const club = world.clubs.find((c) => c.id === offer.clubId)!;
  const o = BALANCE.offers;
  if (offer.level === "youth") return o.youthWageBase * Math.pow(o.youthWageGrowth, club.reputation);
  return o.seniorWageBase * Math.pow(o.seniorWageGrowth, club.reputation) * Math.pow(1.12, rating - 60);
}

/** Chance that asking for more works: 40% alone, up to 65% with a 5★ agent. */
export const askMoreChance = (agentQuality: number) => Math.min(0.65, BALANCE.negotiation.winChance - 0.1 + agentQuality * 0.05);

function scoreOffer(save: CareerSave, world: World, offer: Offer) {
  const reasons: Reason[] = [];
  let score = ROLE_SCORE[offer.role];
  reasons.push(offer.role === "bench" ? "bench" : offer.role === "rotation" ? "rotation" : "minutes");
  const club = world.clubs.find((c) => c.id === offer.clubId)!;
  const mine = save.contract ? world.clubs.find((c) => c.id === save.contract!.clubId) : undefined;
  if (mine && offer.clubId !== mine.id) {
    const diff = club.teamRating - mine.teamRating;
    if (diff >= 3) {
      score += 1;
      reasons.push("stepUp");
    } else if (diff <= -4) {
      score -= 0.8;
      reasons.push("stepDown");
    }
    const country = (key: string) => world.leagues.find((l) => l.key === key)?.country;
    if (country(club.leagueKey) !== country(mine.leagueKey)) reasons.push("abroad");
  }
  if (offer.tag === "renew") {
    score += 0.4;
    reasons.push("loyalty");
  }
  if (save.contract?.level === "youth" && offer.level === "first") {
    score += 0.8;
    reasons.push("firstTeam");
  }
  const ratio = offer.wage / fairWage(world, offer, save.player.rating);
  if (ratio < 0.95) reasons.push("wageLow");
  else if (ratio > 1.08) {
    score += 0.4;
    reasons.push("wageGood");
  }
  return { score, reasons, ratio };
}

export function agentAdvice(save: CareerSave, world: World, offer: Offer): Advice | null {
  const agent = save.agent;
  if (!agent) return null;
  const all = save.offers.map((o) => ({ id: o.id, ...scoreOffer(save, world, o) }));
  const me = all.find((a) => a.id === offer.id) ?? { id: offer.id, ...scoreOffer(save, world, offer) };
  const bestScore = Math.max(...all.map((a) => a.score));
  // Worth pushing for more: underpaid, they like you enough, and the agent can pull it off.
  const push = !offer.negotiated && me.ratio < 0.95 && offer.trust >= 35 && askMoreChance(agent.quality) >= 0.45 && me.score >= 0;
  const verdict: Verdict = me.score <= -1 ? "avoid" : push ? "askMore" : me.score >= 1.4 ? "sign" : "maybe";
  // A 1★ agent gives you the headline; 3★+ explain the whole picture.
  const shown = agent.quality <= 1 ? 1 : agent.quality <= 2 ? 2 : 4;
  return { verdict, reasons: me.reasons.slice(0, shown), best: all.length > 1 && me.score === bestScore && verdict !== "avoid", score: me.score };
}

export interface AgentSummary {
  /** The offer to take, or null = stay where you are. */
  pick: Offer | null;
  reasons: Reason[];
  /** Push for more money on the pick first. */
  askMore: boolean;
  /** Nothing on the table is worth it. */
  nothingGood: boolean;
}

/** One message from the agent: which way to go and whether to ask for more. */
export function agentSummary(save: CareerSave, world: World, canStay: boolean): AgentSummary | null {
  if (!save.agent || !save.offers.length) return null;
  const rated = save.offers.map((o) => ({ o, a: agentAdvice(save, world, o)! }));
  rated.sort((x, y) => y.a.score - x.a.score);
  const top = rated[0];
  // Staying is worth about what a starter role at your own club is worth.
  const club = world.clubs.find((c) => c.id === save.contract?.clubId);
  const stayRole: Role | null = club && save.contract ? (save.player.rating >= club.teamRating ? "starter" : save.player.rating >= club.teamRating - 4 ? "rotation" : "bench") : null;
  const stayScore = stayRole ? ROLE_SCORE[stayRole] + 0.3 : -9;
  if (canStay && stayScore >= top.a.score) return { pick: null, reasons: [], askMore: false, nothingGood: false };
  return { pick: top.o, reasons: top.a.reasons, askMore: top.a.verdict === "askMore", nothingGood: top.a.verdict === "avoid" };
}
