"use client";

import { CheckIcon, LockIcon, MinusIcon, PlusIcon, SearchIcon, Undo2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Crest } from "@/components/career/crest";
import { fill, localized } from "@/components/career/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { POSITIONS, type Localized, type World } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { revertChange, updatePlayer } from "./actions";

type T = Dictionary["admin"];
interface Row {
  id: string;
  name: Localized;
  position: string;
  age: number | null;
  rating_world: number;
  potential: number | null;
  ratings_locked: boolean;
  club_id: string | null;
}
interface Change {
  id: number;
  created_at: string;
  old_rating: number;
  new_rating: number;
  old_potential: number | null;
  new_potential: number | null;
  old_position: string;
  new_position: string;
  note: string | null;
  reverted_at: string | null;
  players: { name: Localized; club_id: string | null } | null;
}

const COLS = "id, name, position, age, rating_world, potential, ratings_locked, club_id";

export function AdminPanel({ t, positions, locale, world }: { t: T; positions: Record<string, string>; locale: Locale; world: World }) {
  const [tab, setTab] = useState<"players" | "review">("players");
  return (
    <div className="grid gap-5">
      <div role="tablist" className="flex gap-1 rounded-xl bg-muted p-1">
        {(["players", "review"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition", tab === k ? "bg-background shadow" : "text-muted-foreground")}>
            {t.tabs[k]}
          </button>
        ))}
      </div>
      {tab === "players" ? <Players t={t} positions={positions} locale={locale} world={world} /> : <Review t={t} locale={locale} world={world} />}
    </div>
  );
}

