#!/usr/bin/env node
// Browser playthrough for Pressure Grid's levels (Playwright + Chromium).
// Solves each level with the balance script's solver (imported, not copied),
// then plays the solution line by pointer in the game, embedded in a
// sandboxed iframe (like the gallery) at 390×844 and 844×390. One line per
// level and size: solved/stars, no-scroll, page errors. Per size it also
// checks that arcade:pause blocks a move and that arcade:result is posted.
//
//   node scripts/playthrough-pressure-grid.mjs [--level N] [--budget S] [--out <dir>]
//
// Screenshots go to --out (default: a temp dir, printed), never into the
// repo. Exits non-zero on any failure.
import http from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import os from "node:os";
import { solve, levelDefs } from "./balance-pressure-grid.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf(name); return i < 0 ? d : args[i + 1]; };
const ONLY = opt("--level", null);
const BUDGET_MS = 1000 * +opt("--budget", 120);
const outDir = opt("--out", join(os.tmpdir(), "arcade-playthrough-pressure-grid"));
mkdirSync(outDir, { recursive: true });

async function loadPlaywright() {
  try { return await import("playwright"); } catch (_) {
    const require = createRequire(import.meta.url);
    return require(join(execSync("npm root -g").toString().trim(), "playwright"));
  }
}
const { chromium } = await loadPlaywright();

// § solve
const levels = [];
let failed = false;
levelDefs.forEach((def, idx) => {
  if (ONLY !== null && +ONLY !== idx + 1) return;
  const s = solve(def, { budget: BUDGET_MS });
  if (!s.line) { console.log(`L${idx + 1} ${def.id}: FAIL solver ${s.overBudget ? "over budget" : "found no solution"}`); failed = true; return; }
  if (s.par !== def.par) console.log(`L${idx + 1} ${def.id}: note: solver par ${s.par}, LEVELS says ${def.par}`);
  levels.push({ idx, def, line: s.line, w: s.L.w, h: s.L.h });
});

// § server: the repo, plus a host page that embeds the game like the gallery.
const HOST = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100vw;height:100vh;display:block}</style>
<iframe id="g" sandbox="allow-scripts" src="/games/pressure-grid.html"></iframe>
<script>
  window.msgs = [];
  addEventListener('message', e => { if (e.data && typeof e.data === 'object') msgs.push(e.data); });
  window.send = m => document.getElementById('g').contentWindow.postMessage(m, '*');
</script>`;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  if (p === "/__host") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HOST); }
  const f = normalize(join(root, p));
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// § play
const browser = await chromium.launch();
const SIZES = [[390, 844], [844, 390]];
for (const [vw, vh] of SIZES && levels.length ? SIZES : []) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  let errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${base}/__host`);
  const frame = await (await page.waitForSelector("#g")).contentFrame();
  await frame.waitForSelector("#levels button.lv");
  // Open every level, as a returning player with the full total would see it.
  await page.evaluate(n => send({ type: "arcade:best", bests: { main: n } }), levelDefs.length * 3);
  await frame.waitForFunction(() => [...document.querySelectorAll("#levels button.lv")].every(b => !b.disabled));

  const centre = async (w, h, k) => {
    const b = await frame.locator("#board").boundingBox();
    return { x: b.x + ((k % w) + 0.5) * b.width / w, y: b.y + (Math.floor(k / w) + 0.5) * b.height / h };
  };
  const moveCount = () => frame.evaluate(() => +(document.getElementById("stat").textContent.match(/Moves (\d+)/) || [])[1]);
  async function act(lv, [i, j]) {
    const a = await centre(lv.w, lv.h, i);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    if (j >= 0) { const b = await centre(lv.w, lv.h, j); await page.mouse.move(b.x, b.y, { steps: 6 }); }
    await page.mouse.up();
  }

  let pauseChecked = false;
  for (const lv of levels) {
    const tag = `L${lv.idx + 1} ${lv.def.id.padEnd(9)} ${vw}x${vh}`;
    const problems = [];
    errors = [];
    await frame.locator("#levels button.lv").nth(lv.idx).click();
    await frame.waitForFunction(n => document.querySelector("#msg").textContent.startsWith(n + "."), lv.idx + 1);

    let pauseNote = "";
    if (!pauseChecked) {
      pauseChecked = true; pauseNote = " | pause blocks move";
      await page.evaluate(() => send({ type: "arcade:pause" }));
      await page.waitForTimeout(50);
      await act(lv, lv.line[0]);
      if ((await moveCount()) !== 0) { problems.push("move played while paused"); pauseNote = " | PAUSE LEAKS"; }
      await page.evaluate(() => send({ type: "arcade:resume" }));
      await page.waitForTimeout(50);
    }

    const before = await page.evaluate(() => msgs.length);
    for (const m of lv.line) await act(lv, m);
    const msg = await frame.locator("#msg").textContent();
    const solved = /Solved in (\d+) moves/.exec(msg);
    const stars = (msg.match(/★/g) || []).length;
    if (!solved) problems.push(`not solved (moves ${await moveCount()})`);
    else if (+solved[1] !== lv.line.length) problems.push(`solved in ${solved[1]}, line has ${lv.line.length}`);
    if (solved && lv.line.length <= lv.def.par && stars !== 3) problems.push(`${stars} stars at par`);
    await page.waitForFunction(n => msgs.slice(n).some(d => d.type === "arcade:result"), before, { timeout: 2000 }).catch(() => {});
    const res = (await page.evaluate(n => msgs.slice(n), before)).find(d => d.type === "arcade:result");
    if (!res) problems.push("no arcade:result");
    else if (res.level !== lv.idx + 1 || res.outcome !== "win" || res.stats?.actions !== lv.line.length) problems.push(`bad arcade:result ${JSON.stringify(res).slice(0, 80)}`);
    const scroll = await frame.evaluate(() => {
      const d = document.documentElement;
      return d.scrollWidth <= innerWidth + 1 && d.scrollHeight <= innerHeight + 1;
    });
    if (!scroll) problems.push("scrolls");
    if (errors.length) problems.push(`errors: ${errors[0].slice(0, 60)}`);
    await page.screenshot({ path: join(outDir, `L${lv.idx + 1}-${vw}x${vh}.png`) });
    const ok = !problems.length;
    if (!ok) failed = true;
    console.log(`${tag} ${ok ? "ok" : "FAIL"} | ${solved ? `solved ${solved[1]} ${"★".repeat(stars)}` : "unsolved"} | ${scroll ? "no-scroll" : "SCROLLS"} | errors ${errors.length}${pauseNote}` +
      (ok ? "" : ` | ${problems.join("; ")}`));
  }
  await page.close();
}
await browser.close();
server.close();
console.log(`screenshots: ${outDir}`);
process.exit(failed ? 1 : 0);
