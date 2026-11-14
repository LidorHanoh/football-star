import { ActivityIcon, DumbbellIcon, FlameIcon, HandshakeIcon, HeartPulseIcon, UsersIcon, type LucideIcon } from "lucide-react";
import type { Bars } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { CareerDict } from "./helpers";

const META: { key: keyof Bars; icon: LucideIcon }[] = [
  { key: "form", icon: FlameIcon },
  { key: "fitness", icon: HeartPulseIcon },
  { key: "trust", icon: HandshakeIcon },
  { key: "training", icon: DumbbellIcon },
  { key: "chemistry", icon: UsersIcon },
  { key: "fans", icon: ActivityIcon },
];

const tone = (v: number) => (v >= 70 ? "bg-emerald-500" : v >= 45 ? "bg-amber-400" : "bg-rose-500");

/** Six bars: 2 columns on a phone, 3 on a computer. */
export function StatusBars({ bars, t }: { bars: Bars; t: CareerDict }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
      {META.map(({ key, icon: Icon }) => {
        const v = bars[key] ?? 50;
        return (
          <li key={key}>
            <div className="mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
              <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate">{t.bars[key]}</span>
              <span className="font-bold tabular-nums">{v}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={t.bars[key]}>
              <div className={cn("h-full rounded-full transition-all duration-700", tone(v))} style={{ width: `${v}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
