#!/usr/bin/env node
// The topic zip ("Download all <topic> games", assets/bundle.js), end to end:
// for every topic a playable game uses, press the gallery's button in
// Chromium, save the zip, unzip it with Python's zipfile (an independent
// reader), check it holds exactly that topic's games plus index.html, then
// open index.html from file:// with the network blocked, open every game
// from its link and fail on any console error, failed request or a game
// that doesn't draw. One line per topic, with the archive size.
//
//   node scripts/test-bundle.mjs [<topic> ...] [--out dir]
import http from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execFileSync, execSync } from "node:child_process";
import os from "node:os";
import { selfContainedProblems } from "./self-contained.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? args[outIdx + 1] : join(os.tmpdir(), "arcade-bundle");
const only = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1] === "--out"));
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (_) {
    const require = createRequire(import.meta.url);
    return require(join(execSync("npm root -g").toString().trim(), "playwright"));
  }
}
const { chromium } = await loadPlaywright();
const Topics = (await import("./topics.mjs")).topics;
const manifest = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8"));
const live = manifest.games.filter((g) => g.status !== "archived");
const gamesOf = (id) => live.filter((g) => (g.topics || []).includes(id)).sort((a, b) => a.title.localeCompare(b.title));
const topics = Topics.LIST.filter((t) => gamesOf(t.id).length && (!only.length || only.includes(t.id)));
if (only.length && topics.length !== only.length) {
  console.error(`Unknown or unused topic in: ${only.join(", ")}`);
  process.exit(1);
}

// § server: the repo, with play stats and feedback switched off.

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "") || "index.html";
  const file = join(root, rel);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  let body = readFileSync(file);
  if (rel === join("assets", "config.js")) body = body.toString().replace(/feedbackEndpoint:\s*"[^"]*"/, 'feedbackEndpoint: ""');
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

// Python's zipfile: the names, then extract (run isolated, -I).
const PY = `
import sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
bad = z.testzip()
if bad: sys.exit("bad CRC: " + bad)
print("\\n".join(z.namelist()))
z.extractall(sys.argv[2])
`;

// A game draws when its screenshot has more than a handful of colours.
async function drew(page) {
  const png = await page.screenshot({ type: "jpeg", quality: 60 });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/jpeg;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 120; c.height = 90;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, 120, 90);
    const d = x.getImageData(0, 0, 120, 90).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4) seen.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4));
    return seen.size;
  }, png.toString("base64"));
}

let failures = 0;
const browser = await chromium.launch();
const gallery = await (await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } })).newPage();
const sizes = [];

for (const t of topics) {
  const want = gamesOf(t.id);
  const problems = [];
  let size = 0;
  try {
    await gallery.goto(`${base}#/?topic=${t.id}`);
    await gallery.waitForSelector("#topicBundle:not([hidden]) #topicBundleBtn");
    const label = await gallery.locator("#topicBundleBtn").textContent();
    if (label !== `Download all ${t.label} games (${want.length})`) problems.push(`button "${label}"`);
    const [dl] = await Promise.all([gallery.waitForEvent("download"), gallery.locator("#topicBundleBtn").click()]);
    const zipPath = join(outDir, dl.suggestedFilename());
    await dl.saveAs(zipPath);
    size = statSync(zipPath).size;
    if (!/^emergent-arcade-[a-z-]+-\d{4}-\d{2}-\d{2}\.zip$/.test(dl.suggestedFilename())) problems.push(`file name ${dl.suggestedFilename()}`);
    const dest = join(outDir, t.id);
    const names = execFileSync("python3", ["-I", "-c", PY, zipPath, dest]).toString().trim().split("\n");
    const dir = `emergent-arcade-${t.id}/`;
    const expect = [dir, `${dir}index.html`, ...want.map((g) => `${dir}${g.id}-v${g.version}.html`)];
    if (JSON.stringify(names) !== JSON.stringify(expect)) problems.push(`zip lists ${names.map((n) => n.replace(dir, "")).join(", ")}`);
    for (const g of want) {
      const f = join(dest, dir, `${g.id}-v${g.version}.html`);
      if (!existsSync(f)) continue;
      const p = selfContainedProblems(readFileSync(f, "utf8"));
      if (p.length) problems.push(`${g.id}: ${p[0]}`);
    }

    // Offline, from file://: nothing but file: URLs may load.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, offline: true });
    await ctx.route(/^(?!file:)/, (route) => { problems.push(`request ${route.request().url().slice(0, 60)}`); route.abort(); });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("requestfailed", (r) => errs.push(`failed ${r.url().slice(0, 60)}`));
    const index = pathToFileURL(join(dest, dir, "index.html")).href;
    await page.goto(index);
    const links = await page.$$eval("a.play", (as) => as.map((a) => [a.getAttribute("href"), a.textContent]));
    if (JSON.stringify(links.map((l) => l[0])) !== JSON.stringify(want.map((g) => `${g.id}-v${g.version}.html`))) problems.push(`index links ${links.map((l) => l[0]).join(", ")}`);
    const page0 = await page.evaluate(() => ({ lang: document.documentElement.lang, main: !!document.querySelector("main"), h1: !!document.querySelector("h1"), h2: document.querySelectorAll("h2").length }));
    if (!page0.lang || !page0.main || !page0.h1 || page0.h2 !== want.length) problems.push(`index structure ${JSON.stringify(page0)}`);
    await page.screenshot({ path: join(outDir, `${t.id}-index.png`), fullPage: true });
    for (const g of want) {
      await page.goto(index);
      await page.locator(`a.play[href="${g.id}-v${g.version}.html"]`).click();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1200);
      const colours = await drew(page);
      if (colours < 6) problems.push(`${g.id} didn't draw (${colours} colours)`);
    }
    if (errs.length) problems.push(...[...new Set(errs)].slice(0, 3));
    await ctx.close();
  } catch (err) {
    problems.push(String(err.message || err).split("\n")[0]);
  }
  sizes.push([t.id, want.length, size]);
  if (problems.length) failures++;
  console.log(`${problems.length ? "FAIL" : "ok  "} ${t.id}: ${want.length} game${want.length === 1 ? "" : "s"}, ${Math.round(size / 1024)} KB${problems.length ? `: ${problems.slice(0, 4).join("; ")}` : ", index and every game opened offline, no errors"}`);
}

await browser.close();
server.close();
console.log(`${failures ? `${failures} topic(s) failed` : "all topics passed"}; total ${Math.round(sizes.reduce((n, s) => n + s[2], 0) / 1024)} KB over ${sizes.length} zips; files in ${outDir}`);
process.exit(failures ? 1 : 0);
