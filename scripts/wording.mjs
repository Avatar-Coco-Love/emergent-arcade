// assets/wording.js (the gallery's tap/click placeholders) for Node scripts:
// run in a stand-in window so the table lives in one place.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(root, "assets/wording.js"), "utf8"), sandbox);
export const wording = sandbox.window.ArcadeWording;
