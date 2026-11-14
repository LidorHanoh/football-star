// Load scripts/data/world.json into Supabase: countries, leagues, clubs and
// players with our formula ratings. Idempotent (upserts by Transfermarkt id);
// players with ratings_locked (edited in the admin panel) keep their rating, position and value. Players who left
// all 20 leagues are detached from their club (club_id = null).
//
//   node scripts/import-world.mjs            # build SQL and run it on the linked project
//   node scripts/import-world.mjs --dry-run  # only build SQL + print a summary
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { attributes, clubReputation, gameValue, LEAGUE_STRENGTH, mapPosition, potential, rng, worldRating } from "./lib/ratings.mjs";

const DATA = join(import.meta.dirname, "data");
const OUT = join(import.meta.dirname, ".cache", "sql");
const world = JSON.parse(readFileSync(join(DATA, "world.json"), "utf8"));
const { leagues } = JSON.parse(readFileSync(join(DATA, "leagues.json"), "utf8"));
const clubNamesHe = safeJson(join(DATA, "club-names-he.json"));
const clubNamesEn = safeJson(join(DATA, "club-names-en.json"));
const dryRun = process.argv.includes("--dry-run");

function safeJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

/** API-Football country names → Transfermarkt's spelling (players' nationalities use Transfermarkt's). */
const tmCountry = (c) => ({ USA: "United States", "Saudi-Arabia": "Saudi Arabia" })[c] ?? c;

const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;

// ---------------------------------------------------------------------------
// Build rows
// ---------------------------------------------------------------------------
const countries = new Set();
const clubs = [];
const players = [];
const seen = new Set();

