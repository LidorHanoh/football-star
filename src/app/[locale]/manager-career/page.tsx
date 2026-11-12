import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.managerCareer };
}

export default async function ManagerCareerPage() {
  const dict = await getDictionary();
  return <ComingSoon title={dict.home.managerTitle} description={dict.home.managerDesc} />;
}
