// assets/names.js (typed leaderboard names: cleaning, folding, the checks)
// for Node scripts, with the word lists and the takedown list loaded.
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(read("assets/names.js"), sandbox);
export const names = sandbox.window.ArcadeNames;
export const lists = {
  reserved: JSON.parse(read("assets/name-reserved.json")),
  blocked: JSON.parse(read("assets/name-blocked.json")),
};
// NAME_TAKEDOWNS points the builder at another list (scripts/test-names.mjs).
export const takedowns = new Set(
  (JSON.parse(read(process.env.NAME_TAKEDOWNS || "data/name-takedowns.json")).players || []).map((x) => (typeof x === "string" ? x : x && x.p)).filter(Boolean)
);
