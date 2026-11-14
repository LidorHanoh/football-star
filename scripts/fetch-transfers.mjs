// Transfer histories for the trivia ("he moved from this club to that one in
// year X — who is it?"). Picks the best-known players of scripts/data/world.json
// (every Ligat Ha'Al player, the top of Liga Leumit and the most valuable
// players elsewhere) and caches each player's history from Transfermarkt.
//
//   node scripts/fetch-transfers.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TM_CACHE } from "./lib/transfermarkt.mjs";

const DATA = join(import.meta.dirname, "data");
const world = JSON.parse(readFileSync(join(DATA, "world.json"), "utf8"));
const DIR = join(TM_CACHE, "transfers");
mkdirSync(DIR, { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const all = world.clubs.flatMap((c) => c.players.map((p) => ({ ...p, league: c.league })));
const pick = new Map();
const add = (list) => list.forEach((p) => pick.set(p.tmId, p));
add(all.filter((p) => p.league === "isr"));
add(all.filter((p) => p.league === "isr2").sort((a, b) => b.marketValue - a.marketValue).slice(0, 120));
add(all.filter((p) => !p.league.startsWith("isr")).sort((a, b) => b.marketValue - a.marketValue).slice(0, 1300));
const ids = [...pick.keys()];
console.log(`${ids.length} players`);

let done = 0;
for (const id of ids) {
  const file = join(DIR, `${id}.json`);
  done++;
  if (existsSync(file)) continue;
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise((r) => setTimeout(r, 1800 + Math.random() * 900));
    try {
      const res = await fetch(`https://www.transfermarkt.com/ceapi/transferHistory/list/${id}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 30_000));
        continue;
      }
      writeFileSync(file, res.ok ? await res.text() : '{"transfers":[]}');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
  if (done % 50 === 0) console.log(`${done}/${ids.length}`);
}
console.log("done");
