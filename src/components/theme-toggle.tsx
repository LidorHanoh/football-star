"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

type Labels = { theme: string; themeLight: string; themeDark: string; themeSystem: string };

const order = ["system", "light", "dark"] as const;
const subscribe = () => () => {};

/** Cycles system → light → dark. */
export function ThemeToggle({ labels }: { labels: Labels }) {
  const { theme = "system", setTheme } = useTheme();
  // Theme is only known on the client; render a neutral icon on the server.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const current = mounted ? (theme as (typeof order)[number]) : "system";
  const next = order[(order.indexOf(current) + 1) % order.length];
  const Icon = current === "light" ? SunIcon : current === "dark" ? MoonIcon : MonitorIcon;
  const name = { system: labels.themeSystem, light: labels.themeLight, dark: labels.themeDark }[current];

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label={`${labels.theme}: ${name}`} title={`${labels.theme}: ${name}`}>
      <Icon />
    </Button>
  );
}
