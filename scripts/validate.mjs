#!/usr/bin/env node
// Checks the game manifest and every game file against the platform rules in
// docs/PROJECT_BRIEF.md. Runs in CI on every PR and before every deploy.
// Usage: node scripts/validate.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gamesDir = join(root, "games");
const errors = [];
const fail = (msg) => errors.push(msg);

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(gamesDir, "games.json"), "utf8"));
} catch (err) {
  console.error(`games/games.json is missing or not valid JSON: ${err.message}`);
  process.exit(1);
}

const games = Array.isArray(manifest.games) ? manifest.games : [];
if (!games.length) fail("games/games.json has no games");

const ids = new Set();
const files = new Set();

for (const [i, g] of games.entries()) {
  const where = `games.json entry ${i} (${g.id ?? "no id"})`;

  for (const key of ["id", "title", "file", "blurb", "sharedState", "added", "updated"]) {
    if (typeof g[key] !== "string" || !g[key].trim()) fail(`${where}: "${key}" must be a non-empty string`);
  }
  if (typeof g.id === "string" && !/^[a-z0-9-]{1,64}$/.test(g.id)) fail(`${where}: id must be lowercase letters, digits and dashes`);
  if (ids.has(g.id)) fail(`${where}: duplicate id`);
  ids.add(g.id);

  if (!Number.isInteger(g.version) || g.version < 1) fail(`${where}: "version" must be an integer >= 1`);
  for (const key of ["added", "updated"]) {
    if (g[key] && !/^\d{4}-\d{2}-\d{2}$/.test(g[key])) fail(`${where}: "${key}" must be YYYY-MM-DD`);
  }

  // Design rule: 2-3 core mechanics, each a distinct verb.
  const mechs = Array.isArray(g.mechanics) ? g.mechanics : [];
  if (mechs.length < 2 || mechs.length > 3) fail(`${where}: must list 2-3 mechanics (has ${mechs.length})`);
  for (const m of mechs) {
    if (!m || !m.name || !m.verb || !m.description) fail(`${where}: each mechanic needs name, verb and description`);
  }
  const verbs = mechs.map((m) => m && m.verb);
  if (new Set(verbs).size !== verbs.length) fail(`${where}: mechanics must use different verbs (orthogonal), got ${verbs.join(", ")}`);

  if (typeof g.file !== "string" || !/^[a-z0-9-]+\.html$/.test(g.file)) {
    fail(`${where}: "file" must be a single .html filename inside games/`);
    continue;
  }
  files.add(g.file);
  const path = join(gamesDir, g.file);
  if (!existsSync(path)) {
    fail(`${where}: games/${g.file} does not exist`);
    continue;
  }
  checkSelfContained(g.file, readFileSync(path, "utf8"));
}

// Every game file must be registered, so nothing ships without review metadata.
for (const f of readdirSync(gamesDir)) {
  if (f.endsWith(".html") && !files.has(f)) {
    fail(`games/${f} is not listed in games.json`);
    checkSelfContained(f, readFileSync(join(gamesDir, f), "utf8"));
  }
}

// Design rule: one self-contained HTML file, primitives only, no external assets.
function checkSelfContained(file, html) {
  const where = `games/${file}`;
  if (!/^\s*<!DOCTYPE html>/i.test(html)) fail(`${where}: must start with <!DOCTYPE html>`);
  const rules = [
    [/<script\b[^>]*\bsrc\s*=/i, "external <script src>"],
    [/<link\b[^>]*\brel\s*=\s*["']?(stylesheet|preload|modulepreload)/i, "external stylesheet/preload <link>"],
    [/<(img|audio|video|source|iframe|embed|object)\b/i, "media/embed element (use canvas/SVG/CSS primitives)"],
    [/url\(\s*["']?(?!data:|#)[^)"']+/i, "CSS url() pointing at a file"],
    [/@import\b/i, "CSS @import"],
    [/\bimport\s*\(|\bimport\s+[\w{*][^;]*\bfrom\b/, "JS module import"],
    [/\bnew\s+(Audio|Image)\s*\(/, "new Audio()/new Image() (loads external assets)"],
    [/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b/, "network access"],
  ];
  for (const [re, label] of rules) {
    if (re.test(html)) fail(`${where}: not self-contained, found ${label}`);
  }
}

if (errors.length) {
  console.error(`Validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`OK: ${games.length} game(s) valid: ${games.map((g) => `${g.id}@v${g.version}`).join(", ")}`);
