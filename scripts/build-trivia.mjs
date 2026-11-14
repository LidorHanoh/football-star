// Builds public/trivia/data.json for the career trivia from the cached
// Transfermarkt transfer histories (scripts/fetch-transfers.mjs), with Hebrew
// names from Wikidata, plus the crests of every club that appears.
//
//   node scripts/build-trivia.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { TM_CACHE } from "./lib/transfermarkt.mjs";

const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "scripts", "data");
const world = JSON.parse(readFileSync(join(DATA, "world.json"), "utf8"));
const { leagues } = JSON.parse(readFileSync(join(DATA, "leagues.json"), "utf8"));
const heClubs = JSON.parse(readFileSync(join(DATA, "club-names-he.json"), "utf8"));
const UA = "FootballStarTrivia/1.0 (hobby project)";

const leagueCountry = Object.fromEntries(leagues.map((l) => [l.key, l.country]));
const CODE = { Israel: "il", England: "gb-eng", Spain: "es", Italy: "it", Germany: "de", France: "fr", Portugal: "pt", Netherlands: "nl", Belgium: "be", Turkey: "tr", Scotland: "gb-sct", Austria: "at", Switzerland: "ch", Greece: "gr", Denmark: "dk", "Saudi-Arabia": "sa", USA: "us", Brazil: "br", Argentina: "ar" };
const EUROPE = new Set(["England", "Spain", "Italy", "Germany", "France", "Portugal", "Netherlands", "Belgium", "Turkey", "Scotland", "Austria", "Switzerland", "Greece", "Denmark"]);

// --- Our clubs -------------------------------------------------------------
const worldClub = new Map(world.clubs.map((c) => [c.tmId, c]));
const squadValue = (c) => c.players.reduce((s, p) => s + (p.marketValue || 0), 0);
const big = new Set(
  world.clubs
    .filter((c) => EUROPE.has(leagueCountry[c.league]) && !c.league.endsWith("2"))
    .sort((a, b) => squadValue(b) - squadValue(a))
    .slice(0, 40)
    .map((c) => c.tmId),
);
const posGroup = (p) => (/goal/i.test(p) ? "GK" : /back|defen/i.test(p) ? "DF" : /midfield/i.test(p) ? "MF" : "FW");
const playerInfo = new Map(world.clubs.flatMap((c) => c.players.map((p) => [p.tmId, p])));

// TM flag id → country code, learned from our own clubs.
const flagCode = new Map();
const flagId = (url) => Number(/flagge\/\w+\/(\d+)\./.exec(url ?? "")?.[1] ?? 0);
const clubIdOf = (href) => Number(/\/verein\/(\d+)/.exec(href ?? "")?.[1] ?? 0);

// --- Transfers -------------------------------------------------------------
const YOUTH = /\b(U\d{2}|Yth|Youth|Juniors?|Jugend|Primavera|Sub-?\d{2}|Reserves?|II|B|Am\.|Academy)\b|^Without Club$|^Retired$|^Career break$|^Unknown$/i;
const dir = join(TM_CACHE, "transfers");
const transfers = [];
const clubs = new Map(); // tmId -> {en, flag}
for (const f of readdirSync(dir)) {
  const pid = Number(f.replace(".json", ""));
  const p = playerInfo.get(pid);
  if (!p) continue;
  let list;
  try {
    list = JSON.parse(readFileSync(join(dir, f), "utf8")).transfers ?? [];
  } catch {
    continue;
  }
  for (const tr of list) {
    if (tr.upcoming || tr.futureTransfer) continue;
    const from = clubIdOf(tr.from?.href);
    const to = clubIdOf(tr.to?.href);
    const fee = String(tr.fee ?? "");
    if (!from || !to || from === to || tr.from.isSpecial || tr.to.isSpecial) continue;
    if (/end of loan/i.test(fee)) continue;
    if (YOUTH.test(tr.from.clubName) || YOUTH.test(tr.to.clubName)) continue;
    const year = Number(String(tr.dateUnformatted ?? "").slice(0, 4));
    if (!year || year < 2005) continue;
    for (const [id, side] of [
      [from, tr.from],
      [to, tr.to],
    ]) {
      if (!clubs.has(id)) clubs.set(id, { en: side.clubName, flag: flagId(side.countryFlag) });
      const wc = worldClub.get(id);
      if (wc) flagCode.set(flagId(side.countryFlag), CODE[leagueCountry[wc.league]] ?? "x");
    }
    const amount = /loan/i.test(fee) ? -1 : /free/i.test(fee) ? 0 : parseFee(fee);
    transfers.push([pid, from, to, year, amount]);
  }
}
function parseFee(s) {
  const m = /€\s*([\d.,]+)\s*(m|k|bn)?/i.exec(s);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Math.round(n * ({ m: 1e6, k: 1e3, bn: 1e9 }[(m[2] ?? "").toLowerCase()] ?? 1));
}
// Keep moves between first teams people may know: at least one club in our world.
const kept = transfers.filter(([, f, t]) => worldClub.has(f) || worldClub.has(t));
// One question per player and year.
const uniq = new Map(kept.map((x) => [`${x[0]}-${x[3]}`, x]));
const finalTransfers = [...uniq.values()];
console.log(`${transfers.length} transfers, ${finalTransfers.length} kept`);

