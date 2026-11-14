import { clamp, Rng } from "./rng";
import { record, sortTable, unrecord } from "./season";
import type { CareerSave, MatchResult, Zone } from "./types";

/** Column of a zone: 0 left, 1 centre, 2 right. Zones 0–2 are high, 3–5 low. */
export const zoneCol = (z: Zone) => z % 3;
export const zoneHigh = (z: Zone) => z < 3;

/**
 * Resolve the set piece in match `index` of the current season.
 * Shooting: `zone` is where you aim. Facing a penalty as a keeper: `zone` is
 * where you dive (only the column counts). `quality` (0..1) is how well you
 * timed the power bar: a clean strike misses less and beats the keeper more;
 * a sharp reaction helps the keeper.
 */
export function resolveSetPiece(save: CareerSave, index: number, zone: Zone, quality = 0.75): CareerSave {
  const season = save.season!;
  const m = season.matches[index];
  if (!m?.setPiece || m.setPiece.result) return save;
  const sp = m.setPiece;
  const r = new Rng(sp.seed);
  const a = save.player.attrs;
  const keeperMode = sp.kind === "penaltySave";
  let outcome: "goal" | "saved" | "miss";
  let ball: Zone = zone;
  let keeper: Zone;

  if (keeperMode) {
    ball = r.pick<Zone>([0, 2, 3, 5, 3, 5, 4, 1]);
    keeper = (zoneCol(zone) + (zoneHigh(ball) ? 0 : 3)) as Zone;
    const sameCol = zoneCol(ball) === zoneCol(zone);
    const skill = ((a.pace + a.dribbling) / 2 - 55) / 100; // diving + reflexes
    if (r.chance(0.07)) outcome = "miss";
    else outcome = sameCol && r.chance(clamp((zoneHigh(ball) ? 0.45 : 0.7) + skill + (quality - 0.5) * 0.3, 0.2, 0.95)) ? "saved" : "goal";
  } else {
    const skill = (a.shooting - 60) / 100;
    const keeperCol = r.pick([0, 0, 2, 2, 1]);
    keeper = (keeperCol + (zoneHigh(zone) && r.chance(0.5) ? 0 : 3)) as Zone;
    const sameCol = keeperCol === zoneCol(zone);
    // Penalty (free kicks from old saves play as penalties too).
    {
      const miss = clamp(((zoneHigh(zone) ? (zoneCol(zone) === 1 ? 0.08 : 0.17) : zoneCol(zone) === 1 ? 0.02 : 0.06) - skill * 0.45) * (1.7 - quality * 1.2), 0.01, 0.45);
      const saved = sameCol ? (zoneCol(zone) === 1 ? 0.88 : zoneHigh(zone) ? 0.25 : 0.65) : 0.02;
      outcome = r.chance(miss) ? "miss" : r.chance(clamp(saved - skill * 0.6 - (quality - 0.6) * 0.25, 0, 0.95)) ? "saved" : "goal";
    }
  }

  // Apply to the match, the table and your bars.
  const scored = outcome === "goal";
  const next: MatchResult = { ...m, setPiece: { ...sp, result: { outcome, zone: ball, keeper } } };
  if (!keeperMode && scored) {
    next.goalsFor++;
    next.goals++;
  }
  if (keeperMode && scored) next.goalsAgainst++;
  const good = scored !== keeperMode;
  next.rating = Math.round(clamp((m.rating ?? 6) + (good ? 0.9 : keeperMode ? -0.2 : -0.4), 3, 10) * 10) / 10;

  const matches = [...season.matches];
  matches[index] = next;
  let table = season.table;
  // Youth matches are friendlies vs. youth sides and are not in the league table.
  const inTable = save.contract!.level === "first" && season.table.some((row) => row.clubId === m.opponentId);
  if (inTable && (next.goalsFor !== m.goalsFor || next.goalsAgainst !== m.goalsAgainst)) {
    const myId = save.contract!.clubId;
    table = sortTable(
      season.table.map((row) => {
        if (row.clubId !== myId && row.clubId !== m.opponentId) return row;
        const mine = row.clubId === myId;
        const out = { ...row };
        unrecord(out, mine ? m.goalsFor : m.goalsAgainst, mine ? m.goalsAgainst : m.goalsFor);
        record(out, mine ? next.goalsFor : next.goalsAgainst, mine ? next.goalsAgainst : next.goalsFor);
        return out;
      }),
    );
  }
  const bars = { ...save.bars, fans: clamp(save.bars.fans + (good ? 2 : -1), 0, 100), form: clamp(save.bars.form + (good ? 2 : -2), 0, 100) };
  return { ...save, bars, season: { ...season, matches, table } };
}
