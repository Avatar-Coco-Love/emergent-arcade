#!/usr/bin/env node
// Pulls accumulated feedback from the Apps Script endpoint for review.
//
// Usage:
//   FEEDBACK_READ_KEY=... node scripts/fetch-feedback.mjs [--game <id>] [--format json|csv|summary]
//
// The endpoint URL is read from assets/config.js (override with
// FEEDBACK_ENDPOINT). The read key is a secret: keep it in your shell or the
// Claude Code environment's secrets, never in the repo.
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
  console.error("No feedback endpoint configured (assets/config.js feedbackEndpoint is empty).");
  console.error("Until it is, feedback arrives as GitHub issues titled \"[feedback] <game-id> ...\".");
  process.exit(1);
}
if (!key) {
  console.error("Set FEEDBACK_READ_KEY to the READ_KEY script property of the Apps Script project.");
  process.exit(1);
}

const url = new URL(endpoint);
url.searchParams.set("key", key);
if (game) url.searchParams.set("game", game);
if (format === "csv") url.searchParams.set("format", "csv");

const res = await fetch(url, { redirect: "follow" });
const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  process.exit(1);
}
if (format === "csv") {
  process.stdout.write(text + "\n");
  process.exit(0);
}

const data = JSON.parse(text);
if (!data.ok) {
  console.error(`Endpoint error: ${data.error}`);
  process.exit(1);
}
if (format === "json") {
  console.log(JSON.stringify(data.rows, null, 2));
  process.exit(0);
}

// summary: per game+version rating stats, then every comment
const groups = new Map();
for (const r of data.rows) {
  const k = `${r.game_id}@v${r.game_version}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
for (const [k, rows] of [...groups].sort()) {
  const avg = rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length;
  const dist = [1, 2, 3, 4, 5].map((n) => `${n}★:${rows.filter((r) => Number(r.rating) === n).length}`).join(" ");
  console.log(`\n## ${k}: ${rows.length} rating(s), avg ${avg.toFixed(2)}  (${dist})`);
  for (const r of rows) {
    if (String(r.comment).trim()) console.log(`- [${r.rating}★ ${String(r.received_at).slice(0, 10)}] ${r.comment}`);
  }
}
if (!groups.size) console.log("No feedback yet.");
