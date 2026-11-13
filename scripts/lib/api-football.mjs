// Tiny API-Football client for local import scripts.
// Every response is cached on disk, so a request is never paid for twice and
// the multi-day import can stop and resume at any point.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CACHE_DIR = join(ROOT, "scripts", ".cache", "api-football");
const BASE = "https://v3.football.api-sports.io";

/** Keep a couple of requests spare for manual checks. */
const RESERVE = 2;

function loadKey() {
  if (process.env.API_FOOTBALL_KEY) return process.env.API_FOOTBALL_KEY;
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const match = env.match(/^API_FOOTBALL_KEY=(.+)$/m);
  if (!match) throw new Error("API_FOOTBALL_KEY missing from .env.local");
  return match[1].trim();
}
const KEY = loadKey();

export class BudgetExhausted extends Error {}

function cachePath(endpoint, params) {
  const query = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}-${String(v).replace(/[^\w.-]/g, "_")}`)
    .join("__");
  return join(CACHE_DIR, endpoint.replace(/^\//, "").replace(/\//g, "_"), `${query || "all"}.json`);
}

export function isCached(endpoint, params = {}) {
  return existsSync(cachePath(endpoint, params));
}

export function readCached(endpoint, params = {}) {
  const file = cachePath(endpoint, params);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

let remaining = null;

/** Requests left today (the /status call itself is free). */
export async function remainingToday() {
  const res = await fetch(`${BASE}/status`, { headers: { "x-apisports-key": KEY } });
  const body = await res.json();
  if (body.errors?.rateLimit) {
    await new Promise((r) => setTimeout(r, 65_000));
    return remainingToday();
  }
  const { requests } = body.response;
  remaining = requests.limit_day - requests.current;
  return remaining;
}

let lastCall = 0;

/** GET with cache. Throws BudgetExhausted when today's quota (minus reserve) is used up. */
export async function get(endpoint, params = {}) {
  const file = cachePath(endpoint, params);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));

  if (remaining === null) await remainingToday();
  if (remaining <= RESERVE) throw new BudgetExhausted(`Daily API budget used up (${remaining} left)`);

  // Free plan allows 10 requests/minute.
  const wait = lastCall + 8000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const url = `${BASE}${endpoint}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { "x-apisports-key": KEY } });
  const header = res.headers.get("x-ratelimit-requests-remaining");
  remaining = header !== null ? Number(header) : remaining - 1;
  const body = await res.json();

  const errors = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
  if (errors?.length) {
    const msg = JSON.stringify(body.errors);
    if (body.errors.rateLimit) {
      // Per-minute limit: wait for the window to reset, then retry.
      await new Promise((r) => setTimeout(r, 65_000));
      return get(endpoint, params);
    }
    if (/request limit|too many requests/i.test(msg)) throw new BudgetExhausted(msg);
    throw new Error(`${endpoint} ${JSON.stringify(params)} → ${msg}`);
  }

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(body));
  return body;
}

export function requestsLeft() {
  return remaining;
}
