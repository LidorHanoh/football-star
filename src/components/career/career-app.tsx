"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createCareer, startOffers, type NewPlayerInput } from "@/lib/engine/career";
import type { CareerSave, World } from "@/lib/engine/types";
import { AgentPicker } from "./agent-picker";
import { CreatePlayer } from "./create-player";
import { Dashboard } from "./dashboard";
import { type CareerDict, clubName, fill, loadSaves, storeSaves } from "./helpers";
import { LeaguePicker } from "./league-picker";
import { OffersScreen } from "./offers";
import { SeasonEnd } from "./season-end";

type Screen = { kind: "list" } | { kind: "create" } | { kind: "league"; input: NewPlayerInput } | { kind: "career"; id: string };

const subscribe = () => () => {};

export function CareerApp({ world, t, locale }: { world: World; t: CareerDict; locale: Locale }) {
  // localStorage only exists in the browser: render the list after hydration.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [saves, setSaves] = useState<CareerSave[]>([]);
  const [screen, setScreen] = useState<Screen>({ kind: "list" });

  useEffect(() => {
    if (hydrated) setSaves(loadSaves()); // eslint-disable-line react-hooks/set-state-in-effect -- one-time load from device storage
  }, [hydrated]);

  const active = screen.kind === "career" ? saves.find((s) => s.id === screen.id) : undefined;

  function update(save: CareerSave) {
    setSaves((prev) => {
      const next = [{ ...save, updatedAt: new Date().toISOString() }, ...prev.filter((s) => s.id !== save.id)];
      storeSaves(next);
      return next;
    });
  }

  function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    setSaves((prev) => {
      const next = prev.filter((s) => s.id !== id);
      storeSaves(next);
      return next;
    });
  }

  if (screen.kind === "create") {
    return <CreatePlayer t={t} onBack={() => setScreen({ kind: "list" })} onDone={(input) => setScreen({ kind: "league", input })} />;
  }

  if (screen.kind === "league") {
    return (
      <LeaguePicker
        t={t}
        world={world}
        locale={locale}
        onBack={() => setScreen({ kind: "create" })}
        onPick={(leagueKey) => {
          const save = startOffers(createCareer(screen.input), world, leagueKey);
          update(save);
          setScreen({ kind: "career", id: save.id });
        }}
      />
    );
  }

  if (active) {
    const props = { save: active, world, t, locale, onChange: update };
    switch (active.phase) {
      case "offers":
        return <OffersScreen {...props} />;
      case "agent":
        return <AgentPicker {...props} />;
      case "season-end":
        return <SeasonEnd {...props} />;
      default:
        return <Dashboard {...props} onExit={() => setScreen({ kind: "list" })} />;
    }
  }

  // --- Career list ---------------------------------------------------------
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-extrabold">{t.title}</h1>
        <Button size="lg" onClick={() => setScreen({ kind: "create" })}>
          <PlusIcon aria-hidden /> {t.newCareer}
        </Button>
      </div>
      {!hydrated ? null : saves.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{t.noCareers}</div>
      ) : (
        <ul className="grid gap-3">
          {saves.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 font-heading text-lg font-extrabold text-primary">{s.player.rating}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{s.player.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {t.positions[s.player.position]} · {fill(t.dashboard.ageYears, { age: s.player.age })}
                  {s.contract ? ` · ${clubName(world, s.contract.clubId, locale)}` : ""}
                </p>
              </div>
              <Button onClick={() => setScreen({ kind: "career", id: s.id })}>{t.continue}</Button>
              <Button variant="ghost" size="icon" aria-label={t.delete} onClick={() => remove(s.id)}>
                <Trash2Icon aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t.savedOnDevice}</p>
    </section>
  );
}

export interface ScreenProps {
  save: CareerSave;
  world: World;
  t: CareerDict;
  locale: Locale;
  onChange: (save: CareerSave) => void;
}
