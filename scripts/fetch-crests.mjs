// Download every club crest from Transfermarkt into public/crests/{tmId}.webp (128px).
// Hobby use only: crests are the clubs' trademarks.
//   node scripts/fetch-crests.mjs [--force]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = join(import.meta.dirname, "..");
const out = join(root, "public", "crests");
mkdirSync(out, { recursive: true });
const world = JSON.parse(readFileSync(join(root, "scripts", "data", "world.json"), "utf8"));
const force = process.argv.includes("--force");
let ok = 0, failed = [];
for (const club of world.clubs) {
  const file = join(out, `${club.tmId}.webp`);
  if (!force && existsSync(file)) { ok++; continue; }
  try {
    const res = await fetch(`https://tmssl.akamaized.net/images/wappen/head/${club.tmId}.png`, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(file, await sharp(buf).resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88 }).toBuffer());
    ok++;
  } catch (e) {
    failed.push(`${club.name} (${club.tmId}): ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 120));
}
console.log(`${ok} crests, ${failed.length} failed`);
for (const f of failed) console.log("  " + f);
