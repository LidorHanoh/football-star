import { ClipboardListIcon, HouseIcon, ShirtIcon, TrophyIcon, UserIcon, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";

export type NavKey = keyof Pick<Dictionary["nav"], "home" | "playerCareer" | "managerCareer" | "leaderboard" | "profile">;

export const navItems: { key: NavKey; path: string; icon: LucideIcon }[] = [
  { key: "home", path: "", icon: HouseIcon },
  { key: "playerCareer", path: "/player-career", icon: ShirtIcon },
  { key: "managerCareer", path: "/manager-career", icon: ClipboardListIcon },
  { key: "leaderboard", path: "/leaderboard", icon: TrophyIcon },
  { key: "profile", path: "/profile", icon: UserIcon },
];
