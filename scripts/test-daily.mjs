#!/usr/bin/env node
// Tests the Daily Challenge (docs/daily.md): the pick in assets/daily.js
// with the real manifest and with made-up rotations, then the builder's
// daily boards (first run only, the date's game, a sane upload time,
// incremental merges, old days dropped) on made-up telemetry rows.
// One line per case; exits 1 on any failure.
//   node scripts/test-daily.mjs
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { daily } from "./daily.mjs";
import { scores } from "./scores.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const games = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8")).games;
let failed = 0;
function ok(cond, label, detail = "") {
  console.log(`${cond ? "ok  " : "FAIL"} ${label}${cond || !detail ? "" : `: ${detail}`}`);
  if (!cond) failed++;
}

// ---------- the pick ----------

const fake = (n, from = "2026-10-04") => Array.from({ length: n }, (_, i) => ({ id: `g${i}`, daily: { from } }));
for (const n of [1, 2, 3, 5, 8]) {
  const list = fake(n);
  const days = Array.from({ length: n * 12 }, (_, i) => daily.addDays(daily.START, i));
  const picks = days.map((d) => daily.pick(list, d));
  const repeats = picks.filter((p, i) => i && p === picks[i - 1]).length;
  ok(n === 1 || repeats === 0, `${n} games: no game two days running`, `${repeats} repeats`);
  let fair = true;
  for (let c = 0; c < 12; c++) if (new Set(picks.slice(c * n, c * n + n)).size !== n) fair = false;
  ok(fair, `${n} games: every game once per ${n}-day cycle`);
}
ok(daily.pick(fake(3), "2026-10-04") === daily.pick(fake(3).reverse(), "2026-10-04"), "the manifest's order doesn't matter");
ok(daily.pick([{ id: "late", daily: { from: "2026-12-01" } }], "2026-11-30") === null, "a game joins on its from date, not before");
ok(daily.pick([{ id: "old", daily: { from: "2026-10-04" }, status: "archived" }], "2026-10-10") === null, "archived games leave the rotation");
ok(daily.pick(fake(3), "not-a-date") === null, "a bad date picks nothing");
ok(daily.number(daily.START) === 1 && daily.number(daily.addDays(daily.START, 9)) === 10, "Daily #1 is START, #10 nine days later");
const real = daily.pool(games, daily.addDays(daily.START, 30));
ok(real.length >= 2, `real manifest: ${real.length} games in the rotation (${real.join(", ")})`);

// ---------- class challenge codes ----------

// Codes from the gallery's alphabet: the corners plus a seeded spread.
const ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
const codes = ["aaaaa", "99999", "k7m2q", "aaaab", "baaaa"];
for (let i = 0, x = 7; i < 3000; i++) {
  let c = "";
  for (let k = 0; k < 5; k++) c += ALPHA[(x = (Math.imul(x, 1103515245) + 12345) >>> 0) % 31];
  codes.push(c);
}
ok(codes.every((c) => daily.isCode(c)) && !daily.isCode("abcd1") && !daily.isCode("ABCDE"), "codes: 5 of 31 characters, lower case");
ok(codes.every((c) => daily.challengeDate(c) === daily.challengeDate(c)), "a challenge code gives the same seed every time");
ok(codes.every((c) => /^\d{4}-\d\d-\d\d$/.test(daily.challengeDate(c))), "the seed string passes the games' ?daily= check (no game change)");
ok(new Set(codes.map(daily.challengeDate)).size === new Set(codes).size, "different codes, different seed strings");
ok(codes.every((c) => !daily.calendar(daily.challengeDate(c)) && daily.pick(games, daily.challengeDate(c)) === null), "never a calendar day: pick() and the daily board ignore it");
const year = Array.from({ length: 366 }, (_, i) => daily.addDays(new Date().toISOString().slice(0, 10), i));
const dailyIds = games.filter((g) => g.daily).map((g) => g.id);
let clashes = 0;
for (const id of dailyIds) {
  const seeds = new Set(year.map((d) => daily.hash32(`${id}:${d}`)));
  for (const c of codes) if (seeds.has(daily.hash32(`${id}:${daily.challengeDate(c)}`))) clashes++;
}
ok(clashes === 0, `${codes.length} codes × ${dailyIds.length} games: no seed equals a Daily seed of the next year`, `${clashes} clashes`);

// ---------- the builder's daily boards ----------

