import { BALANCE } from "./balance";
import { newSeason, seniorWage, youthWage } from "./career";
import { clamp, Rng } from "./rng";
import { sortTable } from "./season";
import type { CareerSave, Offer, SeasonSummary, World, WorldClub } from "./types";

export function seasonSummary(save: CareerSave): SeasonSummary {
  const s = save.season!;
  const played = s.matches.filter((m) => m.minutes);
  const ratings = played.map((m) => m.rating!).filter(Boolean);
  const pos = sortTable(s.table).findIndex((r) => r.clubId === save.contract!.clubId);
  return {
    year: s.year,
    clubId: save.contract!.clubId,
    level: save.contract!.level,
    apps: played.length,
    goals: s.matches.reduce((t, m) => t + m.goals, 0),
    assists: s.matches.reduce((t, m) => t + m.assists, 0),
    avgRating: ratings.length ? Math.round((ratings.reduce((t, r) => t + r, 0) / ratings.length) * 100) / 100 : null,
    ratingEnd: save.player.rating,
    leaguePosition: pos >= 0 ? pos + 1 : null,
  };
}

// ---------------------------------------------------------------------------
// Talk with the manager
// ---------------------------------------------------------------------------
export type ManagerChoice = "moreMinutes" | "workHarder" | "wantToLeave";

/** What the manager says depends on your season; your reply moves trust / training / morale. */
export function managerMood(save: CareerSave): "happy" | "neutral" | "unhappy" {
  const s = seasonSummary(save);
  if (s.avgRating === null || s.apps < 5) return "unhappy";
  if (s.avgRating >= 6.9 || save.bars.trust >= 70) return "happy";
  if (s.avgRating < 6.3) return "unhappy";
  return "neutral";
}

export function answerManager(save: CareerSave, choice: ManagerChoice): CareerSave {
  const mood = managerMood(save);
  const bars = { ...save.bars };
  if (choice === "moreMinutes") {
    bars.trust += mood === "happy" ? 8 : mood === "neutral" ? 2 : -6;
    bars.morale += mood === "unhappy" ? -4 : 5;
  } else if (choice === "workHarder") {
    bars.training += 12;
    bars.trust += 4;
  } else {
    bars.trust -= 12;
    bars.morale += 3;
  }
  for (const k of Object.keys(bars) as (keyof typeof bars)[]) bars[k] = Math.round(clamp(bars[k], 0, 100));
  return { ...save, bars, talks: { ...save.talks, manager: choice } };
}

// ---------------------------------------------------------------------------
// Talk with the agent: renewal (or not) + offers based on this season
// ---------------------------------------------------------------------------
export interface AgentReport {
  contractExpired: boolean;
  renewal: Offer | null;
  /** Club let you go (contract ended and they don't need you, or too old for the youth team). */
  released: boolean;
  offers: Offer[];
}

function clubOf(world: World, id: string) {
  return world.clubs.find((c) => c.id === id)!;
}

