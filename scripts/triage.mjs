#!/usr/bin/env node
// Which game needs a revision most? Joins the manifest, play telemetry and
// feedback into one line per game, sorted by need (docs/workflow.md, scaling
// plan item 2), so choosing what to revise never means reading every game's
// data. Telemetry and feedback are counted for the game's current version.
//
// Usage:
//   FEEDBACK_READ_KEY=... node scripts/triage.mjs [--top N] [--why]
//   node scripts/triage.mjs --telemetry t.json --feedback f.json   (saved `--format json` exports)
//   node scripts/triage.mjs        without a key: ranks by age only, with a warning
//
// Columns: need score, id, version, days since update, sessions and players
// on this version, human win rate (rounds), median play per session, share
// of players past the 10-minute target, feedback since `updated` (count,
// average rating), and the reasons behind the score. Compare the win rate
// with `node scripts/balance-<id>.mjs` (bots). Score rules are in `need()`.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const top = Number(opt("top", 0)) || Infinity;

const { games } = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8"));

async function endpointRows(tab) {
  const key = process.env.FEEDBACK_READ_KEY;
  let endpoint = process.env.FEEDBACK_ENDPOINT;
  if (!endpoint) {
    const cfg = readFileSync(join(root, "assets/config.js"), "utf8");
    endpoint = (cfg.match(/feedbackEndpoint:\s*["']([^"']*)["']/) || [])[1];
  }
  if (!endpoint || !key) return null;
  const url = new URL(endpoint);
  url.searchParams.set("key", key);
  if (tab) url.searchParams.set("tab", tab);
  const res = await fetch(url, { redirect: "follow" });
  const data = JSON.parse(await res.text());
  if (!data.ok) throw new Error(`endpoint error: ${data.error}`);
  return data.rows;
}

async function load(flag, tab) {
  const file = opt(flag, "");
  if (file) return JSON.parse(readFileSync(file, "utf8"));
  return endpointRows(tab);
}

let tele, fb;
try {
  tele = await load("telemetry", "telemetry");
  fb = await load("feedback", "");
} catch (err) {
  console.error(`triage: ${err.message}`);
  process.exit(1);
}
const haveData = tele !== null && fb !== null;
if (!haveData) {
  console.error("triage: no FEEDBACK_READ_KEY / endpoint (or --telemetry/--feedback files); ranking by age only.");
  tele = tele || [];
  fb = fb || [];
}
// An old deployment ignores tab=telemetry and returns feedback rows.
if (tele.length && !("kind" in tele[0])) {
  console.error("triage: the endpoint returned feedback rows, not telemetry: redeploy Code.gs (docs/telemetry.md).");
  process.exit(1);
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
const today = Date.now();

function stats(g) {
  const days = Math.max(0, Math.round((today - Date.parse(g.updated)) / 864e5));
  const mine = tele.filter((r) => r.game_id === g.id && String(r.game_version) === String(g.version));
  const sessions = mine.filter((r) => r.kind === "session");
  const rounds = mine.filter((r) => r.kind === "round");
  const perPlayer = new Map();
  for (const r of sessions) perPlayer.set(r.client_id, (perPlayer.get(r.client_id) || 0) + Number(r.seconds));
  const players = perPlayer.size;
  const since = Date.parse(g.updated);
  // Feedback for this version received on or after the update day.
  const newFb = fb.filter(
    (r) => r.game_id === g.id && String(r.game_version) === String(g.version) && Date.parse(r.received_at) >= since,
  );
  const rated = newFb.filter((r) => Number(r.rating) >= 1);
  return {
    g,
    days,
    sessions: sessions.length,
    players,
    rounds: rounds.length,
    win: pct(rounds.filter((r) => r.outcome === "win").length, rounds.length),
    median: median(sessions.map((r) => Number(r.seconds))),
    tenMin: pct([...perPlayer.values()].filter((t) => t >= 600).length, players),
    fb: newFb.length,
    avg: rated.length ? rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length : null,
  };
}

// Need score (higher = revise sooner), each rule adds a reason.
function need(s) {
  let score = 0;
  const why = [];
  const add = (n, t) => { score += n; why.push(t); };
  if (s.fb) add(Math.min(s.fb, 5) * 3, `${s.fb} new feedback`);
  if (s.avg !== null && s.avg < 3) add(4, `rating ${s.avg.toFixed(1)}`);
  if (s.rounds >= 10 && s.win !== null) {
    if (s.win < 10 || s.win > 90) add(6, `win ${s.win}%`);
    else if (s.win < 25 || s.win > 75) add(3, `win ${s.win}%`);
  }
  if (s.sessions >= 5 && s.median < 120) add(4, `short play ${Math.round(s.median)}s`);
  if (s.players >= 3 && !s.tenMin) add(2, "nobody past 10 min");
  if (s.sessions < 5) add(1, "little data");
  if (s.days > 7) add(Math.min(Math.floor(s.days / 7), 4), `${s.days}d old`);
  return { score, why };
}

const rows = games
  .map((g) => {
    const s = stats(g);
    return { s, ...need(s) };
  })
  .sort((a, b) => b.score - a.score || (a.s.median ?? Infinity) - (b.s.median ?? Infinity) || b.s.days - a.s.days);

const pad = (x, n) => String(x).padEnd(n);
const num = (x, suffix = "") => (x === null ? "-" : `${x}${suffix}`);
const w = Math.max(...rows.map((r) => r.s.g.id.length), 2);
console.log(`${pad("need", 4)}  ${pad("id", w)}  ver  age   sess ppl  win  med   10m  feedback  why`);
for (const { s, score, why } of rows.slice(0, top)) {
  const fbText = s.fb ? `${s.fb}${s.avg !== null ? ` ${s.avg.toFixed(1)}★` : ""}` : "-";
  console.log(
    `${pad(score, 4)}  ${pad(s.g.id, w)}  ${pad("v" + s.g.version, 4)} ${pad(s.days + "d", 5)} ${pad(s.sessions, 4)} ${pad(s.players, 4)}${pad(num(s.win, "%"), 5)}${pad(num(s.median === null ? null : Math.round(s.median), "s"), 6)}${pad(num(s.tenMin, "%"), 5)}${pad(fbText, 10)}${why.join(", ") || "-"}`,
  );
}
if (!haveData) console.log("(no telemetry/feedback loaded: columns empty)");
