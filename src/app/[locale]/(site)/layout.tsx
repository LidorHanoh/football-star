import { BottomNav } from "@/components/bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

/** The regular site chrome: header, footer and the phone bottom nav. Careers run without it. */
export default async function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <>
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
    </>
  );
}
