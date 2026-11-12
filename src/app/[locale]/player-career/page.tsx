import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.playerCareer };
}

export default async function PlayerCareerPage() {
  const dict = await getDictionary();
  return <ComingSoon title={dict.home.playerTitle} description={dict.home.playerDesc} />;
}
