#!/usr/bin/env node
// Pulls anonymous play telemetry (the "telemetry" tab) from the Apps Script
// endpoint and summarizes it per game version: sessions, play time, human win
// rate and time to win. Compare the win rate with scripts/balance-<id>.mjs.
// For games that report levels (e.g. Ant Trails' days) it adds one line per
// level, how far each run got, and where players stopped.
//
// Usage:
//   FEEDBACK_READ_KEY=... node scripts/fetch-telemetry.mjs [--game <id>] [--format json|csv|summary]
//   node scripts/fetch-telemetry.mjs --input rows.json [--game <id>]   (summarize a saved --format json export)
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
const input = opt("input", "");
let rowsIn;
if (input) {
  rowsIn = JSON.parse(readFileSync(input, "utf8")).filter((r) => !game || r.game_id === game);
} else {
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
  rowsIn = data.rows;

  // Gallery events (kind "gallery") live in the "events" tab.
  const ev = new URL(url);
  ev.searchParams.set("tab", "events");
  ev.searchParams.set("kind", "gallery");
  try {
    const evData = await (await fetch(ev, { redirect: "follow" })).json();
    if (evData.ok) rowsIn = rowsIn.concat(evData.rows.filter((r) => r.kind === "gallery"));
  } catch (err) {
    console.error(`(gallery events not read: ${err.message})`);
  }
}
const galleryRows = rowsIn.filter((r) => r.kind === "gallery");
const data = { rows: rowsIn.filter((r) => r.kind !== "gallery") };

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
  // Roadmap target: a game worth 10+ minutes to a player who likes it.
  const perPlayer = new Map();
  for (const r of sessions) perPlayer.set(r.client_id, (perPlayer.get(r.client_id) || 0) + Number(r.seconds));
  const tenMin = [...perPlayer.values()].filter((t) => t >= 600).length;
  console.log(`  10-min target: ${pct(sessions.filter((r) => Number(r.seconds) >= 600).length, sessions.length)} of sessions, ${tenMin}/${perPlayer.size} player(s) over all sessions; longest player ${secs(Math.max(0, ...perPlayer.values()))}`);
  if (rounds.length) {
    console.log(`  rounds: ${rounds.length}, human win rate ${pct(wins.length, rounds.length)}`);
    console.log(`  round length: win median ${secs(median(wins.map((r) => Number(r.seconds))))}, loss median ${secs(median(rounds.filter((r) => r.outcome === "loss").map((r) => Number(r.seconds))))}`);
    console.log(`  rounds to first win: median ${median(toFirstWin) ?? "-"} (${toFirstWin.length} won, ${neverWon} never won)`);
  }
  if (rounds.some((r) => r.level !== "" && r.level != null)) levelSummary(rounds, sessions);
  else if (rounds.some((r) => r.reason || r.stats)) roundDetail(rounds);
  if (ach.size) console.log(`  achievements: ${[...ach].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id} ${n}`).join(", ")}`);
}
if (galleryRows.length) gallerySummary(galleryRows);
dailySummary(data.rows, galleryRows);

// Daily Challenge (docs/daily.md): per date, the day's game, how many
// players finished a first run, their scores (the counted run's best) and
// how many came back to practice. One line per date, newest first.
function dailySummary(rows, events) {
  const days = new Map();
  for (const r of rows.filter((x) => x.kind === "round" && x.daily)) {
    if (!days.has(r.daily)) days.set(r.daily, []);
    days.get(r.daily).push(r);
  }
  if (!days.size) return;
  console.log("\ndaily: date game · players · first-run score median (best) · levels median · practice runs · finished");
  for (const [date, list] of [...days].sort((a, b) => b[0].localeCompare(a[0]))) {
    const first = new Map(); // player -> { score, levels }
    const practice = new Set();
    for (const r of list) {
      if (Number(r.daily_first) === 1) {
        const f = first.get(r.client_id) || { score: 0, levels: 0 };
        f.score = Math.max(f.score, Number(r.score) || 0);
        f.levels++;
        first.set(r.client_id, f);
      } else practice.add(`${r.client_id}:${r.run}`);
    }
    const scores = [...first.values()].map((f) => f.score);
    const games = [...new Set(list.map((r) => r.game_id))].join("+");
    const finals = events.filter((e) => e.action === "daily" && e.daily === date && e.game_id === games).length;
    console.log(`  ${date} ${games} · ${first.size} · ${median(scores) ?? "-"} (${scores.length ? Math.max(...scores) : "-"}) · ` +
      `${median([...first.values()].map((f) => f.levels)) ?? "-"} · ${practice.size} · ${finals}`);
  }
}

// Gallery events (docs/telemetry.md#gallery-events): how players find and
// pass on games. One line per kind of action.
function gallerySummary(rows) {
  const count = (list, key) => {
    const m = new Map();
    for (const r of list) {
      const v = r[key] === undefined || r[key] === "" ? "?" : String(r[key]);
      m.set(v, (m.get(v) || 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} ${n}`).join(", ");
  };
  const by = (action) => rows.filter((r) => r.action === action);
  const players = new Set(rows.map((r) => r.client_id).filter(Boolean));
  console.log(`\ngallery: ${rows.length} event(s) from ${players.size} player(s)`);
  const opens = by("open");
  if (opens.length) {
    console.log(`  opens: ${opens.length}; from ${count(opens, "from")}`);
    console.log(`  opens by game: ${count(opens, "game_id")}`);
    const listed = opens.filter((r) => r.from === "list");
    if (listed.length) console.log(`  list position opened: ${count(listed, "position")} (sort: ${count(listed, "sort")})`);
  }
  for (const [action, key] of [["share", "method"], ["download", "game_id"], ["sort", "sort"], ["filter", "verb"], ["settings", "setting"], ["nudge", "result"]]) {
    const list = by(action);
    if (list.length) console.log(`  ${action}: ${list.length} (${count(list, key)})`);
  }
  const searches = by("search");
  if (searches.length) console.log(`  searches: ${searches.length}, ${searches.filter((r) => Number(r.results) === 0).length} with no results`);
}

