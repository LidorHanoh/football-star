import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getCareerWorld } from "@/lib/world";
import { AdminPanel } from "./admin-panel";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.title, robots: { index: false, follow: false } };
}

export default async function AdminPage() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-3xl font-extrabold">{dict.admin.title}</h1>
      <p className="mb-6 text-muted-foreground">{dict.admin.subtitle}</p>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
        <AdminGate t={dict.admin} positions={dict.career.positions} locale={locale} />
      </Suspense>
    </section>
  );
}

async function AdminGate(props: Omit<React.ComponentProps<typeof AdminPanel>, "world">) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();
  const world = await getCareerWorld();
  return <AdminPanel {...props} world={world} />;
}
