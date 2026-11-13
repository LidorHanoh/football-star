import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).privacy.title };
}

export default async function PrivacyPage() {
  const dict = await getDictionary();
  return <LegalPage doc={dict.privacy} legal={dict.legal} />;
}
