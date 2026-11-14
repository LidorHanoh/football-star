import { describe, expect, it } from "vitest";
import { overall } from "./attrs";
import { canTrain, createCareer, signOffer, startOffers, train } from "./career";
import { playHalf } from "./season";
import { seasonSummary } from "./season-end";
import { resolveSetPiece } from "./set-piece";
import { careerStats, seasonTrophies } from "./stats";
import type { Attrs, CareerSave, Position, World, Zone } from "./types";

const world: World = {
  leagues: [{ key: "isr", name: { en: "Ligat Ha'Al" }, country: "Israel", strength: 58, tier: 1 }],
  clubs: Array.from({ length: 14 }, (_, i) => ({ id: `isr-${i}`, leagueKey: "isr", name: { en: `ISR ${i}` }, reputation: 25 + i * 3, teamRating: 56 + i })),
};

/** A first-team regular at a mid club with chosen attributes. */
function pro(seed: number, position: Position, tweak: Partial<Attrs> = {}): CareerSave {
  const s0 = startOffers(createCareer({ name: "T", nationality: "Israel", position, foot: "right" }, seed), world, "isr");
  const s = signOffer(s0, s0.offers[1].id, world);
  const attrs = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, ...tweak };
  return {
    ...s,
    contract: { ...s.contract!, clubId: "isr-5", level: "first" },
    player: { ...s.player, attrs, rating: overall(attrs, position) },
    bars: { ...s.bars, trust: 75, fitness: 95 },
    season: { ...s.season!, leagueKey: "isr" },
  };
}

function seasonTotals(position: Position, tweak: Partial<Attrs>, runs = 40) {
  const t = { goals: 0, assists: 0, dribblesWon: 0, keyPasses: 0, tackles: 0 };
  for (let i = 0; i < runs; i++) {
    let s = pro(100 + i, position, tweak);
    s = playHalf(s, world).save;
    for (const m of s.season!.matches) {
      t.goals += m.goals;
      t.assists += m.assists;
      t.dribblesWon += m.stats?.dribblesWon ?? 0;
      t.keyPasses += m.stats?.keyPasses ?? 0;
      t.tackles += m.stats?.tackles ?? 0;
    }
  }
  return t;
}

describe("attributes drive what happens on the pitch", () => {
  it("better shooting -> more goals", () => {
    const low = seasonTotals("ST", { shooting: 55 });
    const high = seasonTotals("ST", { shooting: 80 });
    expect(high.goals).toBeGreaterThan(low.goals * 1.4);
  });

  it("better passing -> more assists and key passes", () => {
    const low = seasonTotals("CM", { passing: 55 });
    const high = seasonTotals("CM", { passing: 80 });
    expect(high.assists).toBeGreaterThan(low.assists * 1.3);
    expect(high.keyPasses).toBeGreaterThan(low.keyPasses * 1.3);
  });

  it("better dribbling -> more successful dribbles; better defending -> more tackles", () => {
    expect(seasonTotals("LW", { dribbling: 82 }).dribblesWon).toBeGreaterThan(seasonTotals("LW", { dribbling: 55 }).dribblesWon * 1.4);
    expect(seasonTotals("CB", { defending: 82 }).tackles).toBeGreaterThan(seasonTotals("CB", { defending: 55 }).tackles * 1.2);
  });

  it("better shooting scores more penalties", () => {
    const rate = (shooting: number) => {
      let goals = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const s = pro(1, "ST", { shooting });
        const m = { ...s.season!.matches[0], half: 1 as const, round: 1, opponentId: "isr-1", home: true, goalsFor: 0, goalsAgainst: 0, minutes: 90, started: true, goals: 0, assists: 0, rating: 6.5, setPiece: { kind: "penalty" as const, minute: 50, seed } };
        const withPen = { ...s, season: { ...s.season!, matches: [m], table: [] } };
        const out = resolveSetPiece(withPen, 0, ((seed % 2) * 2 + 3) as Zone, 0.7);
        if (out.season!.matches[0].setPiece!.result!.outcome === "goal") goals++;
      }
      return goals / 400;
    };
    expect(rate(85)).toBeGreaterThan(rate(45) + 0.08);
  });
});

describe("training never gets stuck", () => {
  it("points can still be spent past the potential, with a smaller gain", () => {
    let s = pro(7, "ST");
    s = { ...s, player: { ...s.player, trainingPoints: 40, p: s.player.p } };
    for (let i = 0; i < 40; i++) {
      expect(canTrain(s, "shooting")).toBe(true);
      s = train(s, "shooting");
    }
    expect(s.player.trainingPoints).toBe(0);
  });
});

describe("season stats and trophies", () => {
  it("the season summary keeps stats and career totals add up", () => {
    let s = pro(3, "AM");
    s = playHalf(s, world).save;
    s = playHalf(s, world).save;
    const sum = seasonSummary(s);
    expect(sum.statApps).toBe(s.season!.matches.filter((m) => m.minutes).length);
    expect(sum.stats!.dribblesWon).toBeLessThanOrEqual(sum.stats!.dribbles);
    expect(sum.stats!.passesDone).toBeLessThanOrEqual(sum.stats!.passes);
    expect(careerStats([sum]).apps).toBe(sum.statApps);
  });

  it("champions and top scorers get trophies", () => {
    const matches = Array.from({ length: 26 }, () => ({ half: 1 as const, round: 1, opponentId: "x", home: true, goalsFor: 2, goalsAgainst: 0, minutes: 90, started: true, goals: 1, assists: 0, rating: 7.6 }));
    const t = seasonTrophies({ level: "first", position: "ST", leaguePosition: 1, matches, apps: 26, goals: 20, assists: 3, avgRating: 7.6, cleanSheets: 0 });
    expect(t).toEqual(expect.arrayContaining(["league", "goldenBoot", "playerOfSeason"]));
    expect(seasonTrophies({ level: "first", position: "ST", leaguePosition: 9, matches, apps: 5, goals: 1, assists: 0, avgRating: 6.3, cleanSheets: 0 })).toEqual([]);
  });
});