// --- Champions ------------------------------------------------------------
const byName = (n) => world.clubs.find((c) => c.name === n || c.tmName === n)?.tmId ?? [...clubs.entries()].find(([, c]) => c.en === n)?.[0];
const CL = [[1993, "Olympique Marseille"], [1994, "AC Milan"], [1995, "Ajax Amsterdam"], [1996, "Juventus FC"], [1997, "Borussia Dortmund"], [1998, "Real Madrid"], [1999, "Manchester United"], [2000, "Real Madrid"], [2001, "FC Bayern Munich"], [2002, "Real Madrid"], [2003, "AC Milan"], [2004, "FC Porto"], [2005, "Liverpool FC"], [2006, "FC Barcelona"], [2007, "AC Milan"], [2008, "Manchester United"], [2009, "FC Barcelona"], [2010, "Inter Milan"], [2011, "FC Barcelona"], [2012, "Chelsea FC"], [2013, "FC Bayern Munich"], [2014, "Real Madrid"], [2015, "FC Barcelona"], [2016, "Real Madrid"], [2017, "Real Madrid"], [2018, "Real Madrid"], [2019, "Liverpool FC"], [2020, "FC Bayern Munich"], [2021, "Chelsea FC"], [2022, "Real Madrid"], [2023, "Manchester City"], [2024, "Real Madrid"], [2025, "Paris Saint-Germain"]];
const ISR = [[2007, "Beitar Jerusalem"], [2008, "Beitar Jerusalem"], [2009, "Maccabi Haifa"], [2010, "Hapoel Tel Aviv"], [2011, "Maccabi Haifa"], [2012, "Ironi Kiryat Shmona"], [2013, "Maccabi Tel Aviv"], [2014, "Maccabi Tel Aviv"], [2015, "Maccabi Tel Aviv"], [2016, "Hapoel Be'er Sheva"], [2017, "Hapoel Be'er Sheva"], [2018, "Hapoel Be'er Sheva"], [2019, "Maccabi Tel Aviv"], [2020, "Maccabi Tel Aviv"], [2021, "Maccabi Haifa"], [2022, "Maccabi Haifa"], [2023, "Maccabi Haifa"], [2024, "Maccabi Tel Aviv"], [2025, "Maccabi Tel Aviv"]];
const resolve = (list) =>
  list
    .map(([y, n]) => {
      const id = byName(n);
      if (!id) console.log(`  champion not found: ${n}`);
      return id ? [y, id] : null;
    })
    .filter(Boolean);
const champions = { cl: resolve(CL), isr: resolve(ISR) };
for (const [, id] of [...champions.cl, ...champions.isr]) if (!clubs.has(id)) clubs.set(id, { en: worldClub.get(id)?.name ?? String(id), flag: 0 });