export function agentReport(save: CareerSave, world: World): { save: CareerSave; report: AgentReport } {
  const rng = new Rng(save.rng);
  const summary = seasonSummary(save);
  const contract = save.contract!;
  const myClub = clubOf(world, contract.clubId);
  const rating = save.player.rating;
  const nextAge = save.player.age + 1;
  const goodSeason = (summary.avgRating ?? 0) >= 6.8 || summary.goals >= 10;
  const contractExpired = contract.until <= summary.year;
  const tooOldForYouth = contract.level === "youth" && nextAge >= 19;

  // Does the club want you?
  const valued = rating >= myClub.teamRating - (contract.level === "youth" ? 10 : 5) && save.bars.trust >= 35;
  let renewal: Offer | null = null;
  let released = false;
  if (contractExpired || tooOldForYouth) {
    if (valued || (contract.level === "youth" && !tooOldForYouth && save.bars.trust >= 45)) {
      const level = tooOldForYouth || rating >= myClub.teamRating - 8 ? "first" : contract.level;
      renewal = {
        id: `r${rng.int(1000, 9999)}`,
        clubId: myClub.id,
        level,
        years: rng.int(2, 4),
        wage: level === "first" ? seniorWage(myClub, rating, rng) : youthWage(myClub, rng),
        trust: clamp(save.bars.trust + 5, 0, 100),
        tag: "renew",
      };
    } else released = true;
  }

  // Offers from other clubs. Count and reach depend on the agent and the season.
  const q = save.agent?.quality ?? 0;
  const count = clamp(1 + BALANCE.agents.extraOffers[q] + (goodSeason ? 1 : 0) + (released ? 1 : 0) + (save.talks.manager === "wantToLeave" ? 1 : 0), 1, 5);
  const reach = BALANCE.agents.reputationReach[q];
  const playerLevel = rating; // a club is interested if you'd fit their squad
  const candidates = world.clubs
    .filter((c) => c.id !== myClub.id)
    .filter((c) => c.teamRating >= playerLevel - 10 && c.teamRating <= playerLevel + 3 + reach / 2)
    // Abroad only once you're good enough (or with a strong agent).
    .filter((c) => c.leagueKey === myClub.leagueKey || rating >= 66 - q * 2);
  // Safety net: someone always wants you — the weakest clubs in your league.
  if (!candidates.length) {
    candidates.push(...world.clubs.filter((c) => c.leagueKey === myClub.leagueKey && c.id !== myClub.id).sort((a, b) => a.teamRating - b.teamRating).slice(0, 4));
  }
  rng.shuffle(candidates);
  // Prefer the strongest clubs that would still give minutes.
  candidates.sort((a, b) => Math.abs(a.teamRating - (playerLevel + reach / 4)) - Math.abs(b.teamRating - (playerLevel + reach / 4)));
  const offers: Offer[] = candidates.slice(0, count).map((club: WorldClub) => {
    const level = nextAge < 19 && club.teamRating > rating + 8 ? "youth" : "first";
    const wage = level === "first" ? seniorWage(club, rating, rng) : youthWage(club, rng);
    return {
      id: `t${club.id.slice(0, 6)}${rng.int(100, 999)}`,
      clubId: club.id,
      level,
      years: rng.int(2, 4),
      wage: Math.round(wage * BALANCE.agents.wageBoost[q]),
      trust: clamp(45 + (rating - club.teamRating) * 3, 15, 80),
      tag: "transfer",
    };
  });

  return { save: { ...save, rng: rng.state, offers: [...(renewal ? [renewal] : []), ...offers] }, report: { contractExpired, renewal, released, offers } };
}

// ---------------------------------------------------------------------------
// Next season: stay (if still under contract) or sign one of the offers.
// ---------------------------------------------------------------------------
export function startNextSeason(save: CareerSave, world: World, offerId: string | null): CareerSave {
  const summary = seasonSummary(save);
  const year = summary.year + 1;
  let contract = save.contract!;
  let trust = save.bars.trust;
  if (offerId) {
    const offer = save.offers.find((o) => o.id === offerId)!;
    contract = { clubId: offer.clubId, level: offer.level, wage: offer.wage, until: year + offer.years - 1 };
    trust = offer.trust;
  } else if (contract.until < year) {
    return save; // must choose an offer: contract over
  }
  const club = clubOf(world, contract.clubId);
  return {
    ...save,
    phase: "season",
    player: { ...save.player, age: save.player.age + 1 },
    contract,
    bars: { ...save.bars, trust, fitness: 95, form: Math.round((save.bars.form + 50) / 2) },
    offers: [],
    history: [...save.history, summary],
    season: newSeason(year, club.leagueKey),
    talks: {},
    updatedAt: new Date().toISOString(),
  };
}

export const mustRetire = (save: CareerSave) => save.player.age + 1 >= BALANCE.retirementAge;
