// Run once a day until everything is downloaded: current squads first, then
// player details with whatever budget is left. Safe to run any number of times.
//
//   npm run data:sync
import { execFileSync } from "node:child_process";
import { join } from "node:path";

for (const script of ["sync-squads.mjs", "sync-player-details.mjs"]) {
  console.log(`\n=== ${script} ===`);
  execFileSync(process.execPath, [join(import.meta.dirname, script)], { stdio: "inherit" });
}
