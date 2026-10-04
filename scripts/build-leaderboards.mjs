#!/usr/bin/env node
// Builds the public leaderboards.json from telemetry round rows that carry a
// score (the gallery adds score, board, score_epoch, handle, lb: see
// docs/scores.md), plus the gallery's "handle" events (a name picked or the
// leaderboard toggled in the Records panel), so renames show without another
// round. Runs at every deploy and hourly (pages.yml schedule).
// It is the gate for typed names (docs/scores.md, "Typed names"): it checks
// each one again with assets/names.js and the word lists, gives a name to the
// first player who claims it, and applies data/name-takedowns.json. The
// claims are kept in the file's `names` block, so later builds remember them.
// It also counts plays (telemetry session rows) per game version for the
// gallery cards and the About panel ("plays" below, docs/scores.md), and
// tallies each game's current version for the Spotlight view ("spotlight"
// below, docs/gallery.md).
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
import { names, lists, takedowns } from "./names.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const FORMAT = "emergent-arcade-leaderboards";
const TOP = 25; // entries kept per board
const MAX_BOARDS = 50; // per game, so a forged board name can't grow the file
const PLAY_SECONDS = 30; // a play: a finished round, or this much play (docs/scores.md)
const PLAY_RULE = `round-or-${PLAY_SECONDS}s`; // a file counted by another rule is recounted
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

// Round rows from the telemetry tab, plus the gallery's "handle" events (a
// name picked or the leaderboard toggled in the Records panel) from the
// events tab, so a rename shows without playing another round.
async function fetchRows(since) {
  const input = opt("input", "");
  if (input) return JSON.parse(readFileSync(input, "utf8"));
  const rounds = await fetchTab(since, "telemetry", "round");
  const events = await fetchTab(since, "events", "gallery");
  return rounds.concat(events.filter((r) => r.action === "handle"));
}

// Session rows (one per cabinet visit with 3+ s of play or a round) for the
// play counts. With --input, the session rows of that export.
async function fetchSessions(since) {
  const input = opt("input", "");
  if (input) return JSON.parse(readFileSync(input, "utf8")).filter((r) => r.kind === "session");
  return fetchTab(since, "telemetry", "session");
}

async function fetchTab(since, tab, kind) {
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
    url.searchParams.set("tab", tab);
    url.searchParams.set("kind", kind);
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

// Typed names: { p: { n, r, at } }, the name n player p holds, their random
// name r (shown instead if the claim goes), and when they claimed it. A name
// belongs to the first player to claim it; it's freed when they pick another
// name or a random one, or are taken down.
function nameBook(prevNames) {
  const book = {};
  const owners = new Map(); // name key -> p
  const isRandom = (n) => scores.isHandle(n);
  const free = (p) => {
    const c = book[p];
    if (c && owners.get(names.key(c.n)) === p) owners.delete(names.key(c.n));
    delete book[p];
  };
  // Previous claims, oldest first, checked again: a list that grew or a
  // takedown frees names already held.
  const prev = Object.entries(prevNames || {}).filter(([, c]) => c && typeof c.n === "string" && scores.isHandle(c.r));
  prev.sort((a, b) => String(a[1].at).localeCompare(String(b[1].at)));
  let dropped = 0;
  for (const [p, c] of prev) {
    const got = names.check(c.n, { lists, isRandom, owner: (k) => owners.get(k) || "", me: p });
    if (takedowns.has(p) || !got.ok) { dropped++; continue; }
    book[p] = { n: got.name, r: c.r, at: String(c.at) };
    owners.set(got.key, p);
  }
  // A player's row says which name they want now ("" = their random one).
  function claim(p, typed, random, at) {
    const old = book[p];
    if (!typed || takedowns.has(p)) return free(p);
    const got = names.check(typed, { lists, isRandom, owner: (k) => owners.get(k) || "", me: p });
    if (!got.ok) return free(p); // taken or not allowed: their random name shows
    if (old && names.key(old.n) === got.key) {
      book[p] = { n: got.name, r: random, at: old.at };
      return;
    }
    free(p);
    book[p] = { n: got.name, r: random, at };
    owners.set(got.key, p);
  }
  return { book, claim, dropped: () => dropped };
}

// Merges score rows into { gameId: { epoch, boards: { board: [entry] } } }.
function merge(prevGames, rows, prevNames) {
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
  const typed = nameBook(prevNames);
  let used = 0;
  const time = (r) => Date.parse(r.received_at || r.submitted_at || "") || 0;
  for (const r of [...rows].sort((a, b) => time(a) - time(b))) {
    if (typeof r.client_id !== "string" || !r.client_id) continue;
    const st = state[r.game_id];
    if (!st && r.kind !== "gallery") continue;
    const p = scores.hash(`player:${r.client_id}`);
    const known = latest.get(p);
    const who = () => ({
      handle: scores.isHandle(r.handle) ? r.handle : known ? known.handle : scores.defaultHandle(r.client_id),
      lb: Number(r.lb) === 0 ? 0 : 1,
    });
    const seen = () => {
      const w = who();
      latest.set(p, w);
      // An opted-out row carries no name: it leaves the claim as it is.
      if (w.lb) typed.claim(p, typeof r.name === "string" ? r.name : "", w.handle, new Date(time(r) || Date.now()).toISOString());
    };
    if (r.kind === "gallery") {
      if (r.action === "handle") seen();
      continue;
    }
    if (r.score == null || r.score === "") continue;
    seen();
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
        const c = typed.book[e.p];
        if (c) {
          // A typed name always shows with the player's tag: "Coco ·4F2A".
          e.h = names.display(c.n, e.p);
          e.r = c.r;
        } else {
          // No typed name (any more): their random name. Entries not
          // re-read this run keep it in `r`.
          if (who) e.h = who.handle;
          else if (!scores.isHandle(e.h)) e.h = e.r;
          delete e.r;
        }
        if (!c && !scores.isHandle(e.h)) continue;
        list.push(e);
      }
      // Better score first; a tie goes to whoever got there first.
      list.sort((a, b) => (a.s === b.s ? a.at.localeCompare(b.at) : scores.beats(st.sp, a.s, b.s) ? -1 : 1));
      if (list.length) boards[b] = list.slice(0, TOP);
    }
    result[id] = { epoch: st.sp.epoch, boards };
  }
  return { games: result, used, names: typed.book, dropped: typed.dropped() };
}

