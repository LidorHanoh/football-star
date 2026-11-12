import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { navItems } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href={`/${locale}`} aria-label={dict.meta.siteName}>
          <Logo name={dict.meta.siteName} />
        </Link>

        <nav aria-label={dict.nav.menu} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.slice(1, 4).map(({ key, path }) => (
              <li key={key}>
                <Link href={`/${locale}${path}`} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  {dict.nav[key]}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`/${locale}/leaderboard`} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {dict.nav.leaderboard}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <LocaleSwitcher locale={locale} label={dict.nav.language} />
          <ThemeToggle labels={dict.nav} />
          <div className="hidden sm:block">
            <Suspense fallback={<div className="h-7 w-20 animate-pulse rounded-md bg-muted" />}>
              <UserMenu locale={locale} labels={dict.nav} />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
