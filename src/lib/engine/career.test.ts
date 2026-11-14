import { describe, expect, it } from "vitest";
import { askForMore, createCareer, readPotential, signOffer, startOffers, newSeason } from "./career";
import { playHalf, roundRobin } from "./season";
import { reactInOffice, officeTopic } from "./office";
import { agentReport, seasonSummary, startNextSeason } from "./season-end";
import type { CareerSave, World } from "./types";

function fakeWorld(): World {
  const clubs = [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `isr-${String(i).padStart(2, "0")}`, leagueKey: "isr", name: { en: `ISR ${i}` }, reputation: 25 + i * 3, teamRating: 56 + Math.round(i * 1.1) })),
    ...Array.from({ length: 20 }, (_, i) => ({ id: `eng-${String(i).padStart(2, "0")}`, leagueKey: "eng1", name: { en: `ENG ${i}` }, reputation: 60 + i * 2, teamRating: 72 + Math.round(i * 0.7) })),
  ];
  return {
    leagues: [
      { key: "isr", name: { en: "Ligat Ha'Al" }, country: "Israel", strength: 58, tier: 1 },
      { key: "eng1", name: { en: "Premier League" }, country: "England", strength: 92, tier: 1 },
    ],
    clubs,
  };
}

/** Run n full seasons at the same club (no transfers yet), ageing each year. */
function simulate(save: CareerSave, world: World, seasons: number) {
  const log: { age: number; rating: number; level: string; apps: number; goals: number }[] = [];
  for (let s = 0; s < seasons; s++) {
    save = playHalf(save, world).save;
    save = playHalf(save, world).save;
    const played = save.season!.matches.filter((m) => m.minutes);
    log.push({ age: save.player.age, rating: save.player.rating, level: save.contract!.level, apps: played.length, goals: played.reduce((t, m) => t + m.goals, 0) });
    save = { ...save, player: { ...save.player, age: save.player.age + 1 }, phase: "season", season: newSeason(save.season!.year + 1, save.season!.leagueKey) };
  }
  return log;
}

describe("player career", () => {
  const world = fakeWorld();

  it("round robin: every club plays every other once per half", () => {
    const rounds = roundRobin(14);
    expect(rounds).toHaveLength(13);
    const pairs = new Set(rounds.flat().map(([a, b]) => [a, b].sort().join("-")));
    expect(pairs.size).toBe((14 * 13) / 2);
  });

  it("hidden potential round-trips and stays in range", () => {
    for (let i = 1; i < 200; i++) {
      const p = readPotential(createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, i).player.p);
      expect(p).toBeGreaterThanOrEqual(47);
      expect(p).toBeLessThanOrEqual(96);
    }
  });

  it("gives 3 youth offers from big / mid / small clubs, with wages", () => {
    const save = startOffers(createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, 7), world, "isr");
    expect(save.offers).toHaveLength(3);
    expect(save.offers.map((o) => o.tag)).toEqual(["big", "steady", "fast"]);
    for (const o of save.offers) expect(o.wage).toBeGreaterThan(0);
  });

  it("ask for more is roughly 50/50: win raises the wage, loss lowers trust", () => {
    let wins = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const save = startOffers(createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, seed), world, "isr");
      const before = save.offers[0];
      const { won, offer } = askForMore(save, before.id);
      if (won) {
        wins++;
        expect(offer.wage).toBeGreaterThan(before.wage);
        expect(offer.trust).toBe(before.trust);
      } else {
        expect(offer.wage).toBe(before.wage);
        expect(offer.trust).toBeLessThan(before.trust);
      }
    }
    expect(wins).toBeGreaterThan(160);
    expect(wins).toBeLessThan(240);
  });

  it("full careers with season-end talks and transfers", () => {
    for (const seed of [21, 22, 23, 24, 25]) {
      let save = startOffers(createCareer({ name: "A", nationality: "Israel", position: "ST", foot: "right" }, seed), world, "isr");
      save = signOffer(save, save.offers[2].id, world);
      save = { ...save, agent: save.agentsOnOffer[2], phase: "season" };
      const path: string[] = [];
      for (let s = 0; s < 12; s++) {
        save = playHalf(save, world).save;
        save = playHalf(save, world).save;
        expect(save.phase).toBe("season-end");
        save = reactInOffice(save, officeTopic(save).reactions[0].id);
        const { save: withOffers, report } = agentReport(save, world);
        save = withOffers;
        const sum = seasonSummary(save);
        const best = [...save.offers].sort((a, b) => world.clubs.find((c) => c.id === b.clubId)!.teamRating - world.clubs.find((c) => c.id === a.clubId)!.teamRating)[0];
        const stay = !report.released && !report.contractExpired && save.contract!.level === "first" && (!best || world.clubs.find((c) => c.id === best.clubId)!.teamRating <= world.clubs.find((c) => c.id === save.contract!.clubId)!.teamRating + 2);
        path.push(`${save.player.age}:${save.contract!.clubId}${save.contract!.level[0]} ${save.player.rating} ${sum.apps}a${sum.goals}g${report.released ? " REL" : ""}`);
        const next = stay ? null : (best?.id ?? null);
        const after = startNextSeason(save, world, next);
        if (after === save) break; // no club — career would need free-agent handling
        save = after;
      }
      console.log(`pot ${readPotential(save.player.p)}: ${path.join(" | ")}`);
    }
  });

  it("prints sample careers for balance review", () => {
    for (const [seed, position] of [[11, "ST"], [12, "CM"], [13, "CB"], [14, "LW"]] as const) {
      let save = startOffers(createCareer({ name: "A", nationality: "Israel", position, foot: "right" }, seed), world, "isr");
      save = signOffer(save, save.offers[1].id, world);
      const log = simulate(save, world, 8);
      console.log(`${position} pot ${readPotential(save.player.p)}: ` + log.map((l) => `${l.age}y ${l.rating} ${l.level[0]} ${l.apps}a/${l.goals}g`).join(" | "));
      expect(log.at(-1)!.rating).toBeGreaterThan(log[0].rating - 1);
    }
  });
});
