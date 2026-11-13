import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).terms.title };
}

export default async function TermsPage() {
  const dict = await getDictionary();
  return <LegalPage doc={dict.terms} legal={dict.legal} />;
}
