#!/usr/bin/env node
// Pulls anonymous play telemetry (the "telemetry" tab) from the Apps Script
// endpoint and summarizes it per game version: sessions, play time, human win
// rate and time to win. Compare the win rate with scripts/balance-<id>.mjs.
//
// Usage:
//   FEEDBACK_READ_KEY=... node scripts/fetch-telemetry.mjs [--game <id>] [--format json|csv|summary]
//
// Same endpoint and key as scripts/fetch-feedback.mjs; see docs/telemetry.md.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const game = opt("game", "");
const format = opt("format", "summary");
const key = process.env.FEEDBACK_READ_KEY;
let endpoint = process.env.FEEDBACK_ENDPOINT;
if (!endpoint) {
  const cfg = readFileSync(join(root, "assets/config.js"), "utf8");
  endpoint = (cfg.match(/feedbackEndpoint:\s*["']([^"']*)["']/) || [])[1];
}
if (!endpoint) {
  console.error("No endpoint configured (assets/config.js feedbackEndpoint is empty).");
  process.exit(1);
}
if (!key) {
  console.error("Set FEEDBACK_READ_KEY to the READ_KEY script property of the Apps Script project.");
  process.exit(1);
}

const url = new URL(endpoint);
url.searchParams.set("key", key);
url.searchParams.set("tab", "telemetry");
if (game) url.searchParams.set("game", game);
if (format === "csv") url.searchParams.set("format", "csv");

const res = await fetch(url, { redirect: "follow" });
const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  process.exit(1);
}
if (text.startsWith("{")) {
  const err = JSON.parse(text);
  if (!err.ok) {
    console.error(`Endpoint error: ${err.error}`);
    process.exit(1);
  }
}
if (format === "csv") {
  process.stdout.write(text + "\n");
  process.exit(0);
}
const data = JSON.parse(text);
// An old deployment ignores tab=telemetry and returns feedback rows.
if (data.rows.length && !("kind" in data.rows[0])) {
  console.error("The endpoint returned feedback rows, not telemetry: redeploy Code.gs (docs/telemetry.md).");
  process.exit(1);
}
if (format === "json") {
  console.log(JSON.stringify(data.rows, null, 2));
  process.exit(0);
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const secs = (x) => (x === null ? "-" : `${Math.round(x)}s`);
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "-");

const groups = new Map();
for (const r of data.rows) {
  const k = `${r.game_id}@v${r.game_version}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
if (!groups.size) console.log("No telemetry yet.");

for (const [k, rows] of [...groups].sort()) {
  const sessions = rows.filter((r) => r.kind === "session");
  const rounds = rows.filter((r) => r.kind === "round");
  const wins = rounds.filter((r) => r.outcome === "win");
  const players = new Set(rows.map((r) => r.client_id).filter(Boolean));
  const touch = sessions.filter((r) => r.device === "touch").length;

  // Rounds each player needed for their first win (players who never won are
  // counted separately), in the order the rounds were received.
  const byPlayer = new Map();
  for (const r of rounds) {
    if (!byPlayer.has(r.client_id)) byPlayer.set(r.client_id, []);
    byPlayer.get(r.client_id).push(r);
  }
  const toFirstWin = [];
  let neverWon = 0;
  for (const list of byPlayer.values()) {
    const i = list.findIndex((r) => r.outcome === "win");
    if (i < 0) neverWon++;
    else toFirstWin.push(i + 1);
  }

  const ach = new Map();
  for (const s of sessions) {
    for (const id of String(s.achievements || "").split(" ").filter(Boolean)) ach.set(id, (ach.get(id) || 0) + 1);
  }

  console.log(`\n${k}: ${players.size} player(s), ${sessions.length} session(s) (${pct(touch, sessions.length)} touch)`);
  console.log(`  play/session: median ${secs(median(sessions.map((r) => Number(r.seconds))))}, total ${secs(sessions.reduce((a, r) => a + Number(r.seconds), 0))}`);
  if (rounds.length) {
    console.log(`  rounds: ${rounds.length}, human win rate ${pct(wins.length, rounds.length)}`);
    console.log(`  round length: win median ${secs(median(wins.map((r) => Number(r.seconds))))}, loss median ${secs(median(rounds.filter((r) => r.outcome === "loss").map((r) => Number(r.seconds))))}`);
    console.log(`  rounds to first win: median ${median(toFirstWin) ?? "-"} (${toFirstWin.length} won, ${neverWon} never won)`);
  }
  if (ach.size) console.log(`  achievements: ${[...ach].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id} ${n}`).join(", ")}`);
}
