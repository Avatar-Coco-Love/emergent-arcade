#!/usr/bin/env node
// Mechanic map (docs/ROADMAP.md, phase 2): which verbs and verb pairs the
// arcade has used, and which pairs are untried, so new-game proposals can
// start from a gap. Reads games/games.json (each mechanic's `verb`).
//
// Usage: node scripts/mechanic-map.mjs [--verbs tap,drag,...]
//   --verbs  add verbs nothing uses yet (e.g. swipe,pinch) to see their untried pairs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { games } = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8"));
const i = process.argv.indexOf("--verbs");
const extra = i >= 0 && process.argv[i + 1] ? process.argv[i + 1].split(",").map((v) => v.trim()).filter(Boolean) : [];

const of = (g) => [...new Set((g.mechanics || []).map((m) => m.verb))].sort();
const uses = new Map(); // verb -> game ids
const pairs = new Map(); // "a+b" -> game ids
for (const g of games) {
  const vs = of(g);
  for (const v of vs) uses.set(v, [...(uses.get(v) || []), g.id]);
  for (let a = 0; a < vs.length; a++)
    for (let b = a + 1; b < vs.length; b++) {
      const k = `${vs[a]}+${vs[b]}`;
      pairs.set(k, [...(pairs.get(k) || []), g.id]);
    }
}

const verbs = [...new Set([...uses.keys(), ...extra])].sort((a, b) => (uses.get(b)?.length || 0) - (uses.get(a)?.length || 0) || a.localeCompare(b));
console.log("verbs: " + verbs.map((v) => `${v} ${uses.get(v)?.length || 0}`).join(", "));
const key = (a, b) => [a, b].sort().join("+");
const w = Math.max(...verbs.map((v) => v.length));
console.log(" ".repeat(w) + "  " + verbs.map((v) => v.padEnd(w)).join(" "));
for (const a of verbs)
  console.log(a.padEnd(w) + "  " + verbs.map((b) => (a === b ? "·" : String(pairs.get(key(a, b))?.length || "-")).padEnd(w)).join(" "));

const untried = [];
for (let a = 0; a < verbs.length; a++) for (let b = a + 1; b < verbs.length; b++) if (!pairs.has(key(verbs[a], verbs[b]))) untried.push(key(verbs[a], verbs[b]).replace("+", " + "));
console.log(`pairs tried ${pairs.size} of ${(verbs.length * (verbs.length - 1)) / 2}; untried: ${untried.join(", ") || "none"}`);
