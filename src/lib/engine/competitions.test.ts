import { describe, expect, it } from "vitest";
import { createCareer, signOffer, startOffers } from "./career";
import { europeSlot, runOf, wonTie } from "./competitions";
import { playHalf } from "./season";
import { seasonSummary } from "./season-end";
import type { CareerSave, World } from "./types";

const world: World = {
  leagues: [
    { key: "isr", name: { en: "Ligat Ha'Al" }, country: "Israel", strength: 58, tier: 1 },
    { key: "isr2", name: { en: "Liga Leumit" }, country: "Israel", strength: 50, tier: 2 },
    { key: "eng1", name: { en: "Premier League" }, country: "England", strength: 85, tier: 1 },
    { key: "esp", name: { en: "La Liga" }, country: "Spain", strength: 83, tier: 1 },
  ],
  clubs: [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `isr-${i}`, leagueKey: "isr", name: { en: `ISR ${i}` }, reputation: 25 + i * 3, teamRating: 56 + i })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `isr2-${i}`, leagueKey: "isr2", name: { en: `ISR2 ${i}` }, reputation: 15 + i, teamRating: 48 + i })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: `eng-${i}`, leagueKey: "eng1", name: { en: `ENG ${i}` }, reputation: 60 + i * 3, teamRating: 70 + i })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: `esp-${i}`, leagueKey: "esp", name: { en: `ESP ${i}` }, reputation: 60 + i * 3, teamRating: 69 + i })),
  ],
};

function atTopClub(seed: number): CareerSave {
  const s0 = startOffers(createCareer({ name: "T", nationality: "Israel", position: "ST", foot: "right" }, seed), world, "isr");
  const s = signOffer(s0, s0.offers[1].id, world);
  return { ...s, signed: undefined, contract: { ...s.contract!, clubId: "isr-13", level: "first" }, bars: { ...s.bars, trust: 80 } };
}

describe("cups and Europe", () => {
  it("European places by league position", () => {
    expect(europeSlot(world, "isr", 1)).toBe("cl");
    expect(europeSlot(world, "isr", 3)).toBe("el");
    expect(europeSlot(world, "isr", 4)).toBeNull();
    expect(europeSlot(world, "eng1", 4)).toBe("cl");
    expect(europeSlot(world, "isr2", 1)).toBeNull();
  });

  it("the best Israeli club plays a CL campaign and the cup, in order, and the summary records it", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const s1 = playHalf(atTopClub(seed), world).save;
      const europe = s1.season!.europe!;
      expect(europe.comp).toBe("cl");
      expect(europe.draw).toHaveLength(6);
      // no Israeli clubs in the draw
      expect(europe.draw.every((id) => !id.startsWith("isr"))).toBe(true);
      const h1 = s1.season!.matches;
      expect(h1.filter((m) => m.comp === "cl")).toHaveLength(3);
      expect(h1.some((m) => m.comp === "cup")).toBe(false);
      const s2 = playHalf(s1, world).save;
      const all = s2.season!.matches;
      expect(all.filter((m) => m.comp === "cl" && !m.stage)).toHaveLength(6);
      const cup = all.filter((m) => m.comp === "cup");
      expect(cup.length).toBeGreaterThanOrEqual(1);
      expect(cup.map((m) => m.stage)).toEqual(["r16", "qf", "sf", "final"].slice(0, cup.length));
      // a lost tie ends the run
      cup.slice(0, -1).forEach((m) => expect(wonTie(m)).toBe(true));
      // knockouts that end level are decided on penalties
      all.filter((m) => m.stage && m.goalsFor === m.goalsAgainst).forEach((m) => expect(m.pens).toBeDefined());
      // league games stay a full double round robin
      expect(all.filter((m) => !m.comp).length).toBe(26);
      const sum = seasonSummary(s2);
      expect(sum.europe?.comp).toBe("cl");
      if (runOf(all, "cup").won) expect(sum.trophies).toContain("cup");
      expect(sum.qualified === null || ["cl", "el"].includes(sum.qualified!)).toBe(true);
    }
  });

  it("a mid-table club has no Europe, youth players play no cup", () => {
    const s = atTopClub(3);
    const mid = { ...s, contract: { ...s.contract!, clubId: "isr-4" } };
    const after = playHalf(playHalf(mid, world).save, world).save;
    expect(after.season!.europe).toBeNull();
    expect(after.season!.matches.some((m) => m.comp === "cl" || m.comp === "el")).toBe(false);
    const youth = { ...s, contract: { ...s.contract!, level: "youth" as const } };
    const y = playHalf(playHalf(youth, world).save, world).save;
    expect(y.season!.matches.some((m) => m.comp)).toBe(false);
  });
});
