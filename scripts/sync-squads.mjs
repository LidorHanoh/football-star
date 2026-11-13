// Step 2 of the world import: download the CURRENT squad of every club in
// scripts/data/clubs.json (API-Football /players/squads isn't limited to old
// seasons on the free plan). Resumable: cached squads are skipped, and the
// script stops cleanly when today's request budget runs out. Run it once a day
// until it reports 0 remaining.
//
//   node scripts/sync-squads.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BudgetExhausted, get, isCached, requestsLeft } from "./lib/api-football.mjs";

const DATA = join(import.meta.dirname, "data");
const clubs = JSON.parse(readFileSync(join(DATA, "clubs.json"), "utf8"));
const { leagues } = JSON.parse(readFileSync(join(DATA, "leagues.json"), "utf8"));

// Israeli football first, then the leagues most players will pick.
const PRIORITY = ["isr", "eng1", "esp", "ita", "ger", "fra", "por", "ned", "tur", "bel", "sco", "ksa", "gre", "usa", "bra", "arg", "aut", "sui", "den", "eng2"];
const order = (key) => (PRIORITY.indexOf(key) + 1 || 99);
const queue = clubs
  .filter((c) => !isCached("/players/squads", { team: c.api }))
  .sort((a, b) => order(a.league) - order(b.league));

console.log(`${clubs.length - queue.length}/${clubs.length} squads already downloaded, ${queue.length} to go.`);

let done = 0;
try {
  for (const club of queue) {
    const body = await get("/players/squads", { team: club.api });
    const players = body.response[0]?.players.length ?? 0;
    done++;
    console.log(`  ${club.league.padEnd(5)} ${club.name}: ${players} players`);
  }
} catch (e) {
  if (!(e instanceof BudgetExhausted)) throw e;
  console.log(`Stopped: ${e.message}`);
}

const left = queue.length - done;
console.log(`\nDownloaded ${done} squads today. ${left} remaining${left ? ` (~${Math.ceil(left / 95)} more day(s))` : " — all done!"}.`);
for (const l of leagues) {
  const all = clubs.filter((c) => c.league === l.key);
  const have = all.filter((c) => isCached("/players/squads", { team: c.api })).length;
  if (have < all.length) console.log(`  ${l.key}: ${have}/${all.length}`);
}
console.log("API requests left today:", requestsLeft());
