import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { getCurrentProfile } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

/** Reads the session — render inside <Suspense>. */
export async function UserMenu({ locale, labels }: { locale: Locale; labels: { login: string; logout: string } }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <Link href={`/${locale}/auth/login`} className={buttonVariants({ size: "sm" })}>
        {labels.login}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/${locale}/profile`} className="max-w-32 truncate text-sm font-medium hover:underline" dir="auto">
        {profile.display_name || profile.username}
      </Link>
      <SignOutButton label={labels.logout} />
    </div>
  );
}
