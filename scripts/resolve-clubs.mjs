// Step 1 of the world import: match every club in scripts/data/leagues.json to
// its API-Football team id, using cached team lists first and spending API
// requests (one per country) only for clubs that can't be found.
// Output: scripts/data/clubs.json  (commit it; it's our own curated mapping)
//
//   node scripts/resolve-clubs.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BudgetExhausted, CACHE_DIR, get, requestsLeft } from "./lib/api-football.mjs";

const DATA = join(import.meta.dirname, "data");
const { leagues } = JSON.parse(readFileSync(join(DATA, "leagues.json"), "utf8"));

/** Hand-picked ids for names that fuzzy matching can't settle. */
const overrides = JSON.parse(readFileSync(join(DATA, "club-overrides.json"), "utf8"));

const STOP = new Set(["fc", "cf", "sc", "afc", "ac", "as", "sv", "fk", "kv", "sk", "cd", "club", "de", "da", "the", "1893", "29", "05", "04", "07"]);
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(" ");

/** All teams we have cached, keyed by id. */
function cachedTeams() {
  const teams = new Map();
  const dir = join(CACHE_DIR, "teams");
  for (const file of readdirSync(dir)) {
    const body = JSON.parse(readFileSync(join(dir, file), "utf8"));
    for (const { team, venue } of body.response) teams.set(team.id, { ...team, venue });
  }
  return [...teams.values()];
}

/** Clubs registered under a neighbouring country (Welsh clubs in England, Canadian clubs in MLS, Vaduz in Switzerland). */
const EXTRA_COUNTRIES = { England: ["Wales"], USA: ["Canada"], Switzerland: ["Liechtenstein"] };

function findTeam(name, country, teams) {
  const n = norm(name);
  const countries = [country, ...(EXTRA_COUNTRIES[country] ?? [])];
  const pool = teams.filter((t) => countries.includes(t.country));
  const exact = pool.filter((t) => norm(t.name) === n);
  if (exact.length) return pickSenior(exact);
  // every word of the wanted name appears in the team name (or vice versa)
  const words = n.split(" ");
  const partial = pool.filter((t) => {
    const tn = norm(t.name).split(" ");
    return words.every((w) => tn.includes(w)) || (tn.length && tn.every((w) => words.includes(w)));
  });
  return partial.length ? pickSenior(partial) : null;
}

/** Prefer the senior team over women's / youth / B teams. */
function pickSenior(list) {
  const senior = list.filter((t) => !/\b(W|U\d\d|II|B|Reserves?)\b/.test(t.name));
  const pool = senior.length ? senior : list;
  return pool.length === 1 ? pool[0] : pool.sort((a, b) => a.id - b.id)[0];
}

let teams = cachedTeams();
const out = [];
const missing = [];

for (const pass of [1, 2]) {
  missing.length = 0;
  out.length = 0;
  for (const league of leagues) {
    for (const name of league.clubs) {
      const forced = overrides[`${league.key}:${name}`];
      const team = forced ? teams.find((t) => t.id === forced) : findTeam(name, league.country, teams);
      if (team) out.push({ league: league.key, name, api: team.id, apiName: team.name, founded: team.founded, venue: team.venue?.name ?? null, capacity: team.venue?.capacity ?? null, city: team.venue?.city ?? null });
      else missing.push({ league, name });
    }
  }
  if (!missing.length || pass === 2) break;

  // Fetch the full team list of each country that still has unmatched clubs.
  const countries = [...new Set(missing.flatMap((m) => [m.league.country, ...(EXTRA_COUNTRIES[m.league.country] ?? [])]))];
  console.log(`Fetching ${countries.length} country team lists for ${missing.length} clubs…`);
  try {
    for (const country of countries) await get("/teams", { country });
  } catch (e) {
    if (!(e instanceof BudgetExhausted)) throw e;
    console.log(e.message);
  }
  teams = cachedTeams();
}

writeFileSync(join(DATA, "clubs.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`Matched ${out.length} clubs.`);
if (missing.length) {
  console.log(`Unmatched (${missing.length}) — add to club-overrides.json:`);
  for (const m of missing) console.log(`  ${m.league.key}:${m.name}`);
}
console.log("API requests left today:", requestsLeft() ?? "(none used)");
