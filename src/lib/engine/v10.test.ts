import { describe, expect, it } from "vitest";
import { createCareer, signOffer, startOffers } from "./career";
import { withLowerLeagues } from "./lower-leagues";
import { playHalf } from "./season";
import { agentReport } from "./season-end";
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

/** A Liga Bet first-team player at the end of a season. */
function ligaBetSeason(rating: number, seed: number): CareerSave {
  let s = startOffers(createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, seed), world, ["isr", "isr2", "isr3", "isr4"]);
  s = signOffer(s, s.offers.at(-1)!.id, world);
  s = { ...s, phase: "season", player: { ...s.player, rating, age: 21 } };
  for (const a of Object.keys(s.player.attrs) as (keyof typeof s.player.attrs)[]) s.player.attrs[a] = rating;
  return playHalf(playHalf(s, world).save, world).save;
}

describe("v10: five start offers, top-flight interest, call-ups only from the top flight", () => {
  it("starts with five different clubs, from the top division down to Liga Bet", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = startOffers(createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, seed), world, ["isr", "isr2", "isr3", "isr4"]);
      expect(s.offers).toHaveLength(5);
      expect(new Set(s.offers.map((o) => o.clubId)).size).toBe(5);
      expect(s.offers[0].clubId.startsWith("isr-")).toBe(true);
      expect(s.offers.some((o) => o.level === "youth")).toBe(true);
      expect(s.offers.some((o) => o.level === "first")).toBe(true);
    }
  });

  it("a Liga Bet player rated like a top-division player gets top-division offers", () => {
    let hits = 0;
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      const s = ligaBetSeason(66, seed);
      const { report } = agentReport(s, world);
      if (report.offers.some((o) => o.clubId.startsWith("isr-"))) hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(5);
  });

  it("no national team call-ups below the top division", () => {
    for (const seed of [21, 22, 23]) {
      const s = ligaBetSeason(80, seed);
      expect(s.season!.intl ?? []).toHaveLength(0);
      if (s.season!.tournament) expect(s.season!.tournament.picked).toBe(false);
    }
  });
});
