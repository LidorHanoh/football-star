export const locales = ["he", "en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "he";

/** Arabic is wired up but hidden until Phase 1.5 (set NEXT_PUBLIC_ENABLE_ARABIC=true to show it). */
export const enabledLocales: readonly Locale[] =
  process.env.NEXT_PUBLIC_ENABLE_ARABIC === "true" ? locales : ["he", "en"];

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeNames: Record<Locale, string> = {
  he: "עברית",
  en: "English",
  ar: "العربية",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function getDir(locale: Locale): "rtl" | "ltr" {
  return locale === "en" ? "ltr" : "rtl";
}

/** Replace the locale segment of a pathname, e.g. ("/he/profile", "en") -> "/en/profile". */
export function swapLocale(pathname: string, locale: Locale): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) parts[1] = locale;
  else parts.splice(1, 0, locale);
  return parts.join("/") || `/${locale}`;
}
