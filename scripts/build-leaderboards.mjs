#!/usr/bin/env node
// Builds the public leaderboards.json from telemetry round rows that carry a
// score (the gallery adds score, board, score_epoch, handle, lb: see
// docs/scores.md). Runs at every deploy and hourly (pages.yml schedule).
//
// Incremental: it starts from the live leaderboards.json (--prev) and reads
// only rows received since that file's `through`, so each run stays small
// however big the telemetry tab gets. If reading fails, the previous file is
// kept as it is: a leaderboard is never wiped by an outage.
//
// Usage:
//   FEEDBACK_READ_KEY=... node scripts/build-leaderboards.mjs --out _site/leaderboards.json [--prev <url|file>]
//   node scripts/build-leaderboards.mjs --input rows.json [--prev file] [--out file]   (offline, e.g. a --format json export)
//   add --full to ignore --prev's `through` and read every row.
// Prints one line per board.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scores } from "./scores.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const FORMAT = "emergent-arcade-leaderboards";
const TOP = 25; // entries kept per board
const MAX_BOARDS = 50; // per game, so a forged board name can't grow the file
const OVERLAP_MS = 10 * 60 * 1000; // re-read a little before `through`; merging is idempotent

const games = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8")).games;
const out = opt("out", "");
const full = args.includes("--full");

async function readPrev(src) {
  if (!src) return null;
  try {
    const text = /^https?:/.test(src)
      ? await fetch(src, { cache: "no-store" }).then((r) => (r.ok ? r.text() : ""))
      : existsSync(src) ? readFileSync(src, "utf8") : "";
    const data = text ? JSON.parse(text) : null;
    return data && data.format === FORMAT && data.games ? data : null;
  } catch (err) {
    console.warn(`prev: unreadable (${err.message}), starting empty`);
    return null;
  }
}

// Apps Script sometimes answers a cold or busy request with an HTML error
// page instead of JSON. Try 3 times, then fail with what the page said.
async function getJson(url) {
  let last = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(90000) });
      const text = await res.text();
      if (text.trimStart().startsWith("{")) return JSON.parse(text);
      const title = (/<title>([^<]*)<\/title>/i.exec(text) || [])[1] || text.replace(/\s+/g, " ").slice(0, 120);
      last = `HTTP ${res.status}, not JSON: ${title.trim()}`;
    } catch (err) {
      last = err.message;
    }
    console.warn(`leaderboards: attempt ${attempt} failed (${last})`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 10000));
  }
  throw new Error(last);
}

async function fetchRows(since) {
  const input = opt("input", "");
  if (input) return JSON.parse(readFileSync(input, "utf8"));
  const key = (process.env.FEEDBACK_READ_KEY || "").trim(); // a pasted secret may end in a newline
  let endpoint = process.env.FEEDBACK_ENDPOINT;
  if (!endpoint) {
    const cfg = readFileSync(join(root, "assets/config.js"), "utf8");
    endpoint = (cfg.match(/feedbackEndpoint:\s*["']([^"']*)["']/) || [])[1];
  }
  if (!endpoint || !key) throw new Error("no FEEDBACK_READ_KEY or endpoint");
  const rows = [];
  let after = "";
  for (let page = 0; page < 200; page++) {
    const url = new URL(endpoint);
    url.searchParams.set("key", key);
    url.searchParams.set("tab", "telemetry");
    url.searchParams.set("kind", "round");
    url.searchParams.set("limit", "2000");
    if (since) url.searchParams.set("since", since);
    if (after) url.searchParams.set("after", after);
    const data = await getJson(url);
    if (!data.ok) throw new Error(`endpoint: ${data.error}`);
    rows.push(...data.rows);
    if (data.next == null) return rows;
    after = String(data.next);
  }
  return rows;
}

