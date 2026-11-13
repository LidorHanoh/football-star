import type { Metadata } from "next";
import { CareerApp } from "@/components/career/career-app";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getCareerWorld } from "@/lib/world";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.playerCareer };
}

export default async function PlayerCareerPage() {
  const [dict, locale, world] = await Promise.all([getDictionary(), getLocale(), getCareerWorld()]);
  return <CareerApp world={world} t={dict.career} locale={locale} />;
}
