/** Every tunable number of the Player Career in one place (playtest and adjust). */
export const BALANCE = {
  start: {
    age: 16,
    rating: [44, 50] as const, // world rating range for a new player
    potential: { min: 60, max: 95, mean: 76, sd: 8 }, // hidden
    bars: { trust: 50, form: 50, training: 50, fitness: 90, morale: 70, fans: 20 },
  },

  offers: {
    count: 3,
    /** Youth contract: years */
    youthYears: [2, 3] as const,
    /** Weekly wage (€) for a youth contract = base × growth^reputation */
    youthWageBase: 300,
    youthWageGrowth: 1.025,
    /** First-team wage (€/week) = base × growth^reputation × 1.12^(rating-60) */
    seniorWageBase: 900,
    seniorWageGrowth: 1.045,
  },

  negotiation: {
    winChance: 0.5,
    raise: [0.15, 0.3] as const, // +15–30% on a win
    trustPenalty: 15, // lost from that club's starting trust on a loss
  },

  agents: {
    /** quality 1..5 → commission range and extra offers / reputation reach */
    commission: { 1: [3, 5], 2: [5, 7], 3: [7, 10], 4: [10, 12], 5: [12, 15] } as Record<number, readonly [number, number]>,
    extraOffers: { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 2 } as Record<number, number>,
    reputationReach: { 0: -10, 1: 0, 2: 4, 3: 8, 4: 12, 5: 16 } as Record<number, number>, // how far above your level offers can come from
    /** World rating a player needs before an agent of that quality wants to represent him. */
    unlockRating: { 1: 0, 2: 55, 3: 61, 4: 67, 5: 73 } as Record<number, number>,
    wageBoost: { 0: 0.9, 1: 1, 2: 1.05, 3: 1.1, 4: 1.15, 5: 1.2 } as Record<number, number>,
  },

  season: {
    /** League matches per half season is (teams - 1); youth plays a fixed count. */
    youthMatchesPerHalf: 10,
    homeAdvantage: 2.5,
    /** Expected goals per team per match at equal strength. */
    baseGoals: 1.35,
  },

  growth: {
    /** Rating points gained per half season at age, before potential gap scaling. */
    perHalfByAge: (age: number) => (age <= 18 ? 2.2 : age <= 21 ? 1.8 : age <= 24 ? 1.1 : age <= 27 ? 0.5 : age <= 30 ? 0 : -(age - 30) * 0.5),
  },

  promotion: {
    /** Youth player moves up when rating ≥ first-team XI average − this many points. */
    gapToFirstTeam: 6,
    minTrust: 55,
  },

  retirementAge: 43,
};
