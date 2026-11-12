import { locale as localeParam } from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import type he from "./dictionaries/he.json";

/** Hebrew is the source of truth for dictionary keys. */
export type Dictionary = typeof he;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  he: () => import("./dictionaries/he.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
};

/** Current locale from the `[locale]` root segment. Server Components only. */
export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  if (!isLocale(value)) notFound();
  return value;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}
