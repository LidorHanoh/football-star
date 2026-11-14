import type { World, WorldLeague } from "./types";

/** Flag code (public/flags/{code}.svg) for a country name as stored on leagues. */
export const FLAG_CODE: Record<string, string> = {
  Israel: "il", England: "gb-eng", Scotland: "gb-sct", Spain: "es", Portugal: "pt", France: "fr", Belgium: "be", Netherlands: "nl",
  Germany: "de", Austria: "at", Switzerland: "ch", Denmark: "dk", Italy: "it", Greece: "gr", Turkey: "tr", Brazil: "br",
  Argentina: "ar", "United States": "us", USA: "us", "Saudi Arabia": "sa", "Saudi-Arabia": "sa",
};

/** Country names for the start screen. */
export const COUNTRY_NAMES: Record<string, { he: string; en: string }> = {
  Israel: { he: "ישראל", en: "Israel" },
  England: { he: "אנגליה", en: "England" },
  Scotland: { he: "סקוטלנד", en: "Scotland" },
  Spain: { he: "ספרד", en: "Spain" },
  Portugal: { he: "פורטוגל", en: "Portugal" },
  France: { he: "צרפת", en: "France" },
  Belgium: { he: "בלגיה", en: "Belgium" },
  Netherlands: { he: "הולנד", en: "Netherlands" },
  Germany: { he: "גרמניה", en: "Germany" },
  Austria: { he: "אוסטריה", en: "Austria" },
  Switzerland: { he: "שווייץ", en: "Switzerland" },
  Denmark: { he: "דנמרק", en: "Denmark" },
  Italy: { he: "איטליה", en: "Italy" },
  Greece: { he: "יוון", en: "Greece" },
  Turkey: { he: "טורקיה", en: "Turkey" },
  Brazil: { he: "ברזיל", en: "Brazil" },
  Argentina: { he: "ארגנטינה", en: "Argentina" },
  "United States": { he: "ארצות הברית", en: "United States" },
  USA: { he: "ארצות הברית", en: "United States" },
  "Saudi Arabia": { he: "ערב הסעודית", en: "Saudi Arabia" },
  "Saudi-Arabia": { he: "ערב הסעודית", en: "Saudi Arabia" },
};

/** Every country with its leagues (strongest first). Israel first, then by top-league strength. */
export function countriesOf(world: World): { country: string; leagues: WorldLeague[] }[] {
  const by = new Map<string, WorldLeague[]>();
  for (const l of world.leagues) by.set(l.country, [...(by.get(l.country) ?? []), l]);
  return [...by.entries()]
    .map(([country, leagues]) => ({ country, leagues: leagues.sort((a, b) => b.strength - a.strength) }))
    .sort((a, b) => (a.country === "Israel" ? -1 : b.country === "Israel" ? 1 : b.leagues[0].strength - a.leagues[0].strength));
}
