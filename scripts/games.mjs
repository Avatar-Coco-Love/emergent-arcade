#!/usr/bin/env node
// The arcade at a glance, one line per game, so a session never has to read
// games/games.json whole (it grows with every game and every revision).
//
// Usage:
//   node scripts/games.mjs                 one line per game (oldest update first)
//   node scripts/games.mjs --missing       only games missing a notes, history or balance file
//   node scripts/games.mjs <id> [...]      one game's manifest entry, last 3 "changes" only
//
// Columns: id, version, last update (days ago), game file size, current notes
// size (docs/games/<id>.md; over 8 KB means it's due a trim, see
// docs/adding-a-game.md), and which of history / balance script exist.
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { games } = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8"));
const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith("--"));

if (ids.length) {
  for (const id of ids) {
    const g = games.find((x) => x.id === id);
    if (!g) {
      console.log(`${id}: not in games/games.json`);
      process.exitCode = 1;
      continue;
    }
    const { changes = [], ...rest } = g;
    console.log(JSON.stringify({ ...rest, changes: changes.slice(0, 3), olderChanges: Math.max(0, changes.length - 3) }, null, 1));
  }
  process.exit();
}

const kb = (p) => (existsSync(p) ? `${(statSync(p).size / 1024).toFixed(0)}K` : "-");
const today = Date.now();
const rows = games
  .map((g) => {
    const notes = join(root, "docs/games", `${g.id}.md`);
    const has = {
      history: existsSync(join(root, "docs/history", `${g.id}.md`)),
      balance: existsSync(join(root, "scripts", `balance-${g.id}.mjs`)),
    };
    return {
      g,
      notes,
      has,
      missing: !existsSync(notes) || !has.history || !has.balance,
      days: Math.round((today - Date.parse(g.updated)) / 864e5),
    };
  })
  .filter((r) => !args.includes("--missing") || r.missing)
  .sort((a, b) => b.days - a.days);

const pad = (s, n) => String(s).padEnd(n);
const w = Math.max(...rows.map((r) => r.g.id.length), 2);
console.log(`${pad("id", w)}  ver  updated       file  notes  history balance`);
for (const { g, notes, has, days } of rows) {
  console.log(
    `${pad(g.id, w)}  ${pad("v" + g.version, 4)} ${pad(`${g.updated} ${days}d`, 13)} ${pad(kb(join(root, "games", g.file)), 5)} ${pad(kb(notes), 6)} ${pad(has.history ? "yes" : "-", 7)} ${has.balance ? "yes" : "-"}`,
  );
}
console.log(`${rows.length} of ${games.length} games`);
