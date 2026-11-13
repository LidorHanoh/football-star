import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, enabledLocales, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { updateSession } from "@/lib/supabase/proxy";

function pickLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie) && enabledLocales.includes(fromCookie)) return fromCookie;

  // Everyone starts in Hebrew, whatever their browser language. The language
  // switcher sets the cookie above, so a chosen language is remembered.
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
