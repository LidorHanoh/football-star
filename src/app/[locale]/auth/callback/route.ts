import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

/** OAuth / magic-link landing: exchanges the one-time code for a session cookie. */
export async function GET(request: NextRequest, ctx: RouteContext<"/[locale]/auth/callback">) {
  const { locale: raw } = await ctx.params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: true };
    if (!error) return NextResponse.redirect(`${origin}/${locale}/profile`);
  }

  return NextResponse.redirect(`${origin}/${locale}/auth/login?error=1`);
}
