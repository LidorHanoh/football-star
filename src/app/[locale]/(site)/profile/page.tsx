import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/get-dictionary";
import { getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).profile.title };
}

export default async function ProfilePage() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-extrabold">{dict.profile.title}</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
        <ProfileDetails dict={dict} locale={locale} />
      </Suspense>
    </section>
  );
}

async function ProfileDetails({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const profile = await getCurrentProfile();
  const t = dict.profile;

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.guestTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted-foreground">{t.guestBody}</p>
          <Link href={`/${locale}/auth/login`} className={buttonVariants()}>
            {dict.nav.login}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: t.level, value: profile.level },
    { label: t.xp, value: profile.xp },
    { label: t.streak, value: profile.daily_streak },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle dir="auto">{profile.display_name || profile.username}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t.username}: <span dir="ltr">@{profile.username}</span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-3 text-center">
          {stats.map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-heading text-2xl font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {profile.role === "admin" && (
          <Link href={`/${locale}/admin`} className={buttonVariants({ variant: "outline" })}>
            🛠️ {dict.admin.link}
          </Link>
        )}
        <p className="text-xs text-muted-foreground">
          {t.memberSince}: {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(profile.created_at))}
        </p>
      </CardContent>
    </Card>
  );
}
