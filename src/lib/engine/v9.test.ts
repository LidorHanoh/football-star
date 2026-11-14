import { describe, expect, it } from "vitest";
import { createCareer, readPotential, signOffer, startOffers } from "./career";
import { FACTS } from "./facts";
import { callUpScore, internationalBreaks, playTournament, summerTournament } from "./international";
import { LOWER_CLUBS, withLowerLeagues } from "./lower-leagues";
import { playHalf } from "./season";
import { chooseSituation, gambleWon, situationById } from "./situations";
import { makeQuestion } from "./trivia";
import type { CareerSave, World } from "./types";

const base: World = {
  leagues: [
    { key: "isr", name: { en: "Ligat Ha'Al" }, country: "Israel", strength: 58, tier: 1 },
    { key: "isr2", name: { en: "Liga Leumit" }, country: "Israel", strength: 48, tier: 2 },
  ],
  clubs: [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `isr-${i}`, leagueKey: "isr", name: { en: `ISR ${i}` }, reputation: 25 + i * 3, teamRating: 58 + i * 0.7 })),
    ...Array.from({ length: 16 }, (_, i) => ({ id: `isr2-${i}`, leagueKey: "isr2", name: { en: `ISR2 ${i}` }, reputation: 10 + i, teamRating: 51 + i * 0.5 })),
  ],
};
const world = withLowerLeagues(base);

describe("v9: lower divisions, low start, national team, gambles, trivia facts", () => {
  it("adds Liga Alef and Liga Bet to Israel, weaker than Liga Leumit", () => {
    expect(world.leagues.map((l) => l.key)).toEqual(["isr", "isr2", "isr3", "isr4"]);
    expect(LOWER_CLUBS.filter((c) => c.leagueKey === "isr3")).toHaveLength(16);
    expect(Math.max(...LOWER_CLUBS.filter((c) => c.leagueKey === "isr4").map((c) => c.teamRating))).toBeLessThan(Math.min(...LOWER_CLUBS.filter((c) => c.leagueKey === "isr3").map((c) => c.teamRating)) + 2);
    expect(withLowerLeagues({ leagues: [], clubs: [] }).leagues).toHaveLength(0);
  });

  it("starts low, with a wide spread of hidden potential", () => {
    const pots: number[] = [];
    for (let seed = 1; seed < 300; seed++) {
      const s = createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, seed);
      expect(s.player.rating).toBeLessThanOrEqual(44);
      pots.push(readPotential(s.player.p));
    }
    expect(Math.min(...pots)).toBeLessThan(55);
    expect(Math.max(...pots)).toBeGreaterThan(88);
  });

  it("amateur clubs offer a first-team deal straight away", () => {
    const s = startOffers(createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, 5), world, ["isr", "isr2", "isr3", "isr4"]);
    const small = s.offers.find((o) => o.tag === "fast")!;
    expect(small.clubId.startsWith("isr4-")).toBe(true);
    expect(small.level).toBe("first");
    const big = s.offers.find((o) => o.tag === "big")!;
    expect(big.level).toBe("youth");
  });

  it("plays a full season in Liga Bet", () => {
    let s = startOffers(createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, 9), world, ["isr", "isr2", "isr3", "isr4"]);
    s = signOffer(s, s.offers.find((o) => o.tag === "fast")!.id, world);
    s = playHalf(playHalf({ ...s, phase: "season" }, world).save, world).save;
    expect(s.phase).toBe("season-end");
    expect(s.season!.matches.length).toBeGreaterThanOrEqual(30);
  });

  it("national team: only picked when good enough; tournaments by year", () => {
    const s0 = createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, 3);
    const season = { year: 2027, leagueKey: "isr", halvesPlayed: 0 as const, matches: [], table: [], highlights: [] };
    const weak: CareerSave = { ...s0, season };
    expect(callUpScore(weak)).toBeLessThan(0);
    expect(internationalBreaks(weak, 1).every((b) => !b.picked)).toBe(true);
    const star: CareerSave = { ...s0, season, player: { ...s0.player, rating: 80, age: 24 } };
    const breaks = internationalBreaks(star, 1);
    expect(breaks).toHaveLength(3);
    expect(breaks.every((b) => b.picked && b.matches.length === 2)).toBe(true);
    expect(summerTournament("Israel", 2027)).toBe("euro"); // summer 2028
    expect(summerTournament("Israel", 2029)).toBe("wc"); // summer 2030
    expect(summerTournament("Brazil", 2027)).toBe("copa");
    expect(summerTournament("Japan", 2027)).toBeNull();
    expect(summerTournament("Israel", 2026)).toBeNull();
    const tour = playTournament({ ...star, player: { ...star.player, nationality: "Spain", rating: 90 } })!;
    expect(tour.comp).toBe("euro");
    if (tour.qualified) expect(tour.matches.length).toBeGreaterThanOrEqual(3);
  });

  it("a 50/50 choice applies the side the wheel lands on", () => {
    const s0 = createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, 11);
    const s: CareerSave = { ...s0, season: { year: 2026, leagueKey: "isr", halvesPlayed: 0, matches: [], table: [], highlights: [] } };
    const sit = situationById("askToStart")!;
    const won = gambleWon(s, 1, "askToStart");
    const after = chooseSituation(s, 1, "askToStart", "ask");
    const g = sit.options[0].gamble!;
    expect(after.bars.trust).toBe(s.bars.trust + (won ? g.win.trust! : g.lose.trust!));
    expect(after.season!.gambles!["1:askToStart"]).toBe(won);
    // Over many careers it's about half and half.
    let wins = 0;
    for (let i = 0; i < 400; i++) if (gambleWon({ ...s, id: `x${i}` }, 1, "askToStart")) wins++;
    expect(wins).toBeGreaterThan(150);
    expect(wins).toBeLessThan(250);
  });

  it("trivia facts: four distinct answers each, and they show up in the mix", () => {
    for (const f of FACTS) expect(new Set(f[4].map((a) => a[0])).size).toBe(4);
    const data = { clubs: {}, players: {}, transfers: [], champions: { cl: [], isr: [] } };
    const seen: string[] = [];
    for (let i = 0; i < 30; i++) {
      const q = makeQuestion(data, ["general", "israel"], `s${i}`, seen);
      if (q) {
        expect(q.kind).toBe("fact");
        seen.push(q.id);
      }
    }
    expect(seen.length).toBeGreaterThan(5);
    expect(new Set(seen).size).toBe(seen.length);
  });
});