// Merges score rows into { gameId: { epoch, boards: { board: [entry] } } }.
function merge(prevGames, rows) {
  const state = {};
  for (const g of games) {
    const sp = scores.spec(g);
    if (!sp) continue;
    const old = prevGames[g.id];
    const boards = {};
    if (old && old.epoch === sp.epoch) {
      for (const [b, list] of Object.entries(old.boards || {})) boards[b] = new Map(list.map((e) => [e.p, e]));
    }
    state[g.id] = { game: g, sp, boards };
  }
  const latest = new Map(); // p -> { handle, lb } from that player's newest row
  let used = 0;
  const time = (r) => Date.parse(r.received_at || r.submitted_at || "") || 0;
  for (const r of [...rows].sort((a, b) => time(a) - time(b))) {
    const st = state[r.game_id];
    if (!st || typeof r.client_id !== "string" || !r.client_id) continue;
    const p = scores.hash(`player:${r.client_id}`);
    if (r.score == null || r.score === "") continue;
    const lb = Number(r.lb) === 0 ? 0 : 1;
    const known = latest.get(p);
    const handle = scores.isHandle(r.handle) ? r.handle : known ? known.handle : scores.defaultHandle(r.client_id);
    latest.set(p, { handle, lb });
    const s = Number(r.score);
    const board = String(r.board || "main");
    const list = st.game.score.boardList;
    if (Number(r.score_epoch) !== st.sp.epoch || !Number.isFinite(s) || s < 0 || s > st.sp.max) continue;
    if (st.sp.wins && r.outcome !== "win") continue;
    if (!/^[a-z0-9-]{1,24}$/.test(board) || (Array.isArray(list) && !list.includes(board))) continue;
    if (!st.boards[board] && Object.keys(st.boards).length >= MAX_BOARDS) continue;
    const map = (st.boards[board] ||= new Map());
    const mine = map.get(p);
    used++;
    if (mine && !scores.beats(st.sp, s, mine.s)) continue;
    map.set(p, { h: "", p, s: Math.round(s * 10) / 10, at: new Date(time(r) || Date.now()).toISOString().slice(0, 10), v: Number(r.game_version) || 0 });
  }
  const result = {};
  for (const [id, st] of Object.entries(state)) {
    const boards = {};
    for (const [b, map] of Object.entries(st.boards)) {
      const list = [];
      for (const e of map.values()) {
        const who = latest.get(e.p);
        if (who && who.lb === 0) continue; // opted out since: drop them
        if (who) e.h = who.handle;
        if (!scores.isHandle(e.h)) continue;
        list.push(e);
      }
      // Better score first; a tie goes to whoever got there first.
      list.sort((a, b) => (a.s === b.s ? a.at.localeCompare(b.at) : scores.beats(st.sp, a.s, b.s) ? -1 : 1));
      if (list.length) boards[b] = list.slice(0, TOP);
    }
    result[id] = { epoch: st.sp.epoch, boards };
  }
  return { games: result, used };
}

const prev = await readPrev(opt("prev", ""));
const since = !full && prev && prev.through ? new Date(Date.parse(prev.through) - OVERLAP_MS).toISOString() : "";
let rows = [];
let error = "";
try {
  rows = await fetchRows(since);
} catch (err) {
  error = err.message;
}

let data;
if (error) {
  console.warn(`leaderboards: ${error}; keeping the previous file`);
  data = prev || { format: FORMAT, version: 1, updated_at: null, through: null, games: {} };
} else {
  const { games: merged, used } = merge(full || !prev ? {} : prev.games, rows);
  const newest = rows.reduce((m, r) => Math.max(m, Date.parse(r.received_at || "") || 0), 0);
  const through = newest ? new Date(newest).toISOString() : prev && !full ? prev.through : null;
  data = { format: FORMAT, version: 1, updated_at: new Date().toISOString(), through, games: merged };
  console.log(`leaderboards: ${rows.length} round rows read${since ? ` since ${since}` : ""}, ${used} with a score`);
}

for (const [id, g] of Object.entries(data.games)) {
  const game = games.find((x) => x.id === id);
  const sp = game && scores.spec(game);
  for (const [b, list] of Object.entries(g.boards)) {
    console.log(`  ${id}/${b}: ${list.length} player(s), #1 ${sp ? scores.format(sp, list[0].s) : list[0].s} (${list[0].h})`);
  }
}
if (out) writeFileSync(out, JSON.stringify(data) + "\n");
