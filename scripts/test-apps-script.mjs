#!/usr/bin/env node
// Runs feedback/apps-script/Code.gs against an in-memory fake Sheet, so the
// backend can be checked before anyone redeploys it. One line per case.
//   node scripts/test-apps-script.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";

const code = readFileSync(new URL("../feedback/apps-script/Code.gs", import.meta.url), "utf8");

function makeEnv(props = {}, preset = {}) {
  const tabs = {};
  function sheet(name, data = []) {
    const s = {
      data,
      getName: () => name,
      getLastRow: () => s.data.length,
      getLastColumn: () => Math.max(0, ...s.data.map((r) => r.length)),
      getMaxRows: () => Math.max(1000, s.data.length),
      getMaxColumns: () => Math.max(26, s.getLastColumn()),
      setFrozenRows() {},
      getRange: (row, col, nr, nc) => ({
        getValues: () => Array.from({ length: nr }, (_, i) =>
          Array.from({ length: nc }, (_, j) => (s.data[row - 1 + i] || [])[col - 1 + j] ?? "")),
        setValues(vals) {
          vals.forEach((v, i) => {
            const r = (s.data[row - 1 + i] = s.data[row - 1 + i] || []);
            v.forEach((x, j) => { r[col - 1 + j] = x; });
          });
        },
      }),
    };
    return (tabs[name] = s);
  }
  for (const [k, v] of Object.entries(preset)) sheet(k, v);
  const out = (s) => ({ text: s, setMimeType() { return this; } });
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => tabs[n] || null,
      insertSheet: (n) => sheet(n),
      getSheets: () => Object.values(tabs),
    }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperties: () => props, getProperty: (k) => props[k] ?? null,
    }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ContentService: { createTextOutput: out, MimeType: { JSON: "json", CSV: "csv" } },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return {
    tabs,
    post: (body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }).text),
    get: (p) => { const t = ctx.doGet({ parameter: p }).text; try { return JSON.parse(t); } catch { return t; } },
  };
}

