import { describe, expect, it } from "vitest";
import { awardTable, awardsWon, leagueLeaders } from "./awards";
import { createCareer, signOffer, startOffers } from "./career";
import { withLowerLeagues } from "./lower-leagues";
import { playHalf } from "./season";
import { seasonSummary } from "./season-end";
import type { CareerSave, World } from "./types";

const world: World = withLowerLeagues({
  leagues: [{ key: "isr", name: { en: "Ligat Ha'Al" }, country: "Israel", strength: 58, tier: 1 }],
  clubs: Array.from({ length: 14 }, (_, i) => ({ id: `isr-${i}`, leagueKey: "isr", name: { en: `ISR ${i}` }, reputation: 25 + i * 3, teamRating: 56 + i * 1.2 })),
});

function season(seed: number, rating: number, position: "ST" | "GK" | "CB" = "ST"): CareerSave {
  let s = startOffers(createCareer({ name: "A", nationality: "Israel", position, foot: "right" }, seed), world, ["isr", "isr2", "isr3", "isr4"]);
  const o = s.offers[0];
  s = { ...s, offers: s.offers.map((x) => (x.id === o.id ? { ...x, clubId: "isr-13", level: "first" as const } : x)) };
  s = signOffer(s, o.id, world);
  s = { ...s, phase: "season", player: { ...s.player, rating, age: 25 } };
  for (const a of Object.keys(s.player.attrs) as (keyof typeof s.player.attrs)[]) s.player.attrs[a] = rating;
  return playHalf(playHalf(s, world).save, world).save;
}

describe("league awards", () => {
  it("every club has its key players, numbers in a realistic range", () => {
    const s = season(3, 70);
    const lines = leagueLeaders(s);
    expect(lines.filter((l) => l.you)).toHaveLength(1);
    const boot = awardTable(lines, "goldenBoot");
    const games = s.season!.table[0].p;
    if (process.env.SHOW) console.log(games, boot.slice(0, 5).map((l) => `${l.id} ${l.goals}`), awardTable(lines, "playmaker").slice(0, 3).map((l) => `${l.id} ${l.assists}`), awardTable(lines, "playerOfSeason").slice(0, 3).map((l) => `${l.id} ${l.rating}`), awardTable(lines, "goldenGlove").slice(0, 3).map((l) => `${l.id} ${l.cleanSheets}`));
    expect(boot[0].goals).toBeGreaterThanOrEqual(games * 0.35);
    expect(boot[0].goals).toBeLessThanOrEqual(games * 1.1);
  });

  it("the trophy goes to whoever tops the chart", () => {
    let won = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = season(seed, 88);
      const lines = leagueLeaders(s);
      const top = awardTable(lines, "goldenBoot")[0];
      expect(seasonSummary(s).trophies!.includes("goldenBoot")).toBe(!!top.you);
      expect(awardsWon(lines).includes("goldenBoot")).toBe(!!top.you);
      if (top.you) won++;
    }
    if (process.env.SHOW) console.log("88-rated striker golden boots:", won, "/ 6");
    let weak = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) if (awardsWon(leagueLeaders(season(seed, 52))).includes("goldenBoot")) weak++;
    expect(weak).toBe(0);
  });
});
