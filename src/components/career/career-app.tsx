"use client";

import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getDir, type Locale } from "@/i18n/config";
import { createCareer, startOffers, type NewPlayerInput } from "@/lib/engine/career";
import { clubKit } from "@/lib/engine/people";
import type { CareerSave, World } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { AgentPicker } from "./agent-picker";
import { ContractScreen } from "./contract-screen";
import { CreatePlayer } from "./create-player";
import { Crest } from "./crest";
import { Dashboard } from "./dashboard";
import { Face } from "./face";
import { type CareerDict, fill, loadSaves, storeSaves, teamName } from "./helpers";
import { RegionPicker } from "./region-picker";
import { OffersScreen } from "./offers";
import { SeasonEnd } from "./season-end";
import { TopicPicker } from "./trivia";

type Screen = { kind: "list" } | { kind: "create" } | { kind: "topics"; input: NewPlayerInput } | { kind: "league"; input: NewPlayerInput } | { kind: "career"; id: string };

const subscribe = () => () => {};

/**
 * Player Career runs full-screen without the site's menus: a slim top bar with
 * a back button is all the chrome there is.
 */
export function CareerApp({ world, t, locale }: { world: World; t: CareerDict; locale: Locale }) {
  // localStorage only exists in the browser: render the list after hydration.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [saves, setSaves] = useState<CareerSave[]>([]);
  const [screen, setScreen] = useState<Screen>({ kind: "list" });

  useEffect(() => {
    if (hydrated) setSaves(loadSaves()); // eslint-disable-line react-hooks/set-state-in-effect -- one-time load from device storage
  }, [hydrated]);

  const active0 = screen.kind === "career" ? saves.find((s) => s.id === screen.id) : undefined;
  const view = `${screen.kind}:${active0?.phase}:${!!active0?.signed}`;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

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

  const back = screen.kind === "list" ? null : screen.kind === "league" ? () => setScreen({ kind: "topics", input: screen.input }) : screen.kind === "topics" ? () => setScreen({ kind: "create" }) : () => setScreen({ kind: "list" });
  const BackIcon = getDir(locale) === "rtl" ? ArrowRightIcon : ArrowLeftIcon;

  let body: React.ReactNode;
  if (screen.kind === "create") {
    body = <CreatePlayer t={t} locale={locale} onDone={(input) => setScreen({ kind: "topics", input })} />;
  } else if (screen.kind === "topics") {
    body = <TopicPicker t={t} onDone={(trivia) => setScreen({ kind: "league", input: { ...screen.input, trivia } })} />;
  } else if (screen.kind === "league") {
    body = (
      <RegionPicker
        t={t}
        world={world}
        locale={locale}
        onPick={(leagueKeys) => {
          const save = startOffers(createCareer(screen.input), world, leagueKeys);
          update(save);
          setScreen({ kind: "career", id: save.id });
        }}
      />
    );
  } else if (active) {
    const props = { save: active, world, t, locale, onChange: update };
    body = active.signed ? (
      <ContractScreen save={active} world={world} t={t} locale={locale} onDone={() => update({ ...active, signed: undefined })} />
    ) : active.phase === "offers" ? (
        <OffersScreen {...props} />
      ) : active.phase === "agent" ? (
        <AgentPicker {...props} />
      ) : active.phase === "season-end" ? (
        <SeasonEnd {...props} />
      ) : (
        <Dashboard key={active.id} {...props} />
      );
  } else {
    body = <CareerList saves={saves} hydrated={hydrated} world={world} t={t} locale={locale} onNew={() => setScreen({ kind: "create" })} onOpen={(id) => setScreen({ kind: "career", id })} onDelete={remove} />;
  }

  const club = active?.contract ? world.clubs.find((c) => c.id === active.contract!.clubId) : undefined;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-gradient-to-b from-primary/5 via-background to-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-2 pt-[env(safe-area-inset-top)] sm:px-4">
          {back ? (
            <Button variant="ghost" size="sm" onClick={back} className="gap-1.5">
              <BackIcon aria-hidden /> {t.back}
            </Button>
          ) : (
            <Link href={`/${locale}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}>
              <BackIcon aria-hidden /> {t.exit}
            </Link>
          )}
          <p className="min-w-0 flex-1 truncate text-center font-heading font-extrabold">{active ? active.player.name : t.title}</p>
          {active ? (
            <span className="flex items-center gap-1.5">
              {club && <Crest club={club} className="size-7" />}
              <Face seed={active.player.face} kit={club ? clubKit(club) : undefined} className="size-9 overflow-hidden rounded-full" />
            </span>
          ) : (
            <span className="w-16" />
          )}
        </div>
      </header>
      <main key={screen.kind === "career" ? `${screen.id}-${active?.phase}-${!!active?.signed}` : screen.kind} className="animate-fade flex-1">
        {body}
      </main>
    </div>
  );
}

function CareerList({ saves, hydrated, world, t, locale, onNew, onOpen, onDelete }: { saves: CareerSave[]; hydrated: boolean; world: World; t: CareerDict; locale: Locale; onNew: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <section className="mx-auto max-w-3xl px-3 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold sm:text-3xl">{t.title}</h1>
        <Button size="lg" className="shine h-12" onClick={onNew}>
          <PlusIcon aria-hidden /> {t.newCareer}
        </Button>
      </div>
      {!hydrated ? null : saves.length === 0 ? (
        <button onClick={onNew} className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground transition hover:border-primary hover:text-foreground">
          <span className="animate-float text-5xl">⚽</span>
          {t.noCareers}
        </button>
      ) : (
        <ul className="grid gap-3">
          {saves.map((s, i) => {
            const club = s.contract ? world.clubs.find((c) => c.id === s.contract!.clubId) : undefined;
            return (
              <li key={s.id} className="animate-rise flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md" style={{ animationDelay: `${i * 60}ms` }}>
                <button className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => onOpen(s.id)}>
                  <span className="relative shrink-0">
                    <Face seed={s.player.face} kit={club ? clubKit(club) : undefined} number={s.player.kit} className="size-16 overflow-hidden rounded-xl" />
                    <span className="absolute -end-1.5 -bottom-1.5 grid size-7 place-items-center rounded-lg bg-primary text-xs font-black text-primary-foreground ring-2 ring-card">{s.player.rating}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{s.player.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {t.positions[s.player.position]} · {fill(t.dashboard.ageYears, { age: s.player.age })}
                    </span>
                    {club && (
                      <span className="mt-0.5 flex items-center gap-1.5 text-sm">
                        <Crest club={club} className="size-4" /> <span className="truncate">{teamName(world, club.id, locale, s.contract!.level, s.player.age)}</span>
                      </span>
                    )}
                  </span>
                </button>
                <Button onClick={() => onOpen(s.id)}>{t.continue}</Button>
                <Button variant="ghost" size="icon" aria-label={t.delete} onClick={() => onDelete(s.id)}>
                  <Trash2Icon aria-hidden />
                </Button>
              </li>
            );
          })}
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
