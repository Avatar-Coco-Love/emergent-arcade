#!/usr/bin/env node
// Reads crash reports (kind "error" rows in the events tab, docs/telemetry.md
// "Errors") and prints one line per distinct error: count, players, devices,
// last seen, where it came from and the message. Newest first.
//
// Usage:
//   FEEDBACK_READ_KEY=... node scripts/fetch-errors.mjs [--game <id>] [--since YYYY-MM-DD]
//
// Same endpoint and key as scripts/fetch-telemetry.mjs.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const key = process.env.FEEDBACK_READ_KEY;
let endpoint = process.env.FEEDBACK_ENDPOINT;
if (!endpoint) {
  const cfg = readFileSync(join(root, "assets/config.js"), "utf8");
  endpoint = (cfg.match(/feedbackEndpoint:\s*["']([^"']*)["']/) || [])[1];
}
if (!endpoint || !key) {
  console.error("Needs FEEDBACK_READ_KEY and a feedbackEndpoint in assets/config.js.");
  process.exit(1);
}

const url = new URL(endpoint);
url.searchParams.set("key", key);
url.searchParams.set("tab", "events");
url.searchParams.set("kind", "error");
const game = opt("game", "");
if (game) url.searchParams.set("game", game);
const since = opt("since", "");
if (since) url.searchParams.set("since", new Date(since).toISOString());

const res = await fetch(url, { redirect: "follow" });
const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  process.exit(1);
}
const data = JSON.parse(text);
if (!data.ok && data.error) {
  console.error(`Endpoint error: ${data.error}`);
  process.exit(1);
}
const rows = (data.rows || []).filter((r) => r.kind === "error");
if (!rows.length) {
  console.log("No errors reported.");
  process.exit(0);
}

const groups = new Map();
for (const r of rows) {
  const where = r.source === "game" ? `${r.game_id} v${r.game_version}` : `gallery${r.file ? " " + r.file : ""}${r.game_id ? ` (in ${r.game_id} v${r.game_version})` : ""}`;
  const k = `${where}|${r.line}|${r.message}`;
  const g = groups.get(k) || { where, line: r.line, message: r.message, n: 0, players: new Set(), devices: new Set(), last: "" };
  g.n++;
  if (r.client_id) g.players.add(r.client_id);
  if (r.device) g.devices.add(r.device);
  if (String(r.received_at) > g.last) g.last = String(r.received_at);
  groups.set(k, g);
}
console.log(`${rows.length} error report(s), ${groups.size} distinct`);
for (const g of [...groups.values()].sort((a, b) => b.last.localeCompare(a.last))) {
  console.log(`${String(g.n).padStart(4)}× ${String(g.players.size).padStart(3)} ppl  ${[...g.devices].join("/") || "?"}  ${g.last.slice(0, 16)}  ${g.where}${g.line ? ":" + g.line : ""}  ${g.message}`);
}