// Play counts: { since, through, recent, games: { id: { version: n } } }.
// Counting isn't idempotent like merging bests, so the sessions re-read in
// the overlap window are recognized by `recent` (hashed session ids of the
// rows received in the window before `through`) and skipped. Rows for
// unknown games or versions (forged, or a game since removed) don't count.
function countPlays(prevPlays, rows) {
  const counts = {};
  const byId = new Map(games.map((g) => [g.id, g]));
  for (const [id, versions] of Object.entries((prevPlays && prevPlays.games) || {})) {
    if (byId.has(id)) counts[id] = { ...versions };
  }
  const seen = new Map(Object.entries((prevPlays && prevPlays.recent) || {}));
  let since = (prevPlays && prevPlays.since) || "";
  let newest = Date.parse((prevPlays && prevPlays.through) || "") || 0;
  let added = 0;
  for (const r of rows) {
    const game = byId.get(r.game_id);
    const v = Number(r.game_version);
    const at = Date.parse(r.received_at || r.submitted_at || "") || 0;
    if (r.kind !== "session") continue;
    newest = Math.max(newest, at);
    const day = at ? new Date(at).toISOString().slice(0, 10) : "";
    if (day && (!since || day < since)) since = day;
    if (!game || !Number.isInteger(v) || v < 1 || v > game.version) continue;
    if (!(Number(r.rounds) >= 1 || Number(r.seconds) >= PLAY_SECONDS)) continue;
    const key = scores.hash(`play:${r.session_id || `${r.client_id}|${r.submitted_at}`}`);
    if (seen.has(key)) continue;
    seen.set(key, at);
    const mine = (counts[game.id] ||= {});
    mine[v] = (mine[v] || 0) + 1;
    added++;
  }
  const recent = {};
  for (const [key, at] of seen) if (at >= newest - OVERLAP_MS) recent[key] = at;
  return { plays: { rule: PLAY_RULE, since, through: newest ? new Date(newest).toISOString() : null, recent, games: counts }, added };
}

