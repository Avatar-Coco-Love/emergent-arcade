#!/usr/bin/env node
// Tests typed leaderboard names (docs/scores.md, "Typed names"): the
// validator in assets/names.js with the real word lists, then the builder
// (first claim wins, renames, takedowns) on made-up telemetry rows.
// One line per case; exits 1 on any failure.
//   node scripts/test-names.mjs
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { names, lists } from "./names.mjs";
import { scores } from "./scores.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
function ok(cond, label, detail = "") {
  console.log(`${cond ? "ok  " : "FAIL"} ${label}${cond || !detail ? "" : `: ${detail}`}`);
  if (!cond) failed++;
}

// ---------- the validator ----------

const owners = new Map([[names.key("Coco"), "p-coco"]]);
const opts = { lists, isRandom: scores.isHandle, owner: (k) => owners.get(k) || "", me: "p-me" };
const expect = (reason, list) => {
  for (const text of list) {
    const got = names.check(text, opts);
    ok((got.reason || "ok") === reason, `${reason.padEnd(8)} ${JSON.stringify(text)}`, `got ${got.reason || "ok"} (${got.message})`);
  }
};

expect("ok", ["Kiko", "Ada Lovelace", "Zoë", "José 99", "Анна", "さくら", "東京タワー", "Glass", "Peacock",
  "Fukuda", "Pakistan", "Therapist", "Atwater", "Tilt", "Georgy", "Devon", "Claudia", "Scarlett", "Cassie"]);
expect("length", ["ab", "Abcdefghijklmnopq"]);
expect("chars", ["Coco!", "Coco😀", "12345", "Coe\u0301\u0301\u0301", "Co_co"]);
expect("script", ["CoСo" /* Cyrillic С */, "Abcδ"]);
expect("random", ["Amber Otter"]);
expect("reserved", ["Admin", "4dm1n", "The Arcade", "Official Bob", "Mod", "dev", "Claude", "ANTHROPIC fan", "Owner", "Støff Staff", "Support"]);
expect("blocked", ["Sh1t", "fuuuck", "Fu ck", "a s s", "asss", "Big Ass", "B1tch", "ßlut", "Ph uck"]);
expect("taken", ["Coco", "coco", "C0co", "Co co", "Сосо" /* Cyrillic */, "Çocó"]);

// Cleaning and the tag.
ok(names.clean("  Co   co\t") === "Co co", "clean trims and collapses spaces");
ok(names.check("Coco", { ...opts, me: "p-coco" }).ok, "own name is not taken");
const p = scores.hash("player:abc");
ok(/^Kiko ·[0-9A-F]{4}$/.test(names.display("Kiko", p)) && names.tag(p) === names.tag(p), `tag "${names.display("Kiko", p)}"`);
ok(!names.check("Kiko ·4F2A", opts).ok, "a typed tag is refused");

// ---------- the builder ----------

const dir = mkdtempSync(join(tmpdir(), "names-"));
const at = (min) => new Date(Date.UTC(2026, 9, 2, 12, min)).toISOString();
const round = (client, min, score, extra) => ({ kind: "round", game_id: "pressure-grid", game_version: 9, client_id: client,
  outcome: "win", score, board: "main", score_epoch: 2, lb: 1, handle: scores.defaultHandle(client), received_at: at(min), ...extra });
const rename = (client, min, extra) => ({ kind: "gallery", action: "handle", client_id: client, lb: 1,
  handle: scores.defaultHandle(client), received_at: at(min), ...extra });
const P = (client) => scores.hash(`player:${client}`);

function build(rows, prev, takedown = []) {
  writeFileSync(join(dir, "rows.json"), JSON.stringify(rows));
  writeFileSync(join(dir, "td.json"), JSON.stringify({ players: takedown.map((c) => ({ p: P(c) })) }));
  const args = ["scripts/build-leaderboards.mjs", "--input", join(dir, "rows.json"), "--out", join(dir, "out.json")];
  if (prev) {
    writeFileSync(join(dir, "prev.json"), JSON.stringify(prev));
    args.push("--prev", join(dir, "prev.json"));
  }
  execFileSync("node", args, { cwd: root, env: { ...process.env, NAME_TAKEDOWNS: join(dir, "td.json") }, stdio: "pipe" });
  const data = JSON.parse(readFileSync(join(dir, "out.json"), "utf8"));
  const shown = Object.fromEntries(data.games["pressure-grid"].boards.main.map((e) => [e.p, e.h]));
  return { data, h: (client) => shown[P(client)] };
}

// a claims Kiko first; b asks for "K1ko" later and falls back to random.
let r = build([round("a", 1, 5, { name: "Kiko" }), round("b", 2, 7, { name: "K1ko" })]);
ok(r.h("a") === names.display("Kiko", P("a")), "first claim wins", r.h("a"));
ok(r.h("b") === scores.defaultHandle("b"), "later claimant falls back to random", r.h("b"));
ok(r.data.names[P("a")].n === "Kiko" && !r.data.names[P("b")], "names block holds the claim");

// Next build: b renames to an allowed name with a handle event only.
r = build([rename("b", 70, { name: "Bea" })], r.data);
ok(r.h("b") === names.display("Bea", P("b")) && r.h("a") === names.display("Kiko", P("a")), "rename from a handle event", r.h("b"));

// A blocked or reserved name sent past the gallery: random name.
r = build([rename("c", 71, { name: "Sh1t" }), round("c", 72, 3), rename("d", 73, { name: "Admin" }), round("d", 74, 2, { name: "Admin" })]);
ok(r.h("c") === scores.defaultHandle("c") && r.h("d") === scores.defaultHandle("d"), "builder refuses blocked and reserved names");

// a picks a random name again: Kiko is freed and b can claim it.
r = build([round("a", 1, 5, { name: "Kiko" }), round("b", 2, 7), rename("a", 80, { handle: "Misty Wren" }), rename("b", 81, { name: "Kiko" })]);
ok(r.h("a") === "Misty Wren" && r.h("b") === names.display("Kiko", P("b")), "a freed name can be claimed", `${r.h("a")} / ${r.h("b")}`);

// Takedown: a goes back to random with no new rows, and stays there.
const before = build([round("a", 1, 5, { name: "Kiko" })]);
r = build([], before.data, ["a"]);
ok(r.h("a") === scores.defaultHandle("a") && !r.data.names[P("a")], "takedown restores the random name", r.h("a"));
r = build([rename("a", 90, { name: "Kiko" })], r.data, ["a"]);
ok(r.h("a") === scores.defaultHandle("a"), "a taken-down player can't type a name");

// An incremental build with no rows keeps everything; opting out keeps the claim.
r = build([], before.data);
ok(r.h("a") === names.display("Kiko", P("a")), "an empty build keeps typed names");
r = build([round("b", 2, 7), { kind: "gallery", action: "handle", client_id: "a", lb: 0, received_at: at(95) }], before.data);
ok(!r.h("a") && r.data.names[P("a")].n === "Kiko", "opting out drops the entry, keeps the claim");

rmSync(dir, { recursive: true, force: true });
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
