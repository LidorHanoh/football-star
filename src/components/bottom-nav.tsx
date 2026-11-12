"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { navItems, type NavKey } from "./nav-items";

/** Mobile-only tab bar fixed to the bottom of the screen. */
export function BottomNav({ locale, labels, menuLabel }: { locale: Locale; labels: Record<NavKey, string>; menuLabel: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={menuLabel} className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {navItems.map(({ key, path, icon: Icon }) => {
          const href = `/${locale}${path}`;
          const active = path === "" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="truncate">{labels[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
