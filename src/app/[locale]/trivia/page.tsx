import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.trivia };
}

export default async function TriviaPage() {
  const dict = await getDictionary();
  return <ComingSoon title={dict.home.triviaTitle} description={dict.home.triviaDesc} />;
}
