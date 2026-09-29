#!/usr/bin/env node
// Checks the game manifest and every game file against the platform rules in
// docs/PROJECT_BRIEF.md. Runs in CI on every PR and before every deploy.
// Usage: node scripts/validate.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { selfContainedProblems } from "./self-contained.mjs";
import { wording } from "./wording.mjs";

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

  for (const key of ["id", "title", "file", "blurb", "goal", "howToPlay", "sharedState", "added", "updated"]) {
    if (typeof g[key] !== "string" || !g[key].trim()) fail(`${where}: "${key}" must be a non-empty string`);
  }
  if (typeof g.id === "string" && !/^[a-z0-9-]{1,64}$/.test(g.id)) fail(`${where}: id must be lowercase letters, digits and dashes`);
  if (ids.has(g.id)) fail(`${where}: duplicate id`);
  ids.add(g.id);

  if (!Number.isInteger(g.version) || g.version < 1) fail(`${where}: "version" must be an integer >= 1`);
  for (const key of ["added", "updated"]) {
    if (g[key] && !/^\d{4}-\d{2}-\d{2}$/.test(g[key])) fail(`${where}: "${key}" must be YYYY-MM-DD`);
  }

  // Optional: "status" ("active" by default; "archived" games stay playable
  // in the gallery's archive section, never removed).
  if (g.status !== undefined && !["active", "archived"].includes(g.status)) fail(`${where}: "status" must be "active" or "archived"`);
  checkChanges(where, g);
  checkWording(where, g);

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
  // Link preview image for the game's share page (scripts/make-og-images.mjs).
  if (!existsSync(join(root, "assets", "og", `${g.id}.png`))) fail(`${where}: assets/og/${g.id}.png is missing (run node scripts/make-og-images.mjs ${g.id})`);
  const html = readFileSync(path, "utf8");
  checkSelfContained(g.file, html);
  checkAchievements(where, g, html);
  // Platform rule: games with rounds report how each one ended, for play
  // telemetry (docs/telemetry.md). Sandboxes (goal starts "Sandbox") have none.
  if (!/^sandbox\b/i.test(g.goal || "") && !html.includes("arcade:result")) {
    fail(`${where}: games/${g.file} must post an "arcade:result" message when a round ends (or its goal must start with "Sandbox")`);
  }
  // Platform rule: the gallery pauses games while a panel covers them.
  if (!html.includes("arcade:pause") || !html.includes("arcade:resume")) {
    fail(`${where}: games/${g.file} must handle "arcade:pause" and "arcade:resume" messages`);
  }
}

if (!existsSync(join(root, "assets", "og", "arcade.png"))) fail("assets/og/arcade.png (the gallery's link preview) is missing (run node scripts/make-og-images.mjs arcade)");

// Every game file must be registered, so nothing ships without review metadata.
for (const f of readdirSync(gamesDir)) {
  if (f.endsWith(".html") && !files.has(f)) {
    fail(`games/${f} is not listed in games.json`);
    checkSelfContained(f, readFileSync(join(gamesDir, f), "utf8"));
  }
}

// Optional "changes": [{ version, date, text }], shown as "What's new" in the
// cabinet and once as a callout when a player opens an updated version.
function checkChanges(where, g) {
  if (g.changes === undefined) return;
  if (!Array.isArray(g.changes)) {
    fail(`${where}: "changes" must be a list of { version, date, text }`);
    return;
  }
  const versions = new Set();
  for (const c of g.changes) {
    if (!c || typeof c !== "object") {
      fail(`${where}: each "changes" entry must be an object`);
      continue;
    }
    if (!Number.isInteger(c.version) || c.version < 1 || c.version > g.version) fail(`${where}: changes entry version must be an integer from 1 to ${g.version}`);
    if (versions.has(c.version)) fail(`${where}: two "changes" entries for v${c.version}`);
    versions.add(c.version);
    if (typeof c.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) fail(`${where}: changes entry for v${c.version} needs a YYYY-MM-DD "date"`);
    if (typeof c.text !== "string" || !c.text.trim() || c.text.length > 280) fail(`${where}: changes entry for v${c.version} needs a "text" of 1-280 characters`);
    for (const k of Object.keys(c)) {
      if (!["version", "date", "text"].includes(k)) fail(`${where}: unknown key "${k}" in "changes"`);
    }
  }
}

// Manifest text uses {tap}, {finger}, {hold}… so the gallery can say tap or
// click (assets/wording.js has the list). Anything else in braces is a typo.
// "keyboard" is an optional desktop-only line of keys, like "← → to tilt".
function checkWording(where, g) {
  const walk = (v, path) => {
    if (typeof v === "string") {
      for (const p of wording.unknown(v)) fail(`${where}: unknown placeholder ${p} in "${path}" (known: ${Object.keys(wording.WORDS).map((w) => `{${w}}`).join(" ")}, or capitalized)`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(g, "");
  const braces = (v) => typeof v === "string" && /[{}]/.test(v);
  for (const k of ["id", "file"]) if (braces(g[k])) fail(`${where}: "${k}" can't use placeholders`);
  for (const m of Array.isArray(g.mechanics) ? g.mechanics : []) {
    if (m && braces(m.verb)) fail(`${where}: verb "${m.verb}" can't use placeholders (write the phone verb, like "tap"; the gallery translates it)`);
  }
  if (g.keyboard !== undefined) {
    if (typeof g.keyboard !== "string" || !g.keyboard.trim() || g.keyboard.length > 120) fail(`${where}: "keyboard" must be a string of 1-120 characters`);
    else if (braces(g.keyboard)) fail(`${where}: "keyboard" is desktop-only text and can't use placeholders`);
  }
}

// Platform rule: every game declares 3+ achievements in the manifest and
// announces each one from the game file (see docs/adding-a-game.md).
function checkAchievements(where, g, html) {
  const list = Array.isArray(g.achievements) ? g.achievements : [];
  if (list.length < 3) fail(`${where}: needs at least 3 achievements (has ${list.length})`);
  const seen = new Set();
  for (const a of list) {
    if (!a || !a.id || !a.title || !a.description) {
      fail(`${where}: each achievement needs id, title and description`);
      continue;
    }
    if (!/^[a-z0-9-]{1,64}$/.test(a.id)) fail(`${where}: achievement id "${a.id}" must be lowercase letters, digits and dashes`);
    if (seen.has(a.id)) fail(`${where}: duplicate achievement id "${a.id}"`);
    seen.add(a.id);
    if (!html.includes(`'${a.id}'`) && !html.includes(`"${a.id}"`)) {
      fail(`${where}: achievement "${a.id}" is never unlocked in games/${g.file}`);
    }
  }
  if (list.length && !html.includes("arcade:achievement")) fail(`${where}: games/${g.file} never posts "arcade:achievement" messages`);
  if (list.length && !html.includes(`'${g.id}'`) && !html.includes(`"${g.id}"`)) fail(`${where}: games/${g.file} must identify itself with its id "${g.id}"`);
}

// Design rule: one self-contained HTML file, primitives only, no external
// assets (rules in scripts/self-contained.mjs).
function checkSelfContained(file, html) {
  for (const problem of selfContainedProblems(html)) fail(`games/${file}: ${problem}`);
}

if (errors.length) {
  console.error(`Validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`OK: ${games.length} game(s) valid: ${games.map((g) => `${g.id}@v${g.version}`).join(", ")}`);
