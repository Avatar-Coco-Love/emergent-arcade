// Shared by the link-preview scripts: the repo root, the manifest and the
// published site URL (read from assets/config.js, so it lives in one place).
// The manifest has its {tap}-style placeholders filled with the phone words:
// link previews are mostly opened on phones (Messenger, Facebook).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { wording } from "./wording.mjs";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8"));
export const manifest = { ...raw, games: raw.games.map((g) => wording.game(g, true)) };
const config = readFileSync(join(root, "assets/config.js"), "utf8");
export const siteUrl = (config.match(/siteUrl:\s*"([^"]+)"/) || [])[1];
export const ogImage = (id) => `assets/og/${id}.png`;
