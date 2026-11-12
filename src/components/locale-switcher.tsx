"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { enabledLocales, LOCALE_COOKIE, localeNames, swapLocale, type Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

/** Remember the choice in a cookie (used by proxy.ts) and on the profile (fire-and-forget; guests skipped). */
function persistLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  if (!isSupabaseConfigured) return;
  const supabase = createClient();
  supabase.auth.getClaims().then(({ data }) => {
    const id = data?.claims.sub;
    if (id) supabase.from("profiles").update({ preferred_locale: next }).eq("id", id).then(() => {});
  });
}

export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    persistLocale(next);
    startTransition(() => router.push(swapLocale(pathname, next) + window.location.search));
  }

  return (
    <div role="group" aria-label={label} className={cn("flex rounded-lg border p-0.5 text-xs", pending && "opacity-60")}>
      {enabledLocales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => change(l)}
          aria-pressed={l === locale}
          className={cn(
            "rounded-md px-2 py-1 font-medium transition-colors",
            l === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {localeNames[l]}
        </button>
      ))}
    </div>
  );
}
