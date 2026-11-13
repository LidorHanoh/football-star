export type Localized = { en: string; he?: string; ar?: string };

export type Position = "GK" | "CB" | "LB" | "RB" | "DM" | "CM" | "AM" | "LW" | "RW" | "ST";
export const POSITIONS: Position[] = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

/** The slice of the football world a career needs (loaded from Supabase). */
export interface WorldLeague {
  key: string;
  name: Localized;
  country: string;
  strength: number; // 1..100
  tier: number;
}

export interface WorldClub {
  id: string;
  leagueKey: string;
  name: Localized;
  reputation: number; // 1..100
  teamRating: number; // avg world rating of the best XI
}

export interface World {
  leagues: WorldLeague[];
  clubs: WorldClub[];
}

export type Level = "youth" | "first";

export interface Offer {
  id: string;
  clubId: string;
  level: Level;
  years: number;
  wage: number; // € per week
  /** Starting coach trust at that club (0..100) — drops if a negotiation is lost. */
  trust: number;
  /** "Ask for more" already used on this offer. */
  negotiated?: "won" | "lost";
  /** Short label key for the UI: big club / steady path / fast track. */
  tag: "big" | "steady" | "fast" | "renew" | "transfer";
}

export interface Agent {
  id: string;
  name: string;
  quality: number; // 1..5
  commission: number; // % of wage
}

export interface Bars {
  trust: number;
  form: number;
  training: number;
  fitness: number;
  morale: number;
  fans: number;
}

export interface CareerPlayer {
  name: string;
  nationality: string;
  position: Position;
  foot: "right" | "left";
  age: number;
  rating: number; // world rating 1..99 (league rating is derived in the UI)
  /** Hidden potential, stored obfuscated so casual players don't see it. */
  p: string;
  trainingPoints: number;
}

export interface Contract {
  clubId: string;
  level: Level;
  wage: number;
  /** Last season year covered (a contract signed in 2026 for 3 years ends after season 2028). */
  until: number;
}

export interface MatchResult {
  half: 1 | 2;
  round: number;
  opponentId: string;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  /** null = didn't play */
  minutes: number | null;
  started: boolean;
  goals: number;
  assists: number;
  rating: number | null; // 3..10 match rating
}

export interface Highlight {
  id: string;
  half: 1 | 2;
  round: number;
  opponentId: string;
  minute: number;
  kind: "goal" | "assist" | "save" | "chance";
  /** Seed for the 2D animation so the same highlight always plays the same way. */
  seed: number;
  /** Score after the moment, from our side: [for, against] */
  score: [number, number];
}

export interface TableRow {
  clubId: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface SeasonState {
  year: number; // 2026 = the 2026/27 season
  leagueKey: string;
  /** 0 = not started, 1 = first half played, 2 = finished */
  halvesPlayed: 0 | 1 | 2;
  matches: MatchResult[];
  table: TableRow[];
  highlights: Highlight[];
}

export interface SeasonSummary {
  year: number;
  clubId: string;
  level: Level;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number | null;
  ratingEnd: number;
  leaguePosition: number | null;
}

export type Phase = "offers" | "agent" | "season" | "season-end" | "retired";

export interface CareerSave {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  rng: number;
  phase: Phase;
  player: CareerPlayer;
  bars: Bars;
  contract: Contract | null;
  agent: Agent | null;
  offers: Offer[];
  agentsOnOffer: Agent[];
  season: SeasonState | null;
  history: SeasonSummary[];
  /** End-of-season conversation choices made this season (manager / agent) */
  talks: { manager?: string; agent?: string };
}
