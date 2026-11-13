// World import from Transfermarkt: current squads with full names, detailed
// positions, birth dates, nationalities, heights and market values.
//
// 1. Match every club in scripts/data/leagues.json to its Transfermarkt id
//    (competition page first, quick search as a fallback).
// 2. Download each club's detailed squad page (cached; ~4s per club).
// 3. Write scripts/data/world.json for the database import.
//
//   npm run data:tm
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cacheFile, isCached, page, parseCompetitionClubs, parseSquad } from "./lib/transfermarkt.mjs";

const DATA = join(import.meta.dirname, "data");
const { leagues, season } = JSON.parse(readFileSync(join(DATA, "leagues.json"), "utf8"));
const apiClubs = JSON.parse(readFileSync(join(DATA, "clubs.json"), "utf8"));
/** "<league>:<name>": tmId, for names fuzzy matching can't settle. */
const overrides = JSON.parse(readFileSync(join(DATA, "tm-overrides.json"), "utf8"));

const STOP = new Set(["fc", "cf", "sc", "afc", "ac", "as", "sv", "fk", "kv", "sk", "cd", "ca", "club", "de", "da", "do", "the", "sfc", "jk", "ss", "us", "bc", "cfc", "calcio", "1907", "1909", "1913", "1893", "1879", "1902", "29", "05", "04", "07", "atletico", "clube", "futebol"]);
const ALIAS = { "manchester utd": "manchester united", wolves: "wolverhampton wanderers", "west brom": "west bromwich albion", qpr: "queens park rangers", "sheffield utd": "sheffield united", "dundee utd": "dundee united", inter: "inter milan", "bayern munchen": "bayern munich", "lask linz": "lask", "wsg wattens": "wsg tirol", "olympiakos piraeus": "olympiacos piraeus", "al hilal saudi": "al hilal", "new york red bulls": "red bull new york", "atletico mg": "mineiro", "independ rivadavia": "independiente rivadavia", "argentinos jrs": "argentinos juniors", rennes: "rennais" };
const norm = (s) => {
  const n = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (ALIAS[n] ?? n).split(" ").filter((w) => w && !STOP.has(w));
};

function score(a, b) {
  const A = norm(a);
  const B = norm(b);
  if (!A.length || !B.length) return 0;
  const hits = A.filter((w) => B.some((x) => x === w || (w.length >= 4 && x.length >= 4 && (x.startsWith(w) || w.startsWith(x))))).length;
  return hits / Math.max(A.length, 1) + hits / Math.max(B.length, 1);
}

async function searchClub(name) {
  const html = await page(`/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(name)}&Verein_page=1`);
  return [...html.matchAll(/<a title="([^"]+)" href="\/([^/]+)\/startseite\/verein\/(\d+)"/g)].map((m) => ({ tmId: Number(m[3]), slug: m[2], name: m[1] }));
}

// ---------------------------------------------------------------------------
// 1. Clubs
// ---------------------------------------------------------------------------
const clubs = [];
for (const league of leagues) {
  const html = await page(`/x/startseite/wettbewerb/${league.tm}/plus/?saison_id=${league.tmSeason}`);
  const pool = parseCompetitionClubs(html);
  const used = new Set();
  for (const name of league.clubs) {
    let match = null;
    const forced = overrides[`${league.key}:${name}`];
    if (forced) match = pool.find((c) => c.tmId === forced) ?? { tmId: forced, slug: "x", name };
    else {
      const ranked = pool.filter((c) => !used.has(c.tmId)).map((c) => ({ c, s: score(name, c.name) })).sort((a, b) => b.s - a.s);
      if (ranked[0]?.s >= 0.75) match = ranked[0].c;
      else {
        const found = await searchClub(name);
        const best = found.map((c) => ({ c, s: score(name, c.name) })).sort((a, b) => b.s - a.s)[0];
        if (best?.s >= 0.75) match = best.c;
        console.log(`  search: ${league.key} "${name}" → ${match ? `${match.name} (${match.tmId})` : "NOT FOUND"}`);
      }
    }
    if (!match) continue;
    used.add(match.tmId);
    const api = apiClubs.find((c) => c.league === league.key && c.name === name);
    clubs.push({ league: league.key, name, tmId: match.tmId, tmName: match.name, apiId: api?.api ?? null, city: api?.city ?? null, founded: api?.founded ?? null, venue: api?.venue ?? null, capacity: api?.capacity ?? null, season: league.tmSeason });
  }
}
console.log(`Matched ${clubs.length} clubs to Transfermarkt.`);
if (process.argv.includes("--match-only")) {
  for (const c of clubs) console.log(`  ${c.league.padEnd(5)} ${c.name.padEnd(28)} → ${c.tmName} (${c.tmId})`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 2. Squads
// ---------------------------------------------------------------------------
const squadPath = (c) => `/x/kader/verein/${c.tmId}/saison_id/${c.season}/plus/1`;
const todo = clubs.filter((c) => !isCached(squadPath(c)));
console.log(`${clubs.length - todo.length} squads cached, downloading ${todo.length} (~${Math.ceil((todo.length * 3.8) / 60)} min)…`);
let n = 0;
for (const club of todo) {
  await page(squadPath(club));
  if (++n % 20 === 0) console.log(`  ${n}/${todo.length}`);
}

// ---------------------------------------------------------------------------
// 3. world.json
// ---------------------------------------------------------------------------
const world = { season, source: "transfermarkt", generatedAt: new Date().toISOString(), clubs: [] };
for (const club of clubs) {
  const players = parseSquad(readFileSync(cacheFile(squadPath(club)), "utf8"));
  if (players.length < 15) console.log(`  WARNING: ${club.league} ${club.name} has only ${players.length} players`);
  world.clubs.push({ ...club, players });
}

writeFileSync(join(DATA, "world.json"), JSON.stringify(world));
const total = world.clubs.reduce((s, c) => s + c.players.length, 0);
console.log(`Wrote world.json: ${world.clubs.length} clubs, ${total} players.`);
