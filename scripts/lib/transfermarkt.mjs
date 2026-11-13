// Polite, cached Transfermarkt page fetcher + parsers for local import scripts.
// One request every few seconds, every page cached on disk, so the import
// never hits a page twice.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const TM_CACHE = join(ROOT, "scripts", ".cache", "transfermarkt");
const BASE = "https://www.transfermarkt.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const DELAY_MS = 3000;

let lastCall = 0;

export function cacheFile(path) {
  return join(TM_CACHE, path.replace(/^\//, "").replace(/[^\w.-]+/g, "_") + ".html");
}

export function isCached(path) {
  return existsSync(cacheFile(path));
}

/** GET a Transfermarkt page (path starting with "/"), cached. */
export async function page(path, { retries = 3 } = {}) {
  const file = cacheFile(path);
  if (existsSync(file)) return readFileSync(file, "utf8");

  const wait = lastCall + DELAY_MS + Math.random() * 1500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const res = await fetch(BASE + path, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" } });
  if (!res.ok) {
    if (retries > 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 30_000));
      return page(path, { retries: retries - 1 });
    }
    throw new Error(`Transfermarkt ${res.status} for ${path}`);
  }
  const html = await res.text();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return html;
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------
const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const text = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Clubs on a competition overview page: [{ tmId, slug, name }]. */
export function parseCompetitionClubs(html) {
  const table = html.match(/<table class="items">([\s\S]*?)<\/table>/);
  if (!table) return [];
  const clubs = new Map();
  for (const m of table[1].matchAll(/<td class="hauptlink no-border-links"><a title="([^"]+)" href="\/([^/]+)\/startseite\/verein\/(\d+)/g)) {
    clubs.set(Number(m[3]), { tmId: Number(m[3]), slug: m[2], name: decode(m[1]) });
  }
  return [...clubs.values()];
}

/** "€1.50M" / "€500k" → euros. */
function parseValue(s) {
  const m = s.match(/€([\d.]+)(bn|m|k)/i);
  if (!m) return null;
  const mult = { bn: 1e9, m: 1e6, k: 1e3 }[m[2].toLowerCase()];
  return Math.round(Number(m[1]) * mult);
}

/** dd/mm/yyyy or "Mar 11, 1996" → yyyy-mm-dd */
function parseDate(s) {
  let m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);
  if (m) {
    const month = "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(m[1]) / 3 + 1;
    return `${m[3]}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

/** Players on a detailed squad page (/kader/verein/ID/saison_id/YYYY/plus/1). */
export function parseSquad(html) {
  const players = [];
  const rows = html.split(/<tr class="(?:odd|even)">/).slice(1);
  for (const raw of rows) {
    const row = raw.split(/<tr class="(?:odd|even)">/)[0];
    const link = row.match(/href="\/([^/"]+)\/profil\/spieler\/(\d+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!link) continue;
    const cells = [...row.matchAll(/<td[^>]*class="[^"]*zentriert[^"]*"[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
    const position = text(row.match(/<table class="inline-table">[\s\S]*?<\/tr>\s*<tr>\s*<td>([\s\S]*?)<\/td>/)?.[1] ?? "");
    const nationalities = [...row.matchAll(/<img[^>]*title="([^"]+)"[^>]*class="flaggenrahmen"/g)].map((m) => decode(m[1]));
    const number = Number(text(row.match(/<div class="?rn_nummer"?>([\s\S]*?)<\/div>/)?.[1] ?? "")) || null;
    const birth = cells.find((c) => /\(\d+\)/.test(c)) ?? "";
    const height = cells.find((c) => /^\d,\d{2}\s?m$/.test(c));
    const foot = cells.find((c) => /^(right|left|both)$/.test(c)) ?? null;
    const dates = cells.filter((c) => parseDate(c) && !/\(\d+\)/.test(c));
    const valueCell = row.match(/<td class="rechts hauptlink">([\s\S]*?)<\/td>/);
    players.push({
      tmId: Number(link[2]),
      slug: link[1],
      name: text(link[3]),
      number,
      position,
      birthDate: parseDate(birth),
      age: Number(birth.match(/\((\d+)\)/)?.[1]) || null,
      nationalities,
      heightCm: height ? Math.round(Number(height.replace(",", ".").replace(/\s?m/, "")) * 100) : null,
      foot,
      joined: dates[0] ? parseDate(dates[0]) : null,
      contractUntil: dates[1] ? parseDate(dates[1]) : null,
      marketValue: valueCell ? parseValue(text(valueCell[1])) : null,
    });
  }
  return players;
}
