import { describe, expect, it } from "vitest";
import { clubStars, createCareer, lastSeasonPlace, signOffer, startOffers } from "./career";
import { chooseTourMoment, MOMENT_MOVES, moveChance, playTournament } from "./international";
import { withLowerLeagues } from "./lower-leagues";
import { playHalf } from "./season";
import { agentReport, startNextSeason } from "./season-end";
import type { CareerSave, World } from "./types";

const world: World = withLowerLeagues({
  leagues: [
    { key: "isr", name: { en: "Ligat Ha'Al" }, country: "Israel", strength: 58, tier: 1 },
    { key: "isr2", name: { en: "Liga Leumit" }, country: "Israel", strength: 48, tier: 2 },
  ],
  clubs: [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `isr-${i}`, leagueKey: "isr", name: { en: `ISR ${i}` }, reputation: 25 + i * 3, teamRating: 58 + i * 0.7 })),
    ...Array.from({ length: 16 }, (_, i) => ({ id: `isr2-${i}`, leagueKey: "isr2", name: { en: `ISR2 ${i}` }, reputation: 10 + i, teamRating: 51 + i * 0.5 })),
  ],
});
const LEAGUES = ["isr", "isr2", "isr3", "isr4"];

/** A first-team player at the best club in the league, with a set rating and age. */
function atTopClub(seed: number, rating: number, age: number, nationality = "Israel"): CareerSave {
  let s = startOffers(createCareer({ name: "A", nationality, position: "ST", foot: "right" }, seed), world, LEAGUES);
  const top = s.offers.find((o) => o.clubId.startsWith("isr-"))!;
  s = { ...s, offers: s.offers.map((o) => (o.id === top.id ? { ...o, clubId: "isr-13", level: "first" as const, years: 3 } : o)) };
  s = signOffer(s, top.id, world);
  s = { ...s, phase: "season", player: { ...s.player, rating, age } };
  for (const a of Object.keys(s.player.attrs) as (keyof typeof s.player.attrs)[]) s.player.attrs[a] = rating;
  return s;
}
const fullSeason = (s: CareerSave) => playHalf(playHalf(s, world).save, world).save;

describe("v11: loans", () => {
  it("a young player who isn't playing at a big club gets sent on loan, then comes back", () => {
    let loans = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const s = fullSeason(atTopClub(seed, 50, 18));
      const { save, report } = agentReport(s, world);
      const loan = report.offers.find((o) => o.tag === "loan" && o.clubId === "isr-13");
      if (!loan) continue;
      loans++;
      const loanClub = world.clubs.find((c) => c.id === loan.loan!.clubId)!;
      expect(loanClub.teamRating).toBeLessThan(world.clubs.find((c) => c.id === "isr-13")!.teamRating - 3);

      // A season at the loan club...
      const away = startNextSeason(save, world, loan.id);
      expect(away.contract!.clubId).toBe(loanClub.id);
      expect(away.contract!.parent?.clubId).toBe("isr-13");

      // ...then the loan is over and he goes back to the club that owns him.
      const end = agentReport(fullSeason(away), world);
      expect(end.report.loanOver).toBe(true);
      const back = startNextSeason(end.save, world, null);
      expect(back.contract!.clubId).toBe("isr-13");
      expect(back.contract!.parent).toBeUndefined();
    }
    expect(loans).toBeGreaterThanOrEqual(3);
  });

  it("stars and last season's place are sane and stable", () => {
    const top = world.clubs.find((c) => c.id === "isr-13")!;
    const low = world.clubs.find((c) => c.leagueKey === "isr4")!;
    expect(clubStars(top)).toBeGreaterThan(clubStars(low));
    for (const c of world.clubs) expect(clubStars(c)).toBeGreaterThanOrEqual(0.5);
    const a = lastSeasonPlace(world, top, 2027);
    expect(a).toEqual(lastSeasonPlace(world, top, 2027));
    expect(a.pos).toBeGreaterThanOrEqual(1);
    expect(a.pos).toBeLessThanOrEqual(a.of);
  });
});

describe("v11: breakthroughs", () => {
  it("happen, more often for the young", () => {
    const count = (age: number) => {
      let n = 0;
      for (let seed = 100; seed < 260; seed++) if (playHalf(atTopClub(seed, 55, age), world).save.season!.breakthrough) n++;
      return n;
    };
    const young = count(17);
    const old = count(29);
    expect(young).toBeGreaterThan(0);
    expect(young).toBeGreaterThan(old);
  });
});

describe("v11: tournament moments", () => {
  /** A World Cup summer (season 2025 -> summer 2026) for a national-team regular. */
  const wcSave = (seed: number, rating: number) => {
    const s = atTopClub(seed, rating, 26, "France");
    return { ...s, season: { ...s.season!, year: 2025 } };
  };

  it("the better player gets better odds", () => {
    const move = MOMENT_MOVES.oneOnOne[0];
    expect(moveChance(wcSave(1, 88), move, "Spain")).toBeGreaterThan(moveChance(wcSave(1, 70), move, "Spain"));
  });

  it("a moment you choose is decided once and replays the campaign", () => {
    let tried = 0;
    for (let seed = 1; seed <= 30 && tried < 5; seed++) {
      const s = wcSave(seed, 88);
      const tour = playTournament(s);
      if (!tour?.picked || !tour.plan) continue;
      const idx = tour.matches.findIndex((m, i) => tour.plan![i].moment);
      if (idx < 0) continue;
      tried++;
      const withTour = { ...s, season: { ...s.season!, tournament: tour } };
      const kind = tour.plan[idx].moment!.kind;
      const after = chooseTourMoment(withTour, idx, MOMENT_MOVES[kind][1].id);
      const t2 = after.season!.tournament!;
      expect(t2.picks?.[idx]?.move).toBe(MOMENT_MOVES[kind][1].id);
      // Same choice again: nothing changes.
      expect(chooseTourMoment(after, idx, MOMENT_MOVES[kind][2].id)).toBe(after);
      expect(after.bars.fans).toBeGreaterThanOrEqual(s.bars.fans);
      if (t2.matches[idx]?.hero) expect(after.bars.fans).toBe(Math.min(100, s.bars.fans + 10));
    }
    expect(tried).toBeGreaterThan(0);
  });
});