// Spotlight tallies of each game's current version, from session rows:
// { through, recent, games: { id: { v, sessions, early, rounds, wins,
// players: { p: seconds } } } }. A revision starts its game over (the old
// version's numbers say nothing about the new one). `early` counts visits
// that left before finishing a round; `players` adds up each player's play
// time (short hashed ids, capped), for "longest player" and the player
// count. Re-read sessions are skipped like the play counts' (`recent`).
const SPOT_PLAYERS = 400; // per game, so the file stays small
function tallySpotlight(prevSpot, rows) {
  const byId = new Map(games.map((g) => [g.id, g]));
  const tallies = {};
  for (const [id, t] of Object.entries((prevSpot && prevSpot.games) || {})) {
    const g = byId.get(id);
    if (g && t && t.v === g.version) tallies[id] = { ...t, players: { ...(t.players || {}) } };
  }
  const seen = new Map(Object.entries((prevSpot && prevSpot.recent) || {}));
  let newest = Date.parse((prevSpot && prevSpot.through) || "") || 0;
  let added = 0;
  for (const r of rows) {
    if (r.kind !== "session") continue;
    const at = Date.parse(r.received_at || r.submitted_at || "") || 0;
    newest = Math.max(newest, at);
    const game = byId.get(r.game_id);
    if (!game || Number(r.game_version) !== game.version || typeof r.client_id !== "string") continue;
    const key = scores.hash(`spot:${r.session_id || `${r.client_id}|${r.submitted_at}`}`);
    if (seen.has(key)) continue;
    seen.set(key, at);
    const t = (tallies[game.id] ||= { v: game.version, sessions: 0, early: 0, rounds: 0, wins: 0, players: {} });
    const rounds = Math.max(0, Math.floor(Number(r.rounds) || 0));
    const wins = Math.min(rounds, Math.max(0, Math.floor(Number(r.wins) || 0)));
    const secs = Math.min(4 * 3600, Math.max(0, Math.round(Number(r.seconds) || 0)));
    t.sessions++;
    if (!rounds) t.early++;
    t.rounds += rounds;
    t.wins += wins;
    const p = scores.hash(`player:${r.client_id}`).slice(0, 8);
    if (p in t.players || Object.keys(t.players).length < SPOT_PLAYERS) t.players[p] = (t.players[p] || 0) + secs;
    added++;
  }
  const recent = {};
  for (const [key, at] of seen) if (at >= newest - OVERLAP_MS) recent[key] = at;
  return { spotlight: { through: newest ? new Date(newest).toISOString() : null, recent, games: tallies }, added };
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
  if (prev) {
    // Still apply takedowns and list changes to the names already shown.
    const { games: kept, names: book } = merge(prev.games, [], prev.names);
    data = { ...prev, games: kept, names: book };
  }
} else {
  const { games: merged, used, names: book, dropped } = merge(full || !prev ? {} : prev.games, rows, full || !prev ? {} : prev.names);
  const newest = rows.reduce((m, r) => Math.max(m, Date.parse(r.received_at || "") || 0), 0);
  const through = newest ? new Date(newest).toISOString() : prev && !full ? prev.through : null;
  data = { format: FORMAT, version: 1, updated_at: new Date().toISOString(), through, games: merged, names: book };
  console.log(`leaderboards: ${rows.length} rows read${since ? ` since ${since}` : ""}, ${used} with a score`);
  console.log(`names: ${Object.keys(book).length} typed name(s) held${dropped ? `, ${dropped} freed (takedown or list)` : ""}`);
}

// Plays are read on their own: a file from before play counts (no `plays`),
// or counted by another rule, reads every session row again, so history
// since telemetry began is kept and follows the current rule.
const prevPlays = !full && prev && prev.plays && prev.plays.games && prev.plays.rule === PLAY_RULE ? prev.plays : null;
const playsSince = prevPlays && prevPlays.through ? new Date(Date.parse(prevPlays.through) - OVERLAP_MS).toISOString() : "";
try {
  const sessions = await fetchSessions(playsSince);
  const { plays, added } = countPlays(prevPlays, sessions);
  data.plays = plays;
  console.log(`plays: ${sessions.length} session rows read${playsSince ? ` since ${playsSince}` : " (all)"}, ${added} counted`);
} catch (err) {
  console.warn(`plays: ${err.message}; keeping the previous counts`);
  if (prev && prev.plays) data.plays = prev.plays;
}
// Spotlight tallies, read on their own like the plays. A file without them
// (or --full) reads every session row, so history since telemetry began is
// rebuilt.
const prevSpot = !full && prev && prev.spotlight && prev.spotlight.games ? prev.spotlight : null;
const spotSince = prevSpot && prevSpot.through ? new Date(Date.parse(prevSpot.through) - OVERLAP_MS).toISOString() : "";
try {
  const sessions = await fetchSessions(spotSince);
  const { spotlight, added } = tallySpotlight(prevSpot, sessions);
  data.spotlight = spotlight;
  console.log(`spotlight: ${sessions.length} session rows read${spotSince ? ` since ${spotSince}` : " (all)"}, ${added} tallied`);
} catch (err) {
  console.warn(`spotlight: ${err.message}; keeping the previous tallies`);
  if (prev && prev.spotlight) data.spotlight = prev.spotlight;
}
for (const [id, versions] of Object.entries((data.plays && data.plays.games) || {})) {
  const list = Object.entries(versions).map(([v, n]) => `v${v} ${n}`).join(", ");
  console.log(`  ${id}: ${Object.values(versions).reduce((a, b) => a + b, 0)} plays (${list})`);
}

for (const [id, g] of Object.entries(data.games)) {
  const game = games.find((x) => x.id === id);
  const sp = game && scores.spec(game);
  for (const [b, list] of Object.entries(g.boards)) {
    console.log(`  ${id}/${b}: ${list.length} player(s), #1 ${sp ? scores.format(sp, list[0].s) : list[0].s} (${list[0].h})`);
  }
}
if (out) writeFileSync(out, JSON.stringify(data) + "\n");
