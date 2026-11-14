import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { migrateSave } from "@/lib/engine/career";
import type { CareerSave, Level, Localized, World } from "@/lib/engine/types";

export type CareerDict = Dictionary["career"];

/** "{name} scores" + {name: "Avi"} → "Avi scores" */
export function fill(text: string, params: Record<string, string | number> = {}) {
  return text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export const localized = (name: Localized, locale: Locale) => name[locale] ?? name.en;

export function clubName(world: World, id: string, locale: Locale) {
  const club = world.clubs.find((c) => c.id === id);
  return club ? localized(club.name, locale) : "?";
}

export function money(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "he" ? "he-IL" : locale === "ar" ? "ar" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    notation: amount >= 100_000 ? "compact" : "standard",
  }).format(amount);
}

/** League rating: how the player compares inside his league (derived, 1..99). */
export function leagueRating(world: World, save: CareerSave) {
  const leagueKey = save.season?.leagueKey;
  const clubs = world.clubs.filter((c) => c.leagueKey === leagueKey);
  if (!clubs.length) return save.player.rating;
  const avg = clubs.reduce((s, c) => s + c.teamRating, 0) / clubs.length;
  return Math.max(1, Math.min(99, Math.round(60 + (save.player.rating - avg) * 2.2)));
}

/**
 * What the academy side is called in that country at that age:
 * Israel נערים א' (U17) / נוער (U19), England U18/U21, Spain Juvenil A, Italy Primavera…
 */
export function youthTeamLabel(country: string | undefined, age: number, locale: Locale) {
  const young = age <= 16;
  switch (country) {
    case "Israel":
      return locale === "he" ? (young ? "נערים א'" : "נוער") : young ? "U17" : "U19";
    case "England":
    case "Scotland":
      return age <= 17 ? "U18" : "U21";
    case "Spain":
      return young ? "Cadete A" : "Juvenil A";
    case "Italy":
      return young ? "U17" : "Primavera";
    case "Portugal":
      return young ? "Sub-17" : "Sub-19";
    case "Brazil":
    case "Argentina":
      return young ? "Sub-17" : "Sub-20";
    case "Netherlands":
      return young ? "O17" : "O19";
    default:
      return young ? "U17" : "U19";
  }
}

/** Club name, plus the academy label when it's the youth side ("מכבי חיפה נוער", "Arsenal U18"). */
export function teamName(world: World, id: string, locale: Locale, level?: Level, age = 17) {
  const base = clubName(world, id, locale);
  if (level !== "youth") return base;
  const club = world.clubs.find((c) => c.id === id);
  const country = world.leagues.find((l) => l.key === club?.leagueKey)?.country;
  return `${base} ${youthTeamLabel(country, age, locale)}`;
}

// ---------------------------------------------------------------------------
// Saves on this device (guests and signed-in users alike for now).
// ---------------------------------------------------------------------------
const KEY = "fs-player-careers-v1";

export function loadSaves(): CareerSave[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CareerSave[]).map(migrateSave) : [];
  } catch {
    return [];
  }
}

export function storeSaves(saves: CareerSave[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saves));
  } catch {
    // Storage full or blocked: the career still works for this visit.
  }
}

export const FLAGS: Record<string, string> = {
  Israel: "🇮🇱", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", Spain: "🇪🇸", Italy: "🇮🇹", Germany: "🇩🇪", France: "🇫🇷", Portugal: "🇵🇹",
  Netherlands: "🇳🇱", Belgium: "🇧🇪", Turkey: "🇹🇷", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Austria: "🇦🇹", Switzerland: "🇨🇭",
  Greece: "🇬🇷", Denmark: "🇩🇰", "Saudi Arabia": "🇸🇦", "United States": "🇺🇸", Brazil: "🇧🇷", Argentina: "🇦🇷",
};
