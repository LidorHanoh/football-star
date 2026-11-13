import { clamp, Rng } from "./rng";
import { ATTRS, type Attrs, type Position, type Role } from "./types";

/** How much each attribute counts toward the overall rating, per position (rows sum to 1). */
const WEIGHTS: Record<Position, Attrs> = {
  GK: { pace: 0.25, shooting: 0.2, passing: 0.08, dribbling: 0.25, defending: 0.17, physical: 0.05 },
  CB: { pace: 0.12, shooting: 0.02, passing: 0.1, dribbling: 0.04, defending: 0.5, physical: 0.22 },
  LB: { pace: 0.24, shooting: 0.03, passing: 0.18, dribbling: 0.1, defending: 0.33, physical: 0.12 },
  RB: { pace: 0.24, shooting: 0.03, passing: 0.18, dribbling: 0.1, defending: 0.33, physical: 0.12 },
  DM: { pace: 0.08, shooting: 0.05, passing: 0.3, dribbling: 0.07, defending: 0.33, physical: 0.17 },
  CM: { pace: 0.1, shooting: 0.12, passing: 0.38, dribbling: 0.18, defending: 0.12, physical: 0.1 },
  AM: { pace: 0.12, shooting: 0.22, passing: 0.32, dribbling: 0.28, defending: 0.02, physical: 0.04 },
  LW: { pace: 0.3, shooting: 0.2, passing: 0.15, dribbling: 0.3, defending: 0.02, physical: 0.03 },
  RW: { pace: 0.3, shooting: 0.2, passing: 0.15, dribbling: 0.3, defending: 0.02, physical: 0.03 },
  ST: { pace: 0.2, shooting: 0.45, passing: 0.05, dribbling: 0.15, defending: 0.01, physical: 0.14 },
};

/** Typical shape of a player in each position, relative to the overall rating. */
const PROFILE: Record<Position, Attrs> = {
  GK: { pace: 4, shooting: 3, passing: -6, dribbling: 4, defending: 2, physical: -2 },
  CB: { pace: -4, shooting: -18, passing: -6, dribbling: -14, defending: 5, physical: 4 },
  LB: { pace: 4, shooting: -14, passing: -1, dribbling: -4, defending: 2, physical: -3 },
  RB: { pace: 4, shooting: -14, passing: -1, dribbling: -4, defending: 2, physical: -3 },
  DM: { pace: -5, shooting: -10, passing: 2, dribbling: -6, defending: 3, physical: 3 },
  CM: { pace: -2, shooting: -3, passing: 3, dribbling: 1, defending: -4, physical: -2 },
  AM: { pace: 0, shooting: 1, passing: 2, dribbling: 3, defending: -20, physical: -8 },
  LW: { pace: 4, shooting: 0, passing: -2, dribbling: 3, defending: -22, physical: -8 },
  RW: { pace: 4, shooting: 0, passing: -2, dribbling: 3, defending: -22, physical: -8 },
  ST: { pace: 1, shooting: 3, passing: -8, dribbling: -1, defending: -25, physical: 2 },
};

export const overall = (a: Attrs, pos: Position) => Math.round(ATTRS.reduce((s, k) => s + a[k] * WEIGHTS[pos][k], 0));

/** The key attributes for a position, most important first (used to suggest training). */
export const keyAttrs = (pos: Position) => [...ATTRS].sort((x, y) => WEIGHTS[pos][y] - WEIGHTS[pos][x]);

/** How much +1 in this attribute raises the overall (for the training screen). */
export const attrWeight = (pos: Position, k: keyof Attrs) => WEIGHTS[pos][k];

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Attributes for a new player whose overall is `rating`. */
export function makeAttrs(pos: Position, rating: number, rng: Rng): Attrs {
  const a = {} as Attrs;
  for (const k of ATTRS) a[k] = rating + PROFILE[pos][k] + rng.range(-3, 3);
  return shiftTo(a, pos, rating);
}

/** Move all attributes together so the overall lands exactly on `target`. */
function shiftTo(a: Attrs, pos: Position, target: number): Attrs {
  const exact = ATTRS.reduce((s, k) => s + a[k] * WEIGHTS[pos][k], 0);
  const d = target - exact;
  const out = {} as Attrs;
  for (const k of ATTRS) out[k] = round1(clamp(a[k] + d, 1, 99));
  return out;
}

/** Natural growth/decline: spread `delta` overall points over the attributes (with a little noise). */
export function growAttrs(a: Attrs, pos: Position, delta: number, rng: Rng): Attrs {
  if (!delta) return a;
  const before = ATTRS.reduce((s, k) => s + a[k] * WEIGHTS[pos][k], 0);
  const out = {} as Attrs;
  for (const k of ATTRS) {
    // Pace fades first when declining; technique keeps growing longer.
    const bias = delta < 0 && k === "pace" ? 1.6 : delta < 0 && k === "passing" ? 0.6 : 1;
    out[k] = clamp(a[k] + delta * bias * rng.range(0.6, 1.4), 1, 99);
  }
  return shiftTo(out, pos, before + delta);
}

/** Old saves (v1) have no attributes, face or kit number. */
export function upgradePlayerFields<T extends { position: Position; rating: number; attrs?: Attrs; face?: number; kit?: number }>(p: T, seed: number) {
  const rng = new Rng(seed);
  return {
    ...p,
    attrs: p.attrs ?? makeAttrs(p.position, p.rating, rng),
    face: p.face ?? rng.int(1, 2 ** 30),
    kit: p.kit ?? DEFAULT_KIT[p.position],
  };
}

export const DEFAULT_KIT: Record<Position, number> = { GK: 1, RB: 2, LB: 3, CB: 4, DM: 6, CM: 8, AM: 10, LW: 11, RW: 7, ST: 9 };

// ---------------------------------------------------------------------------
// Squad role
// ---------------------------------------------------------------------------
/** Your place in a squad of strength `teamStrength` (avg of the best XI). */
export function roleFor(rating: number, teamStrength: number, trust = 50): Role {
  const gap = rating - teamStrength + (trust - 50) * 0.08;
  return gap >= 4 ? "star" : gap >= -1.5 ? "starter" : gap >= -5.5 ? "rotation" : "bench";
}

/** Rough chance to start a match for each role (shown on offers). */
export const ROLE_START: Record<Role, number> = { star: 0.95, starter: 0.8, rotation: 0.45, bench: 0.15 };