// --- Names (Hebrew from Wikidata) -------------------------------------------
async function wikidata(prop, ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 250) {
    const values = ids
      .slice(i, i + 250)
      .map((id) => `"${id}"`)
      .join(" ");
    const q = `SELECT ?tm ?he ?en WHERE { VALUES ?tm { ${values} } ?x wdt:${prop} ?tm . OPTIONAL { ?x rdfs:label ?he FILTER(LANG(?he) = "he") } OPTIONAL { ?x rdfs:label ?en FILTER(LANG(?en) = "en") } }`;
    try {
      const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const clean = (v) => v?.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      for (const b of json.results.bindings) out.set(Number(b.tm.value), { he: clean(b.he?.value), en: clean(b.en?.value) });
    } catch (e) {
      console.log(`  wikidata ${prop} batch ${i}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  return out;
}
const usedPlayers = [...new Set(finalTransfers.map((x) => x[0]))];
const usedClubs = [...new Set([...finalTransfers.flatMap((x) => [x[1], x[2]]), ...champions.cl.map((x) => x[1]), ...champions.isr.map((x) => x[1])])];
const wdPlayers = await wikidata("P2446", usedPlayers);
const wdClubs = await wikidata("P7223", usedClubs);
console.log(`hebrew: ${[...wdPlayers.values()].filter((x) => x.he).length}/${usedPlayers.length} players, ${[...wdClubs.values()].filter((x) => x.he).length}/${usedClubs.length} clubs`);

// Only players people may actually know: on Wikidata or worth real money. Loans only for the big names.
const value = (id) => playerInfo.get(id)?.marketValue ?? 0;
const notable = (id) => wdPlayers.has(id) || value(id) >= 2e6;
const good = finalTransfers.filter(([p, , , , fee]) => notable(p) && (fee !== -1 || value(p) >= 5e6));
finalTransfers.length = 0;
finalTransfers.push(...good);
usedPlayers.splice(0, usedPlayers.length, ...new Set(good.map((x) => x[0])));
usedClubs.splice(0, usedClubs.length, ...new Set([...good.flatMap((x) => [x[1], x[2]]), ...champions.cl.map((x) => x[1]), ...champions.isr.map((x) => x[1])]));
console.log(`${good.length} notable transfers`);

const outPlayers = {};
for (const id of usedPlayers) {
  const p = playerInfo.get(id);
  const he = wdPlayers.get(id)?.he;
  outPlayers[id] = { en: p.name, ...(he && /[֐-׿]/.test(he) ? { he } : {}), g: posGroup(p.position) };
}
const outClubs = {};
for (const id of usedClubs) {
  const wc = worldClub.get(id);
  const c = clubs.get(id);
  const en = wc?.name ?? wdClubs.get(id)?.en ?? c?.en ?? String(id);
  const he = (wc && heClubs[wc.name]) || wdClubs.get(id)?.he;
  const code = wc ? (CODE[leagueCountry[wc.league]] ?? "x") : (flagCode.get(c?.flag) ?? "x");
  outClubs[id] = { en, ...(he && /[֐-׿]/.test(he) ? { he } : {}), c: code, ...(big.has(id) ? { big: 1 } : {}) };
}

mkdirSync(join(ROOT, "public", "trivia"), { recursive: true });
writeFileSync(join(ROOT, "public", "trivia", "data.json"), JSON.stringify({ clubs: outClubs, players: outPlayers, transfers: finalTransfers, champions }));
console.log(`wrote ${finalTransfers.length} transfers, ${usedPlayers.length} players, ${usedClubs.length} clubs`);

// --- Crests for clubs we don't have yet ---------------------------------------
const crestDir = join(ROOT, "public", "crests");
let got = 0;
for (const id of usedClubs) {
  const file = join(crestDir, `${id}.webp`);
  if (existsSync(file)) continue;
  try {
    const res = await fetch(`https://tmssl.akamaized.net/images/wappen/head/${id}.png`, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(file, await sharp(buf).resize(96, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toBuffer());
    got++;
  } catch (e) {
    console.log(`  crest ${id}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 150));
}
console.log(`${got} new crests`);
