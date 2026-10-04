// assets/daily.js (the Daily Challenge pick) for Node scripts: run in a
// stand-in window so the build agrees with the gallery on each date's game.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(root, "assets/daily.js"), "utf8"), sandbox);
export const daily = sandbox.window.ArcadeDaily;