// Games without levels that send reason/stats: losses by reason, and the
// median of each stat for wins and for losses.
function roundDetail(rounds) {
  const reasons = new Map();
  for (const r of rounds) if (r.outcome === "loss") reasons.set(r.reason || "?", (reasons.get(r.reason || "?") || 0) + 1);
  if (reasons.size) console.log(`  losses by reason: ${[...reasons].map(([k, n]) => `${k} ${n}`).join(", ")}`);
  for (const outcome of ["win", "loss"]) {
    const stats = rounds.filter((r) => r.outcome === outcome && r.stats).map((r) => parseStats(r.stats));
    const keys = [...new Set(stats.flatMap(Object.keys))];
    if (keys.length) console.log(`  median stats (${outcome}, ${stats.length}): ${keys.map((k) => `${k} ${median(stats.filter((x) => k in x).map((x) => x[k]))}`).join(" ")}`);
  }
}

// "dawn=22 lost=4" -> { dawn: 22, lost: 4 }
function parseStats(str) {
  const out = {};
  for (const kv of String(str || "").split(" ").filter(Boolean)) {
    const [k, v] = kv.split("=");
    if (k && v !== undefined && Number.isFinite(Number(v))) out[k] = Number(v);
  }
  return out;
}

function levelSummary(rounds, sessions) {
  const lv = rounds.filter((r) => Number(r.level) > 0);
  const levels = [...new Set(lv.map((r) => Number(r.level)))].sort((a, b) => a - b);
  console.log("  by level: tries (first tries) · win rate (first try) · median win/loss time · losses by reason · median stats");
  for (const L of levels) {
    const at = lv.filter((r) => Number(r.level) === L);
    const first = at.filter((r) => Number(r.attempt || 1) === 1);
    const won = at.filter((r) => r.outcome === "win");
    const reasons = new Map();
    for (const r of at) if (r.outcome === "loss") reasons.set(r.reason || "?", (reasons.get(r.reason || "?") || 0) + 1);
    const stats = at.map((r) => parseStats(r.stats));
    const keys = [...new Set(stats.flatMap(Object.keys))];
    const med = keys.map((k) => `${k} ${median(stats.filter((x) => k in x).map((x) => x[k]))}`).join(" ");
    console.log(`    L${L}: ${at.length} (${first.length}) · ${pct(won.length, at.length)} (${pct(first.filter((r) => r.outcome === "win").length, first.length)})` +
      ` · ${secs(median(won.map((r) => Number(r.seconds))))}/${secs(median(at.filter((r) => r.outcome === "loss").map((r) => Number(r.seconds))))}` +
      ` · ${[...reasons].map(([k, n]) => `${k} ${n}`).join(", ") || "-"} · ${med || "-"}`);
  }

  // Runs: the furthest level each one won, and how many retries it took.
  const runs = new Map();
  for (const r of lv) {
    if (!r.run) continue;
    const k = `${r.client_id}/${r.run}`;
    if (!runs.has(k)) runs.set(k, { best: 0, retries: 0 });
    const x = runs.get(k);
    if (r.outcome === "win") x.best = Math.max(x.best, Number(r.level));
    if (Number(r.attempt) > 1) x.retries++;
  }
  if (runs.size) {
    const dist = new Map();
    for (const x of runs.values()) dist.set(x.best, (dist.get(x.best) || 0) + 1);
    console.log(`  runs: ${runs.size}; levels won per run: ${[...dist].sort((a, b) => a[0] - b[0]).map(([b, n]) => `${b}: ${n}`).join(", ")}` +
      `; retried rounds per run: median ${median([...runs.values()].map((x) => x.retries))}`);
  }

  // Where sessions stopped: the last round each session finished, and
  // whether the player left partway into the next one (session play time
  // beyond its finished rounds).
  const bySession = new Map();
  for (const r of rounds) {
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, []);
    bySession.get(r.session_id).push(r);
  }
  const stops = new Map();
  let mid = 0;
  const midSecs = [];
  for (const sn of sessions) {
    const list = (bySession.get(sn.session_id) || []).sort((a, b) => Number(a.round) - Number(b.round));
    const last = list[list.length - 1];
    const key = last ? `after L${last.level || "?"} ${last.outcome}` : "before any round";
    stops.set(key, (stops.get(key) || 0) + 1);
    const extra = Number(sn.seconds) - list.reduce((a, r) => a + Number(r.seconds), 0);
    if (extra > 10) { mid++; midSecs.push(extra); }
  }
  if (sessions.length) {
    console.log(`  sessions stopped: ${[...stops].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ")}` +
      `; left mid-round ${mid}/${sessions.length}${mid ? ` (median ${secs(median(midSecs))} in)` : ""}` +
      `; rounds per session median ${median(sessions.map((r) => Number(r.rounds)))}`);
  }
}
