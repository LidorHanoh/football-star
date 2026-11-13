// Step 3 of the world import: 2024 player stats per league (the newest season
// the free plan allows). Squads only give a short name, age and broad
// position; these pages add full name, nationality, birth date, height and the
// minutes / goals / match ratings we base player ratings on. 20 players per
// page, so this is the slowest step. Resumable and budget-aware.
//
//   node scripts/sync-player-details.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BudgetExhausted, get, readCached, requestsLeft } from "./lib/api-football.mjs";

const DATA = join(import.meta.dirname, "data");
const { leagues } = JSON.parse(readFileSync(join(DATA, "leagues.json"), "utf8"));

// Same priority as the squads. Second divisions are included because clubs
// promoted since 2024 played there that season.
const PRIORITY = ["isr", "eng1", "esp", "ita", "ger", "fra", "por", "ned", "tur", "bel", "sco", "ksa", "gre", "usa", "bra", "arg", "aut", "sui", "den", "eng2"];
const SECOND_DIVISIONS = { isr: 382, esp: 141, ita: 136, ger: 79, fra: 62 };
const SEASON = 2024;

const targets = PRIORITY.flatMap((key) => {
  const league = leagues.find((l) => l.key === key);
  return SECOND_DIVISIONS[key] ? [league.api, SECOND_DIVISIONS[key]] : [league.api];
});

/** Pages still missing for a league; null if page 1 isn't cached yet (total unknown). */
function missingPages(league) {
  const first = readCached("/players", { league, season: SEASON, page: 1 });
  if (!first) return null;
  const pages = [];
  for (let p = 2; p <= first.paging.total; p++) {
    if (!readCached("/players", { league, season: SEASON, page: p })) pages.push(p);
  }
  return pages;
}

let fetched = 0;
try {
  for (const league of targets) {
    let pages = missingPages(league);
    if (pages === null) {
      await get("/players", { league, season: SEASON, page: 1 });
      fetched++;
      pages = missingPages(league);
    }
    for (const page of pages) {
      await get("/players", { league, season: SEASON, page });
      fetched++;
    }
    if (pages.length) console.log(`  league ${league}: complete`);
  }
} catch (e) {
  if (!(e instanceof BudgetExhausted)) throw e;
  console.log(`Stopped: ${e.message}`);
}

let remaining = 0;
let unknown = 0;
for (const league of targets) {
  const pages = missingPages(league);
  if (pages === null) unknown++;
  else remaining += pages.length;
}
console.log(`\nFetched ${fetched} pages today. Remaining: ${remaining} known pages${unknown ? ` + ${unknown} leagues not started (~30 pages each)` : ""}.`);
console.log("API requests left today:", requestsLeft());
