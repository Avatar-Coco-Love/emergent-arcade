// Shared by the link-preview scripts: the repo root, the manifest and the
// published site URL (read from assets/config.js, so it lives in one place).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const manifest = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8"));
const config = readFileSync(join(root, "assets/config.js"), "utf8");
export const siteUrl = (config.match(/siteUrl:\s*"([^"]+)"/) || [])[1];
export const ogImage = (id) => `assets/og/${id}.png`;
