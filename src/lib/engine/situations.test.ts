import { describe, expect, it } from "vitest";
import { agentAdvice, askMoreChance } from "./advice";
import { overall } from "./attrs";
import { createCareer, signOffer, startOffers } from "./career";
import { injuryChance, playHalf } from "./season";
import { chooseSituation, choiceOf, halfSituations } from "./situations";
import type { CareerSave, Offer, World } from "./types";

const world: World = {
  leagues: [{ key: "isr", name: { en: "Ligat Ha'Al" }, country: "Israel", strength: 58, tier: 1 }],
  clubs: Array.from({ length: 14 }, (_, i) => ({ id: `isr-${i}`, leagueKey: "isr", name: { en: `ISR ${i}` }, reputation: 25 + i * 3, teamRating: 56 + i })),
};

function pro(seed: number): CareerSave {
  const s0 = startOffers(createCareer({ name: "T", nationality: "Israel", position: "ST", foot: "right" }, seed), world, "isr");
  const s = signOffer(s0, s0.offers[1].id, world);
  return { ...s, contract: { ...s.contract!, clubId: "isr-5", level: "first" }, bars: { ...s.bars, trust: 75 } };
}

describe("in-season situations", () => {
  it("2-3 decisions a season, spread through the halves, stable on reload", () => {
    let s = pro(1);
    for (const half of [1, 2] as const) {
      const list = halfSituations(s, half);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.length).toBeLessThanOrEqual(half === 1 ? 2 : 1);
      expect(halfSituations(s, half).map((x) => x.situation.id)).toEqual(list.map((x) => x.situation.id));
      for (const d of list) {
        expect(d.at).toBeGreaterThanOrEqual(0);
        expect(d.at).toBeLessThan(1);
        s = chooseSituation(s, half, d.situation.id, d.situation.options[0].id);
        expect(choiceOf(s, half, d.situation.id)).toBe(d.situation.options[0].id);
        // answering twice does nothing
        expect(chooseSituation(s, half, d.situation.id, d.situation.options[1].id)).toBe(s);
      }
    }
  });

  it("choices move bars and attributes", () => {
    const s = pro(2);
    const shoot = chooseSituation(s, 1, "sponsorShoot", "shoot");
    expect(shoot.bars.fans).toBe(s.bars.fans + 12);
    expect(shoot.bars.form).toBe(s.bars.form - 5);
    const train = chooseSituation(s, 1, "sponsorShoot", "train");
    expect(train.player.attrs.shooting).toBeGreaterThan(s.player.attrs.shooting); // ST's key attribute
    expect(train.player.rating).toBe(overall(train.player.attrs, "ST"));
    const gym = chooseSituation(s, 1, "extraGym", "yes");
    expect(gym.season!.risk).toBeGreaterThan(0);
  });

  it("a new club starts with the welcome night", () => {
    const s = pro(3);
    const moved = { ...s, history: [{ year: 2025, clubId: "isr-1", level: "first" as const, apps: 10, goals: 1, assists: 1, avgRating: 6.5, ratingEnd: 60, leaguePosition: 5 }] };
    const first = halfSituations(moved, 1)[0];
    expect(first.situation.id).toBe("welcomeNight");
    expect(first.at).toBe(0);
  });
});

describe("injuries", () => {
  it("low fitness and risky choices raise the chance", () => {
    expect(injuryChance(60, 0.05)).toBeGreaterThan(injuryChance(95));
  });

  it("an injury keeps you out, and costs pace/physical", () => {
    let hurt = 0;
    for (let seed = 1; seed <= 60 && !hurt; seed++) {
      const s = { ...pro(seed), bars: { ...pro(seed).bars, fitness: 45 } };
      const s2 = { ...s, season: { ...s.season!, risk: 0.25 } };
      const after = playHalf(s2, world).save;
      const ms = after.season!.matches;
      const i = ms.findIndex((m) => m.injured);
      if (i < 0) continue;
      hurt++;
      if (ms[i + 1]) expect(ms[i + 1].out).toBe(true);
      expect(after.player.attrs.pace + after.player.attrs.physical).toBeLessThan(s.player.attrs.pace + s.player.attrs.physical + 6);
    }
    expect(hurt).toBe(1);
  });
});

describe("agent advice", () => {
  it("no agent, no advice; a bench role is a no; better agents win more talks", () => {
    const s = pro(4);
    const bench: Offer = { id: "x", clubId: "isr-13", level: "first", years: 3, wage: 1000, trust: 30, tag: "transfer", role: "bench" };
    expect(agentAdvice({ ...s, agent: null, offers: [bench] }, world, bench)).toBeNull();
    const agent = { id: "a", name: "A", face: 1, quality: 3, commission: 8 };
    expect(agentAdvice({ ...s, agent, offers: [bench] }, world, bench)!.verdict).toBe("avoid");
    const star: Offer = { ...bench, id: "y", clubId: "isr-8", role: "starter", trust: 60, wage: 1 };
    expect(agentAdvice({ ...s, agent, offers: [bench, star] }, world, star)!.verdict).toBe("askMore");
    expect(askMoreChance(5)).toBeGreaterThan(askMoreChance(1));
  });
});

describe("v7: offers, manager talk, call-ups", () => {
  it("offers come mostly from your division and never from way above", async () => {
    const { agentReport } = await import("./season-end");
    for (let seed = 1; seed <= 20; seed++) {
      const s = pro(seed);
      const ended = { ...s, agent: { id: "a", name: "A", face: 1, quality: 2, commission: 8 }, season: { ...playHalf(playHalf(s, world).save, world).save.season! } };
      const { report } = agentReport(ended, world);
      for (const o of report.offers) {
        if (o.tag === "talent") continue;
        const c = world.clubs.find((x) => x.id === o.clubId)!;
        expect(c.teamRating).toBeLessThanOrEqual(Math.max(ended.player.rating + 1, 61 + 3 + 2));
      }
    }
  });

  it("the manager says yes more when he's happy and you get on", async () => {
    const { managerOutcome } = await import("./season-end");
    const s = pro(5);
    const good = { ...s, bars: { ...s.bars, trust: 90, form: 90, morale: 90 } };
    const bad = { ...s, bars: { ...s.bars, trust: 10, form: 10, morale: 10 } };
    expect(managerOutcome(bad, "raise")).toBe("no");
    expect(["yes", "maybe"]).toContain(managerOutcome(good, "workHarder"));
  });

  it("younger youth players get called up a bit earlier", async () => {
    const { promotionRating, canPromote } = await import("./season");
    expect(promotionRating(16, 70)).toBeLessThan(promotionRating(19, 70));
    expect(canPromote(70, 18, 70, 60)).toBe(true);
    expect(canPromote(70, 18, 70, 20)).toBe(false);
  });
});
