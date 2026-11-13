import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { CareerSave, Localized, World } from "@/lib/engine/types";

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

// ---------------------------------------------------------------------------
// Saves on this device (guests and signed-in users alike for now).
// ---------------------------------------------------------------------------
const KEY = "fs-player-careers-v1";

export function loadSaves(): CareerSave[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CareerSave[]) : [];
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