const dir = mkdtempSync(join(tmpdir(), "daily-"));
const today = new Date().toISOString().slice(0, 10);
const game = daily.pick(games, today);
const other = games.find((g) => g.id !== game && g.score).id;
const sp = scores.spec(games.find((g) => g.id === game));
const at = (date, hours) => new Date(Date.parse(`${date}T00:00:00Z`) + hours * 3600e3).toISOString();
const P = (client) => scores.hash(`player:${client}`);
const row = (client, score, extra) => ({ kind: "round", client_id: client, game_id: game, game_version: 1, outcome: "win",
  score, score_epoch: sp.epoch, lb: 1, handle: scores.defaultHandle(client), daily: today, daily_first: 1, run: "run1",
  received_at: at(today, 12), ...extra });

function build(rows, prev) {
  writeFileSync(join(dir, "rows.json"), JSON.stringify(rows));
  const args = ["scripts/build-leaderboards.mjs", "--input", join(dir, "rows.json"), "--out", join(dir, "out.json")];
  if (prev) {
    writeFileSync(join(dir, "prev.json"), JSON.stringify(prev));
    args.push("--prev", join(dir, "prev.json"));
  }
  execFileSync("node", args, { cwd: root, stdio: "pipe" });
  const data = JSON.parse(readFileSync(join(dir, "out.json"), "utf8"));
  const b = (data.daily || {})[today];
  const s = b ? Object.fromEntries(b.top.map((e) => [e.p, e.s])) : {};
  return { data, b, s: (client) => s[P(client)] };
}

let r = build([
  row("a", 1), row("a", 3, { received_at: at(today, 13) }),
  row("a", 9, { daily_first: 0, run: "run2", received_at: at(today, 14) }), // practice
  row("a", 8, { run: "run2", received_at: at(today, 15) }), // a second "first" run (storage cleared)
  row("b", 2, { run: "bbb" }),
  row("c", 5, { game_id: other }), // not the day's game
  row("d", 5, { received_at: at(today, 24 * 3) }), // three days late
  row("e", 5, { daily_first: "1", score_epoch: sp.epoch + 1 }), // wrong epoch
  row("f", sp.max + 1), // over max
]);
ok(r.b && r.b.game === game, `daily board for ${today} is ${game}`);
ok(r.s("a") === 3, "first run's best counts (3), practice and a second first run don't", `got ${r.s("a")}`);
ok(r.s("b") === 2, "another player's first run counts");
ok([r.s("c"), r.s("d"), r.s("e"), r.s("f")].every((x) => x === undefined), "wrong game, late upload, wrong epoch, over max are dropped");
ok(r.b && r.b.n === 2, "n counts the players on the board", `n ${r.b && r.b.n}`);
const main = ((r.data.games[game] || {}).boards || {}).main || [];
ok(!main.length, "daily rounds stay off the game's own board");

// Class challenge rounds reach no board, even with a score or a date-shaped daily.
const chCode = "k7m2q";
const rc = build([
  row("h", 5, { challenge: chCode, challenge_first: 1, daily: undefined, daily_first: undefined }),
  row("i", 5, { daily: daily.challengeDate(chCode) }),
  row("j", 5, { challenge: chCode, challenge_score: 5, score: undefined, daily: undefined, daily_first: undefined }),
]);
const anyBoard = Object.values(rc.data.games || {}).some((g) => Object.values(g.boards || {}).some((l) => l.length));
ok(!anyBoard && !Object.keys(rc.data.daily || {}).length, "challenge rounds stay off every board");

// Incremental: the next build starts from this file.
const prev = r.data;
prev.daily[daily.addDays(today, -20)] = { game, n: 1, top: [{ h: "Amber Otter", p: "x", s: 1, at: "2026-01-01" }] };
r = build([row("a", 4, { received_at: at(today, 16) }), row("g", 1, { run: "ggg" })], prev);
ok(r.s("a") === 4 && r.s("b") === 2 && r.s("g") === 1, "incremental: the first run grows, others are kept, newcomers join");
ok(!r.data.daily[daily.addDays(today, -20)], "boards older than 14 days are dropped");
ok(r.b.top[0].p === P("a") && r.b.top[0].h === scores.defaultHandle("a"), "best first, with the player's random name");

rmSync(dir, { recursive: true, force: true });
console.log(failed ? `\n${failed} failure(s)` : "\nOK");
process.exit(failed ? 1 : 0);
