import { ActivityIcon, DumbbellIcon, FlameIcon, HandshakeIcon, HeartPulseIcon, SmileIcon, type LucideIcon } from "lucide-react";
import type { Bars } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import type { CareerDict } from "./helpers";

const META: { key: keyof Bars; icon: LucideIcon }[] = [
  { key: "trust", icon: HandshakeIcon },
  { key: "form", icon: FlameIcon },
  { key: "training", icon: DumbbellIcon },
  { key: "fitness", icon: HeartPulseIcon },
  { key: "morale", icon: SmileIcon },
  { key: "fans", icon: ActivityIcon },
];

const tone = (v: number) => (v >= 70 ? "bg-emerald-500" : v >= 45 ? "bg-amber-400" : "bg-rose-500");

export function StatusBars({ bars, t }: { bars: Bars; t: CareerDict }) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
      {META.map(({ key, icon: Icon }) => (
        <li key={key}>
          <div className="mb-1 flex items-center gap-1.5 text-sm">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <span className="flex-1 truncate">{t.bars[key]}</span>
            <span className="font-bold tabular-nums">{bars[key]}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={bars[key]} aria-valuemin={0} aria-valuemax={100} aria-label={t.bars[key]}>
            <div className={cn("h-full rounded-full transition-all duration-700", tone(bars[key]))} style={{ width: `${bars[key]}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
