import { BALANCE } from "./balance";
import { isLeague, runOf } from "./competitions";
import { intlTotals } from "./international";
import { askedToLeave } from "./office";
import { newSeason, offerRole, readPotential, seniorWage, youthWage } from "./career";
import { clamp, Rng } from "./rng";
import { sortTable } from "./season";
import { seasonTrophies, sumMatchStats } from "./stats";
import type { CareerSave, Offer, SeasonSummary, World, WorldClub } from "./types";

export function seasonSummary(save: CareerSave): SeasonSummary {
  const s = save.season!;
  const played = s.matches.filter((m) => m.minutes);
  const ratings = played.map((m) => m.rating!).filter(Boolean);
  const pos = sortTable(s.table).findIndex((r) => r.clubId === save.contract!.clubId);
  const { total, apps: statApps } = sumMatchStats(s.matches);
  const goals = s.matches.reduce((t, m) => t + m.goals, 0);
  const assists = s.matches.reduce((t, m) => t + m.assists, 0);
  const avgRating = ratings.length ? Math.round((ratings.reduce((t, r) => t + r, 0) / ratings.length) * 100) / 100 : null;
  const leaguePosition = pos >= 0 ? pos + 1 : null;
  const level = save.contract!.level;
  const league = s.matches.filter(isLeague);
  const cup = runOf(s.matches, "cup");
  const euro = s.europe ? runOf(s.matches, s.europe.comp) : null;
  const trophies = seasonTrophies({ level, position: save.player.position, leaguePosition, matches: league, apps: league.filter((m) => m.minutes).length, goals: league.reduce((t, m) => t + m.goals, 0), assists: league.reduce((t, m) => t + m.assists, 0), avgRating, cleanSheets: total.cleanSheet });
  if (cup.won) trophies.unshift("cup");
  if (euro?.won && s.europe) trophies.unshift(s.europe.comp);
  const tour = s.tournament;
  if (tour?.won && tour.picked) trophies.unshift(tour.comp);
  return {
    year: s.year,
    clubId: save.contract!.clubId,
    level,
    apps: played.length,
    goals,
    assists,
    avgRating,
    ratingEnd: save.player.rating,
    leaguePosition,
    stats: total,
    statApps,
    trophies,
    qualified: level === "first" ? (s.qualified ?? null) : null,
    cup: cup.last && cup.last !== "league" ? cup.last : null,
    europe: s.europe && euro?.last ? { comp: s.europe.comp, last: euro.last } : null,
    intl: intlTotals(s.intl, tour),
    tournament: tour?.qualified ? { comp: tour.comp, last: tour.last, won: tour.won, picked: tour.picked } : null,
  };
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
        role: offerRole(rating, myClub, level, clamp(save.bars.trust + 5, 0, 100)),
      };
    } else released = true;
  }

  // Offers from other clubs. Count and reach depend on the agent and the season.
  const q = save.agent?.quality ?? 0;
  const count = clamp(1 + BALANCE.agents.extraOffers[q] + (goodSeason ? 1 : 0) + (released ? 1 : 0) + (askedToLeave(save) ? 1 : 0), 1, 5);
  const reach = BALANCE.agents.reputationReach[q];
  let talent: WorldClub | undefined;
  const countryOf = (key: string) => world.leagues.find((l) => l.key === key)?.country;
  const tierOf = (key: string) => world.leagues.find((l) => l.key === key)?.tier ?? 1;
  const myCountry = countryOf(myClub.leagueKey);
  const strong = (summary.avgRating ?? 0) >= 7 || summary.goals + summary.assists >= 12;
  // How far above your current club a team may be and still want you:
  // only really good players (rating near their level) after a strong season get a step up.
  const stepUp = strong && rating >= myClub.teamRating ? 3 + reach / 4 : rating >= myClub.teamRating - 2 ? 1 : -1;
  const fits = (c: WorldClub) => c.teamRating <= Math.max(rating + 1, myClub.teamRating + stepUp) && c.teamRating >= Math.min(rating, myClub.teamRating) - 10;
  const others = world.clubs.filter((c) => c.id !== myClub.id && fits(c));
  // Mostly your own division, then your country, and abroad only when you're very good.
  const sameLeague = others.filter((c) => c.leagueKey === myClub.leagueKey);
  const sameCountry = others.filter((c) => c.leagueKey !== myClub.leagueKey && countryOf(c.leagueKey) === myCountry && Math.abs(tierOf(c.leagueKey) - tierOf(myClub.leagueKey)) <= 1);
  const abroadOk = rating >= 72 - q && (strong || rating >= 76);
  const abroad = abroadOk ? others.filter((c) => countryOf(c.leagueKey) !== myCountry && c.teamRating <= rating + 1) : [];
  rng.shuffle(sameLeague);
  rng.shuffle(sameCountry);
  rng.shuffle(abroad);
  const candidates: WorldClub[] = [];
  const add = (list: WorldClub[], n: number) => {
    for (const c of list) {
      if (n <= 0 || candidates.length >= count) break;
      if (!candidates.includes(c)) {
        candidates.push(c);
        n--;
      }
    }
  };
  add(abroad, rng.chance(0.5) ? 1 : 0);
  add(sameLeague, Math.max(1, count - 1));
  add(sameCountry, count);
  add(sameLeague, count);
  // Safety net: someone always wants you — the weakest clubs in your league (or the division below).
  if (!candidates.length) {
    add(world.clubs.filter((c) => c.leagueKey === myClub.leagueKey && c.id !== myClub.id).sort((a, b) => a.teamRating - b.teamRating), 2);
  }
  // Elite talent: a big club takes a chance on a young player with huge potential.
  const pot = readPotential(save.player.p);
  if (nextAge <= 21 && pot >= 84 && (summary.avgRating ?? 0) >= 6.8 && rng.chance(0.45)) {
    const big = world.clubs
      .filter((c) => c.id !== myClub.id && !candidates.includes(c) && c.teamRating >= myClub.teamRating + 6 && (countryOf(c.leagueKey) === myCountry || rating >= 64))
      .sort((a, b) => b.teamRating - a.teamRating)
      .slice(0, 6);
    if (big.length) talent = rng.pick(big);
  }
  const offers: Offer[] = candidates.slice(0, count).map((club: WorldClub) => {
    const level = nextAge < 19 && club.teamRating > rating + 8 ? "youth" : "first";
    const wage = level === "first" ? seniorWage(club, rating, rng) : youthWage(club, rng);
    const trust = clamp(45 + (rating - club.teamRating) * 3, 15, 80);
    return {
      id: `t${club.id.slice(0, 6)}${rng.int(100, 999)}`,
      clubId: club.id,
      level,
      years: rng.int(2, 4),
      wage: Math.round(wage * BALANCE.agents.wageBoost[q]),
      trust,
      tag: "transfer",
      role: offerRole(rating, club, level, trust),
    };
  });

  if (talent) {
    const level = nextAge < 19 ? "youth" : "first";
    const trust = 40;
    offers.unshift({ id: `g${talent.id.slice(0, 6)}${rng.int(100, 999)}`, clubId: talent.id, level, years: 4, wage: level === "first" ? seniorWage(talent, rating, rng) : youthWage(talent, rng), trust, tag: "talent", role: offerRole(rating, talent, level, trust) });
  }
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
  let signed: CareerSave["signed"];
  if (offerId) {
    const offer = save.offers.find((o) => o.id === offerId)!;
    contract = { clubId: offer.clubId, level: offer.level, wage: offer.wage, until: year + offer.years - 1 };
    trust = offer.trust;
    signed = { clubId: offer.clubId, level: offer.level, wage: offer.wage, years: offer.years, role: offer.role, tag: offer.tag, year, ...(offer.clubId !== save.contract!.clubId ? { fromClubId: save.contract!.clubId } : {}) };
  } else if (contract.until < year) {
    return save; // must choose an offer: contract over
  }
  const club = clubOf(world, contract.clubId);
  return {
    ...save,
    phase: "season",
    // The summer heals you; a new dressing room means building chemistry again.
    player: { ...save.player, age: save.player.age + 1, injury: undefined },
    contract,
    bars: { ...save.bars, trust, fitness: 95, form: Math.round((save.bars.form + 50) / 2), chemistry: contract.clubId === save.contract!.clubId ? Math.min(100, (save.bars.chemistry ?? 50) + 5) : 35 },
    offers: [],
    history: [...save.history, summary],
    season: newSeason(year, club.leagueKey),
    talks: {},
    ...(signed ? { signed } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export const mustRetire = (save: CareerSave) => save.player.age + 1 >= BALANCE.retirementAge;
