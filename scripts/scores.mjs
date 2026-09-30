// assets/scores.js (score rules, board names, public handles) for Node
// scripts: run in a stand-in window so the rules live in one place.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(root, "assets/scores.js"), "utf8"), sandbox);
export const scores = sandbox.window.ArcadeScores;
