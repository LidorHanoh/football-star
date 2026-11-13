import type { Metadata, Viewport } from "next";
import { Cairo, Heebo } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getDir, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import "../globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo" });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  const locale = await getLocale();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
    title: { default: dict.meta.siteName, template: `%s · ${dict.meta.siteName}` },
    description: dict.meta.description,
    applicationName: dict.meta.siteName,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: { siteName: dict.meta.siteName, locale, type: "website" },
    // Arabic stays out of search engines until Phase 1.5 launches it.
    robots: locale === "ar" && process.env.NEXT_PUBLIC_ENABLE_ARABIC !== "true" ? { index: false } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1024" },
  ],
};

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <html lang={locale} dir={getDir(locale)} suppressHydrationWarning className={`${heebo.variable} ${cairo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <SiteHeader locale={locale} dict={dict} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} dict={dict} />
          <BottomNav
            locale={locale}
            menuLabel={dict.nav.menu}
            labels={{
              home: dict.nav.home,
              playerCareer: dict.nav.playerCareer,
              managerCareer: dict.nav.managerCareer,
              leaderboard: dict.nav.leaderboard,
              profile: dict.nav.profile,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
