import { describe, expect, it } from "vitest";
import { overall, roleFor } from "./attrs";
import { agentTierFor, betterAgentAvailable, createCareer, hireAgent, migrateSave, signOffer, startOffers, switchAgent, train } from "./career";
import { playHalf } from "./season";
import { resolveSetPiece } from "./set-piece";
import type { CareerSave, World, Zone } from "./types";

const world: World = {
  leagues: [
    { key: "isr", name: { en: "Ligat Ha'Al" }, country: "Israel", strength: 58, tier: 1 },
    { key: "isr2", name: { en: "Liga Leumit" }, country: "Israel", strength: 48, tier: 2 },
  ],
  clubs: [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `isr-${i}`, leagueKey: "isr", name: { en: `ISR ${i}` }, reputation: 25 + i * 3, teamRating: 56 + i })),
    ...Array.from({ length: 16 }, (_, i) => ({ id: `isr2-${i}`, leagueKey: "isr2", name: { en: `ISR2 ${i}` }, reputation: 10 + i, teamRating: 50 + Math.round(i / 2) })),
  ],
};

const start = (seed: number, position: "ST" | "GK" = "ST") => {
  const s = startOffers(createCareer({ name: "Test", nationality: "Israel", position, foot: "right", kit: 77, face: 5 }, seed), world, "isr");
  return signOffer(s, s.offers[2].id, world);
};

describe("career features", () => {
  it("new players get attributes, kit and face; overall matches the attributes", () => {
    const s = start(1);
    expect(s.player.kit).toBe(77);
    expect(s.player.face).toBe(5);
    expect(s.player.rating).toBe(overall(s.player.attrs, "ST"));
  });

  it("offers say where you'd stand in the squad", () => {
    const s = startOffers(createCareer({ name: "T", nationality: "Israel", position: "CM", foot: "left" }, 3), world, "isr");
    for (const o of s.offers) expect(["star", "starter", "rotation", "bench"]).toContain(o.role);
    expect(roleFor(70, 60)).toBe("star");
    expect(roleFor(50, 70)).toBe("bench");
  });

  it("training spends points and raises the attribute", () => {
    const s = start(2);
    const t = train(s, "shooting");
    expect(t.player.trainingPoints).toBe(s.player.trainingPoints - 1);
    expect(t.player.attrs.shooting).toBeGreaterThan(s.player.attrs.shooting);
    const empty = { ...s, player: { ...s.player, trainingPoints: 0 } };
    expect(train(empty, "shooting")).toBe(empty);
  });

  it("set pieces change the match, the player's goals and the table consistently", () => {
    let found = 0;
    for (let seed = 1; seed < 400 && found < 15; seed++) {
      let s = start(seed);
      s = { ...s, contract: { ...s.contract!, level: "first" } };
      const after = playHalf(s, world).save;
      const idx = after.season!.matches.findIndex((m) => m.setPiece);
      if (idx < 0) continue;
      found++;
      const resolved = resolveSetPiece(after, idx, (seed % 6) as Zone);
      const m = resolved.season!.matches[idx];
      const res = m.setPiece!.result!;
      const before = after.season!.matches[idx];
      expect(m.goals - before.goals).toBe(res.outcome === "goal" ? 1 : 0);
      const pts = (rows: CareerSave["season"]) => rows!.table.reduce((t, r) => t + r.gf - r.ga, 0);
      expect(pts(resolved.season)).toBe(0);
      const games = resolved.season!.table.reduce((t, r) => t + r.p, 0);
      expect(games).toBe(after.season!.table.reduce((t, r) => t + r.p, 0));
      // Resolving twice does nothing.
      expect(resolveSetPiece(resolved, idx, 0)).toBe(resolved);
    }
    expect(found).toBeGreaterThan(5);
  });

  it("migrates version 1 saves", () => {
    const s = start(4);
    const old = { ...s, version: 1, player: { ...s.player, attrs: undefined, face: undefined, kit: undefined }, offers: [] } as unknown as CareerSave;
    const m = migrateSave(old);
    expect(m.version).toBe(2);
    expect(m.player.attrs.pace).toBeGreaterThan(0);
    expect(m.player.kit).toBe(9);
    expect(Math.abs(m.player.rating - s.player.rating)).toBeLessThanOrEqual(1);
  });

  it("young players only get 1-star agents; better ones unlock with rating", () => {
    const s = start(5);
    expect(agentTierFor(s.player.rating)).toBe(1);
    const top = s.agentsOnOffer.find((a) => a.quality === 5)!;
    expect(hireAgent(s, top.id).agent).toBeNull();
    const one = s.agentsOnOffer.find((a) => a.quality === 1)!;
    expect(hireAgent(s, one.id).agent?.id).toBe(one.id);
    const better = { ...hireAgent(s, one.id), player: { ...s.player, rating: 68 } };
    expect(agentTierFor(68)).toBe(4);
    expect(betterAgentAvailable(better)).toBe(true);
    const four = better.agentsOnOffer.find((a) => a.quality === 4)!;
    const switched = switchAgent(better, four.id);
    expect(switched.agent?.quality).toBe(4);
    expect(switched.phase).toBe(better.phase);
    expect(switchAgent(better, top.id).agent?.quality).toBe(1);
  });
});
