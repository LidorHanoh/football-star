// Our own player ratings ("formula" source). Inputs: market value (only as a
// signal, never stored), age, position, height. Researched ratings for the top
// players are layered on top later and locked.

/** League strength 1..100: used for offers, board expectations and as a fallback. */
export const LEAGUE_STRENGTH = {
  eng1: 92, esp: 88, ita: 86, ger: 86, fra: 82, por: 76, ned: 75, bra: 75, eng2: 70,
  bel: 72, tur: 72, arg: 72, ksa: 68, usa: 66, aut: 66, gre: 66, sui: 65, den: 64, sco: 64, isr: 58, isr2: 48,
};

/** Transfermarkt position → our position code. */
export function mapPosition(tm) {
  const map = {
    Goalkeeper: "GK", "Centre-Back": "CB", Sweeper: "CB", "Left-Back": "LB", "Right-Back": "RB",
    "Defensive Midfield": "DM", "Central Midfield": "CM", "Attacking Midfield": "AM",
    "Left Midfield": "LW", "Right Midfield": "RW", "Left Winger": "LW", "Right Winger": "RW",
    "Centre-Forward": "ST", "Second Striker": "ST", Defender: "CB", Midfield: "CM", Attack: "ST",
  };
  return map[tm] ?? "CM";
}

/** Deterministic PRNG so re-imports give the same numbers. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * World rating 1..99.
 * Market value on a log scale (€100k ≈ 52, €1M ≈ 64, €10M ≈ 75, €100M ≈ 87),
 * then corrected for age: young players' values include future potential,
 * veterans' values are discounted for age though they still play well.
 */
export function worldRating({ marketValue, age, fallbackValue }) {
  const value = Math.max(marketValue ?? fallbackValue ?? 50_000, 10_000);
  let r = -5 + 11.5 * Math.log10(value);
  if (age && age < 24) r -= (24 - age) * 1.3;
  if (age && age >= 30) r += Math.min((age - 29) * 1.6, 9);
  return Math.round(clamp(r, 38, 94));
}

/** Hidden ceiling for real players (the user's own player gets a random one in-game). */
export function potential(rating, age, rand) {
  if (!age || age >= 27) return rating;
  const room = age <= 19 ? 12 + rand() * 10 : age <= 22 ? 6 + rand() * 8 : 1 + rand() * 4;
  return Math.round(clamp(rating + room, rating, 97));
}

const TEMPLATES = {
  //      pace sho  pas  dri  def  phy  gk
  GK: [-25, -45, -22, -30, -35, -10, 0],
  CB: [-8, -25, -10, -14, 2, 2, -60],
  LB: [2, -18, -4, -4, -2, -5, -60],
  RB: [2, -18, -4, -4, -2, -5, -60],
  DM: [-8, -12, 0, -4, -1, 0, -60],
  CM: [-5, -6, 1, -1, -8, -4, -60],
  AM: [-2, -2, 1, 2, -25, -10, -60],
  LW: [3, -4, -4, 2, -30, -12, -60],
  RW: [3, -4, -4, 2, -30, -12, -60],
  ST: [0, 2, -10, -3, -35, -2, -60],
};
const KEYS = ["pace", "shooting", "passing", "dribbling", "defending", "physical", "goalkeeping"];

export function attributes(position, rating, age, heightCm, rand) {
  const out = {};
  TEMPLATES[position].forEach((offset, i) => {
    let v = rating + offset + Math.round((rand() - 0.5) * 8);
    if (KEYS[i] === "pace" && age) v -= Math.max(0, age - 28) * 1.5;
    if (KEYS[i] === "physical" && heightCm) v += Math.round((heightCm - 182) / 3);
    out[KEYS[i]] = Math.round(clamp(v, 15, 99));
  });
  return out;
}

/** In-game value from OUR rating and age (not a real market value). */
export function gameValue(rating, age) {
  const ageFactor = !age ? 1 : age <= 23 ? 1.4 : age <= 28 ? 1 : age <= 31 ? 0.7 : 0.4;
  const raw = 10_000 * Math.pow(1.2, rating - 40) * ageFactor;
  const step = raw >= 10_000_000 ? 500_000 : raw >= 1_000_000 ? 100_000 : 25_000;
  return Math.max(25_000, Math.round(raw / step) * step);
}

/** Club reputation 1..100 from the average of its best 16 players. */
export function clubReputation(ratings) {
  const top = [...ratings].sort((a, b) => b - a).slice(0, 16);
  const avg = top.reduce((s, r) => s + r, 0) / Math.max(top.length, 1);
  return Math.round(clamp(10 + (avg - 50) * 2.3, 1, 100));
}