function Players({ t, positions, locale, world }: { t: T; positions: Record<string, string>; locale: Locale; world: World }) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState(world.leagues.find((l) => l.key === "isr")?.key ?? world.leagues[0]?.key ?? "");
  const [clubId, setClubId] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const clubs = world.clubs.filter((c) => c.leagueKey === league).sort((a, b) => localized(a.name, locale).localeCompare(localized(b.name, locale)));
  const club = world.clubs.find((c) => c.id === clubId);

  // Search by name (debounced) or list a whole squad.
  useEffect(() => {
    const q = query.trim().replace(/[,()%*]/g, " ").trim();
    if (q.length < 2 && !clubId) return;
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        const supabase = createClient();
        const base = supabase.from("players").select(COLS).order("rating_world", { ascending: false });
        const { data } = q.length >= 2 ? await base.or(`name->>en.ilike.%${q}%,name->>he.ilike.%${q}%`).limit(40) : await base.eq("club_id", clubId).limit(60);
        if (!cancelled) {
          setRows((data as Row[] | null) ?? []);
          setLoading(false);
        }
      },
      q.length >= 2 ? 300 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, clubId]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">{t.search}</span>
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} className="h-11 ps-9" />
        </label>
        <select
          aria-label={t.league}
          value={league}
          onChange={(e) => {
            setLeague(e.target.value);
            setClubId("");
          }}
          className="h-11 rounded-md border bg-background px-3 text-sm"
        >
          {world.leagues.map((l) => (
            <option key={l.key} value={l.key}>
              {localized(l.name, locale)}
            </option>
          ))}
        </select>
        <select
          aria-label={t.club}
          value={clubId}
          onChange={(e) => {
            setClubId(e.target.value);
            setQuery("");
          }}
          className="h-11 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">{t.pickClub}</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {localized(c.name, locale)}
            </option>
          ))}
        </select>
      </div>

      {club && !query && (
        <div className="flex items-center gap-3">
          <Crest club={club} className="size-10" />
          <p className="font-heading text-xl font-bold">{localized(club.name, locale)}</p>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm tabular-nums">{fill(t.teamRating, { n: club.teamRating })}</span>
        </div>
      )}

      {loading && <div className="h-24 animate-pulse rounded-2xl bg-muted" />}
      {!loading && rows && rows.length === 0 && <p className="text-muted-foreground">{t.noResults}</p>}
      {!loading && rows && rows.length > 0 && (
        <ul className="grid gap-2">
          {rows.map((r) => (
            <PlayerRow key={r.id} row={r} t={t} positions={positions} locale={locale} world={world} onSaved={(nr) => setRows((all) => all!.map((x) => (x.id === nr.id ? nr : x)))} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PlayerRow({ row, t, positions, locale, world, onSaved }: { row: Row; t: T; positions: Record<string, string>; locale: Locale; world: World; onSaved: (r: Row) => void }) {
  const [rating, setRating] = useState(row.rating_world);
  const [potential, setPotential] = useState(row.potential ?? row.rating_world);
  const [position, setPosition] = useState(row.position);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const club = world.clubs.find((c) => c.id === row.club_id);
  const name = localized(row.name, locale);
  const dirty = rating !== row.rating_world || potential !== (row.potential ?? row.rating_world) || position !== row.position;

  function save() {
    start(async () => {
      const res = await updatePlayer({ id: row.id, rating, potential: Math.max(potential, rating), position, note });
      if (res.ok) {
        setMsg({ ok: true, text: fill(t.saved, { name, from: row.rating_world, to: rating }) });
        onSaved({ ...row, rating_world: rating, potential: Math.max(potential, rating), position, ratings_locked: true });
        setNote("");
        router.refresh();
      } else setMsg({ ok: false, text: fill(t.error, { msg: res.error }) });
    });
  }

  const stepper = (label: string, value: number, set: (n: number) => void) => (
    <div className="flex items-center gap-1">
      <span className="w-16 text-xs text-muted-foreground">{label}</span>
      <Button type="button" size="icon" variant="outline" className="size-9" aria-label={`${label} −1`} onClick={() => set(Math.max(1, value - 1))}>
        <MinusIcon aria-hidden />
      </Button>
      <input
        type="number"
        min={1}
        max={99}
        value={value}
        onChange={(e) => set(Math.max(1, Math.min(99, Math.round(Number(e.target.value) || 1))))}
        className="h-9 w-14 rounded-md border bg-background text-center font-heading text-lg font-black tabular-nums"
        aria-label={label}
      />
      <Button type="button" size="icon" variant="outline" className="size-9" aria-label={`${label} +1`} onClick={() => set(Math.min(99, value + 1))}>
        <PlusIcon aria-hidden />
      </Button>
    </div>
  );

  return (
    <li className={cn("grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto]", dirty && "border-primary ring-2 ring-primary/20")}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary font-heading text-xl font-black text-primary-foreground tabular-nums">{row.rating_world}</span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-bold" dir="auto">
            {name}
            {row.ratings_locked && <LockIcon className="size-3.5 shrink-0 text-amber-500" aria-label={t.locked} />}
          </p>
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            {club && <Crest club={club} className="size-4" />}
            <span className="truncate">{club ? localized(club.name, locale) : "—"}</span>
            <span>· {positions[row.position] ?? row.position}</span>
            {row.age ? <span>· {t.age} {row.age}</span> : null}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {stepper(t.rating, rating, setRating)}
          {stepper(t.potential, potential, setPotential)}
          <select aria-label={t.position} value={position} onChange={(e) => setPosition(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {positions[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        {dirty && (
          <div className="flex gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.note} maxLength={200} className="h-9" />
            <Button onClick={save} disabled={pending} className="h-9">
              <CheckIcon aria-hidden /> {pending ? t.saving : t.save}
            </Button>
          </div>
        )}
        {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{msg.text}</p>}
      </div>
    </li>
  );
}

function Review({ t, locale, world }: { t: T; locale: Locale; world: World }) {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("rating_changes")
      .select("id, created_at, old_rating, new_rating, old_potential, new_potential, old_position, new_position, note, reverted_at, players(name, club_id)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) setError(e.message);
        setChanges((data as unknown as Change[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!changes) return <div className="h-32 animate-pulse rounded-2xl bg-muted" />;
  if (error) return <p className="text-destructive">{fill(t.error, { msg: error })}</p>;
  if (!changes.length) return <p className="text-muted-foreground">{t.noChanges}</p>;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
  return (
    <ul className="grid gap-2">
      {changes.map((c) => {
        const club = world.clubs.find((x) => x.id === c.players?.club_id);
        const name = c.players ? localized(c.players.name, locale) : "?";
        const up = c.new_rating >= c.old_rating;
        return (
          <li key={c.id} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3", c.reverted_at && "opacity-55")}>
            {club && <Crest club={club} className="size-8" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold" dir="auto">
                {name}{" "}
                <span dir="ltr" className={cn("font-heading font-black tabular-nums", up ? "text-emerald-600" : "text-rose-600")}>
                  {c.old_rating} → {c.new_rating}
                </span>
                {c.old_position !== c.new_position && (
                  <span dir="ltr" className="ms-2 text-xs text-muted-foreground">
                    {c.old_position} → {c.new_position}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {date.format(new Date(c.created_at))}
                {c.note ? ` · ${c.note}` : ""}
              </p>
            </div>
            {c.reverted_at ? (
              <span className="text-xs font-semibold text-muted-foreground">{t.reverted}</span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await revertChange(c.id);
                    if (res.ok) {
                      setChanges((all) => all!.map((x) => (x.id === c.id ? { ...x, reverted_at: new Date().toISOString() } : x)));
                      router.refresh();
                    } else setError(res.error);
                  })
                }
              >
                <Undo2Icon aria-hidden /> {t.revert}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
