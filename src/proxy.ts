import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, enabledLocales, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { updateSession } from "@/lib/supabase/proxy";

function pickLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie) && enabledLocales.includes(fromCookie)) return fromCookie;

  // Accept-Language, e.g. "en-US,en;q=0.9,he;q=0.8". "iw" is the legacy code for Hebrew.
  const header = request.headers.get("accept-language") ?? "";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.split("-")[0].toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of ranked) {
    const normalized = lang === "iw" ? "he" : lang;
    if (isLocale(normalized) && enabledLocales.includes(normalized)) return normalized;
  }
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];

  if (!isLocale(firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  // Skip Next internals, API routes and any file with an extension (favicon, images…).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
