import { BrainIcon, ClipboardListIcon, HouseIcon, ShirtIcon, UserIcon, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";

export type NavKey = keyof Pick<Dictionary["nav"], "home" | "trivia" | "playerCareer" | "managerCareer" | "profile">;

export const navItems: { key: NavKey; path: string; icon: LucideIcon }[] = [
  { key: "home", path: "", icon: HouseIcon },
  { key: "trivia", path: "/trivia", icon: BrainIcon },
  { key: "playerCareer", path: "/player-career", icon: ShirtIcon },
  { key: "managerCareer", path: "/manager-career", icon: ClipboardListIcon },
  { key: "profile", path: "/profile", icon: UserIcon },
];