for (const club of world.clubs) {
  const median = [...club.players.map((p) => p.marketValue).filter(Boolean)].sort((a, b) => a - b)[Math.floor(club.players.length / 2)] ?? 100_000;
  const rated = [];
  for (const p of club.players) {
    if (seen.has(p.tmId)) continue; // a player listed twice (loan) stays with the first club
    seen.add(p.tmId);
    const rand = rng(p.tmId);
    const position = mapPosition(p.position);
    const rating = worldRating({ marketValue: p.marketValue, age: p.age, fallbackValue: median / 3 });
    const [nat, nat2] = p.nationalities;
    if (nat) countries.add(nat);
    if (nat2) countries.add(nat2);
    rated.push(rating);
    players.push({
      external_id: p.tmId,
      club: club.tmId,
      name: { en: p.name },
      nationality: nat ?? null,
      second_nationality: nat2 ?? null,
      birth_date: p.birthDate,
      age: p.age,
      position,
      shirt_number: p.number,
      height_cm: p.heightCm,
      foot: p.foot,
      contract_until: p.contractUntil,
      rating_world: rating,
      attributes: attributes(position, rating, p.age, p.heightCm, rand),
      potential: potential(rating, p.age, rand),
      value: gameValue(rating, p.age),
      wage: Math.round(gameValue(rating, p.age) / 250),
    });
  }
  const reputation = clubReputation(rated);
  const xi = [...rated].sort((a, b) => b - a).slice(0, 11);
  const teamRating = Math.round(xi.reduce((t, r) => t + r, 0) / Math.max(xi.length, 1));
  clubs.push({ ...club, reputation, teamRating, budget: Math.round(1_000_000 * Math.pow(1.07, reputation)) });
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const files = [];
const write = (name, sql) => {
  const file = join(OUT, name);
  writeFileSync(file, `begin;\n${sql}\ncommit;\n`);
  files.push(file);
};

write(
  "01-countries-leagues-clubs.sql",
  [
    `insert into public.countries (code, name) values\n${[...countries].sort().map((c) => `  (${q(c)}, ${j({ en: c })})`).join(",\n")}\non conflict (code) do nothing;`,
    `insert into public.leagues (key, external_id, country_code, name, tier, num_teams, strength, is_playable) values\n${leagues
      .map((l) => `  (${q(l.key)}, ${q(l.tm)}, ${q(tmCountry(l.country))}, ${j(l.name)}, ${l.tier}, ${l.clubs.length}, ${LEAGUE_STRENGTH[l.key]}, true)`)
      .join(",\n")}\non conflict (key) do update set external_id = excluded.external_id, country_code = excluded.country_code, name = excluded.name, tier = excluded.tier, num_teams = excluded.num_teams, strength = excluded.strength;`,
    `insert into public.clubs (external_id, api_football_id, league_id, name, reputation, team_rating, budget, founded, city, stadium_name, stadium_capacity) values\n${clubs
      .map(
        (c) =>
          `  (${c.tmId}, ${q(c.apiId)}, (select id from public.leagues where key = ${q(c.league)}), ${j(clubNamesHe[c.name] ? { en: clubNamesEn[c.name] ?? c.name, he: clubNamesHe[c.name] } : { en: clubNamesEn[c.name] ?? c.name })}, ${c.reputation}, ${c.teamRating}, ${c.budget}, ${q(c.founded)}, ${q(c.city)}, ${c.venue ? j({ en: c.venue }) : "null"}, ${q(c.capacity)})`,
      )
      .join(",\n")}\non conflict (external_id) do update set api_football_id = excluded.api_football_id, league_id = excluded.league_id, name = public.clubs.name || excluded.name, reputation = excluded.reputation, team_rating = excluded.team_rating, budget = excluded.budget, founded = excluded.founded, city = excluded.city, stadium_name = excluded.stadium_name, stadium_capacity = excluded.stadium_capacity;`,
  ].join("\n\n"),
);

// League country codes must exist as countries too.
const leagueCountries = leagues.map((l) => tmCountry(l.country));
writeFileSync(files[0], readFileSync(files[0], "utf8").replace("on conflict (code) do nothing;", `on conflict (code) do nothing;\ninsert into public.countries (code, name) values ${leagueCountries.map((c) => `(${q(c)}, ${j({ en: c })})`).join(", ")} on conflict (code) do nothing;`));

const COLS = "external_id, club_id, name, nationality, second_nationality, birth_date, age, position, shirt_number, height_cm, foot, contract_until, rating_world, attributes, potential, value, wage, rating_source";
const CHUNK = 1500;
for (let i = 0; i < players.length; i += CHUNK) {
  const rows = players.slice(i, i + CHUNK).map(
    (p) =>
      `  (${p.external_id}, (select id from public.clubs where external_id = ${p.club}), ${j(p.name)}, ${q(p.nationality)}, ${q(p.second_nationality)}, ${q(p.birth_date)}, ${q(p.age)}, ${q(p.position)}, ${q(p.shirt_number)}, ${q(p.height_cm)}, ${q(p.foot)}, ${q(p.contract_until)}, ${p.rating_world}, ${j(p.attributes)}, ${p.potential}, ${p.value}, ${p.wage}, 'formula')`,
  );
  write(
    `02-players-${String(i / CHUNK + 1).padStart(2, "0")}.sql`,
    `insert into public.players (${COLS}) values\n${rows.join(",\n")}
on conflict (external_id) do update set
  club_id = excluded.club_id, name = public.players.name || jsonb_build_object('en', excluded.name->>'en'),
  nationality = excluded.nationality, second_nationality = excluded.second_nationality, birth_date = excluded.birth_date,
  age = excluded.age, position = case when public.players.ratings_locked then public.players.position else excluded.position end, shirt_number = excluded.shirt_number, height_cm = excluded.height_cm,
  foot = excluded.foot, contract_until = excluded.contract_until,
  rating_world = case when public.players.ratings_locked then public.players.rating_world else excluded.rating_world end,
  attributes   = case when public.players.ratings_locked then public.players.attributes   else excluded.attributes end,
  potential    = case when public.players.ratings_locked then public.players.potential    else excluded.potential end,
  value = case when public.players.ratings_locked then public.players.value else excluded.value end,
  wage  = case when public.players.ratings_locked then public.players.wage  else excluded.wage end;`,
  );
}

write(
  "03-finish.sql",
  `-- Players no longer in any of our squads become free agents.
update public.players set club_id = null
where club_id is not null and external_id not in (${players.map((p) => p.external_id).join(",")});

-- Team strength from the stored ratings (includes hand-edited players).
select public.recompute_team_ratings();

update public.data_snapshots set is_current = false where is_current;
insert into public.data_snapshots (season, source, is_current) values (${q(world.season)}, 'transfermarkt squads ${world.generatedAt.slice(0, 10)} + researched league lists', true);`,
);

// ---------------------------------------------------------------------------
// Summary + run
// ---------------------------------------------------------------------------
console.log(`${clubs.length} clubs, ${players.length} players, ${countries.size} nationalities, ${files.length} SQL files in ${OUT}`);
for (const key of ["isr", "eng1", "esp"]) {
  const ids = new Set(clubs.filter((c) => c.league === key).map((c) => c.tmId));
  const top = players.filter((p) => ids.has(p.club)).sort((a, b) => b.rating_world - a.rating_world).slice(0, 5);
  console.log(`  top ${key}: ${top.map((p) => `${p.name.en} ${p.rating_world}`).join(", ")}`);
}
const topClubs = [...clubs].sort((a, b) => b.reputation - a.reputation);
console.log(`  top clubs: ${topClubs.slice(0, 6).map((c) => `${c.name} ${c.reputation}`).join(", ")}`);
console.log(`  top Israeli clubs: ${topClubs.filter((c) => c.league === "isr").slice(0, 4).map((c) => `${c.name} ${c.reputation}`).join(", ")}`);

if (!dryRun) {
  for (const file of files) {
    console.log(`Running ${file.split(/[\\/]/).pop()}…`);
    execFileSync("npx", ["supabase", "db", "query", "--remote", "--yes", "-f", `"${file}"`], { stdio: ["ignore", "pipe", "inherit"], shell: true });
  }
  console.log("Import complete.");
}
