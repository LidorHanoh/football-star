import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.title, robots: { index: false } };
}

export default async function LoginPage() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const t = dict.auth;

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isSupabaseConfigured ? (
            <LoginForm locale={locale} labels={t} />
          ) : (
            <p className="rounded-lg bg-muted p-3 text-sm">{t.notConfigured}</p>
          )}
          <Link href={`/${locale}`} className="text-center text-sm text-muted-foreground hover:text-foreground hover:underline">
            {t.continueAsGuest}
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
