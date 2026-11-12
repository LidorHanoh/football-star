import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.leaderboard };
}

export default async function LeaderboardPage() {
  const dict = await getDictionary();
  return <ComingSoon title={dict.nav.leaderboard} />;
}