let failed = 0;
function check(name, cond, detail = "") {
  if (!cond) failed++;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond ? "" : "  " + detail}`);
}

const KEY = { READ_KEY: "k1, k2" };
const fb = { game_id: "ant-trails", game_version: 2, rating: 4, comment: "fun", client_id: "c1", submitted_at: "t" };
const round = { kind: "round", game_id: "ant-trails", game_version: 2, session_id: "s", client_id: "c1", device: "touch",
  round: 1, outcome: "win", seconds: 61.44, level: 3, run: "abc", attempt: 2, reason: "ants", stats: { dawn: 24 } };
const session = { kind: "session", game_id: "ant-trails", game_version: 2, session_id: "s", client_id: "c1",
  seconds: 90, rounds: 2, wins: 1, wall_seconds: 100, achievements: "first-crumb", achievements_total: 3 };

{
  const env = makeEnv(KEY);
  check("feedback accepted", env.post(fb).ok);
  check("round accepted", env.post(round).ok);
  check("session accepted", env.post(session).ok);
  const r = env.get({ key: "k1", tab: "telemetry" }).rows;
  check("telemetry read back", r.length === 2 && r[0].level === 3 && r[0].stats === "dawn=24" && r[1].wins === 1, JSON.stringify(r));
  check("second read key works", env.get({ key: "k2" }).count === 1);
  check("wrong key rejected", env.get({ key: "nope" }).error === "unauthorized");
  check("ping is public", env.get({ ping: "1" }).version === 3);
}
{
  const env = makeEnv(KEY);
  env.post({ ...round, score: 1200, path: [1, 2, 3], hints: { used: true }, "Bad-Key": 1, type: "arcade:result", game: "x" });
  const row = env.get({ key: "k1", tab: "telemetry" }).rows[0];
  check("unknown fields kept via extra", row.score === 1200 && row.path.length === 3 && row.hints.used === true, JSON.stringify(row));
  check("malformed/envelope keys dropped", !("Bad-Key" in row) && !("type" in row) && !("game" in row) && !("extra" in row));
  check("draw outcome accepted", env.post({ ...round, outcome: "draw" }).ok);
}
{
  const env = makeEnv(KEY);
  check("new kind goes to events", env.post({ kind: "gallery", action: "filter", verb: "hold" }).ok);
  const e = env.get({ key: "k1", tab: "events" }).rows[0];
  check("event read back", e.kind === "gallery" && e.action === "filter" && e.game_id === "", JSON.stringify(e));
  check("bad kind rejected", env.post({ kind: "Round!" }).error === "bad kind");
}
{
  const env = makeEnv(KEY);
  check("comment-only feedback", env.post({ ...fb, rating: undefined, comment: "crashed on level 2" }).ok);
  check("empty feedback rejected", env.post({ ...fb, rating: undefined, comment: "" }).error === "bad rating");
  check("bad rating rejected", env.post({ ...fb, rating: 9 }).error === "bad rating");
  check("bad game_id rejected", env.post({ ...fb, game_id: "Ant Trails" }).error === "bad game_id");
  check("bad json rejected", env.post("{nope").error === "bad json");
  env.post({ ...fb, comment: "=HYPERLINK(1)" });
  check("formula escaped", env.tabs.feedback.data.at(-1)[4] === "'=HYPERLINK(1)");
}
{
  const env = makeEnv(KEY);
  const res = env.post({ defaults: { game_id: "ant-trails", game_version: 2, session_id: "s", client_id: "c1" },
    batch: [{ kind: "round", outcome: "loss", seconds: 5 }, { kind: "round", outcome: "win", seconds: 7 }, { kind: "round", seconds: 1 }, session] });
  check("batch stores valid, reports invalid", res.stored === 3 && res.errors.length === 1 && res.errors[0].i === 2, JSON.stringify(res));
  const p1 = env.get({ key: "k1", tab: "telemetry", limit: "2" });
  const p2 = env.get({ key: "k1", tab: "telemetry", after: String(p1.next) });
  check("paging with limit/after", p1.count === 2 && p1.next && p2.count === 1 && p2.next === null, JSON.stringify([p1.next, p2]));
  check("filter by kind", env.get({ key: "k1", tab: "telemetry", kind: "session" }).count === 1);
  check("since in future returns none", env.get({ key: "k1", tab: "telemetry", since: "2999-01-01" }).count === 0);
  check("since in past returns all", env.get({ key: "k1", tab: "telemetry", since: "2000-01-01" }).count === 3);
  const csv = env.get({ key: "k1", tab: "telemetry", format: "csv" });
  check("csv has header + rows", typeof csv === "string" && csv.split("\n").length === 4 && csv.startsWith("received_at"));
  const info = env.get({ key: "k1", info: "1" });
  check("info counts rows", info.tabs.telemetry.rows === 3 && info.cell_limit === 1e7);
}
{
  const env = makeEnv({ ...KEY, WRITES_PAUSED: "1" });
  check("writes paused", env.post(fb).error === "paused");
  const env2 = makeEnv({ ...KEY, BLOCKED_CLIENTS: "spam1" });
  check("blocked client silently dropped", env2.post({ ...fb, client_id: "spam1" }).ok && !env2.tabs.feedback);
}
{
  // Tabs written by the previous script (no "extra" column yet).
  const oldHeader = ["received_at", "game_id", "game_version", "rating", "comment", "client_id", "submitted_at"];
  const env = makeEnv(KEY, { feedback: [oldHeader, ["2026-09-01T00:00:00Z", "ant-trails", 1, 5, "old", "c0", "t"]] });
  env.post({ ...fb, tags: ["hard"] });
  const rows = env.get({ key: "k1" }).rows;
  check("old tab extended, old rows intact", env.tabs.feedback.data[0].length === 8 && rows[0].comment === "old" && rows[1].tags[0] === "hard", JSON.stringify(rows));
}
{
  const env = makeEnv(KEY);
  const big = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, "x".repeat(400)]));
  env.post({ ...fb, ...big });
  const cell = env.tabs.feedback.data[1][7];
  check("extra capped", cell.length <= 8000 && JSON.parse(cell).k0.length === 400, String(cell.length));
  check("oversize batch rejected", env.post({ batch: Array(201).fill(fb) }).error === "batch too large");
}

console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
