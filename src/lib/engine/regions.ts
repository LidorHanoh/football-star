import type { World } from "./types";

/** Where a career starts. The region decides which leagues the first academy offers come from. */
export interface Region {
  key: "israel" | "british" | "iberia" | "west" | "central" | "med" | "americas" | "gulf";
  /** Country names as stored on leagues (both spellings where the sources differ). */
  countries: string[];
  /** Flag image codes in /public/flags */
  flags: string[];
  /** Accent colours for the card */
  colors: [string, string];
}

export const REGIONS: Region[] = [
  { key: "israel", countries: ["Israel"], flags: ["il"], colors: ["#1d4ed8", "#60a5fa"] },
  { key: "british", countries: ["England", "Scotland"], flags: ["gb-eng", "gb-sct"], colors: ["#b91c1c", "#1e3a8a"] },
  { key: "iberia", countries: ["Spain", "Portugal"], flags: ["es", "pt"], colors: ["#dc2626", "#f59e0b"] },
  { key: "west", countries: ["France", "Belgium", "Netherlands"], flags: ["fr", "be", "nl"], colors: ["#1e40af", "#f97316"] },
  { key: "central", countries: ["Germany", "Austria", "Switzerland", "Denmark"], flags: ["de", "at", "ch", "dk"], colors: ["#111827", "#dc2626"] },
  { key: "med", countries: ["Italy", "Greece", "Turkey"], flags: ["it", "gr", "tr"], colors: ["#059669", "#0284c7"] },
  { key: "americas", countries: ["Brazil", "Argentina", "United States", "USA"], flags: ["br", "ar", "us"], colors: ["#16a34a", "#facc15"] },
  { key: "gulf", countries: ["Saudi Arabia", "Saudi-Arabia"], flags: ["sa"], colors: ["#15803d", "#a3e635"] },
];

/** Flag code for a country name (leagues, nationalities). */
export const FLAG_CODE: Record<string, string> = {
  Israel: "il", England: "gb-eng", Scotland: "gb-sct", Spain: "es", Portugal: "pt", France: "fr", Belgium: "be", Netherlands: "nl",
  Germany: "de", Austria: "at", Switzerland: "ch", Denmark: "dk", Italy: "it", Greece: "gr", Turkey: "tr", Brazil: "br",
  Argentina: "ar", "United States": "us", USA: "us", "Saudi Arabia": "sa", "Saudi-Arabia": "sa",
};

export const regionLeagues = (world: World, key: Region["key"]) => {
  const region = REGIONS.find((r) => r.key === key)!;
  return world.leagues.filter((l) => region.countries.includes(l.country)).sort((a, b) => b.strength - a.strength);
};
