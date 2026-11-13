import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="border-t pb-20 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {dict.footer.disclaimer} {dict.footer.nonCommercial}
        </p>
        <nav className="flex shrink-0 gap-4">
          <Link href={`/${locale}/about`} className="hover:text-foreground hover:underline">
            {dict.nav.about}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-foreground hover:underline">
            {dict.nav.privacy}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-foreground hover:underline">
            {dict.nav.terms}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
