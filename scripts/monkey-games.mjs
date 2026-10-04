#!/usr/bin/env node
// Random-input ("monkey") test for every game (Playwright + Chromium). Each
// game runs in a sandboxed iframe like the gallery's, at phone and desktop
// sizes, and gets a few seconds of seeded random taps, drags, keys and
// pause/resume messages. A game fails if it throws (its crash-report snippet
// posts arcade:error, as it would to the gallery), logs a console error,
// scrolls, or doesn't report a deliberate test error (the snippet is
// missing or broken). One line per game. Games in the Daily Challenge
// rotation also get a phone run as the daily (games/<file>?daily=<date>),
// whose results must carry that date (docs/daily.md).
//
//   node scripts/monkey-games.mjs [<id> ...] [--seconds 6] [--seed 1] [--jobs 4]
//
// Runs in CI (.github/workflows/pages.yml). To replay a failure, run the
// same id and seed; the games' own randomness still differs between runs.
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};
const SECONDS = opt("seconds", 6);
const SEED = opt("seed", 1);
const JOBS = opt("jobs", 4);
const ids = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));

const games = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8")).games
  .filter((g) => !ids.length || ids.includes(g.id));
if (ids.length && games.length !== ids.length) {
  console.error(`Unknown game id in: ${ids.join(", ")}`);
  process.exit(1);
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (_) {
    const require = createRequire(import.meta.url);
    return require(join(execSync("npm root -g").toString().trim(), "playwright"));
  }
}
const { chromium } = await loadPlaywright();

// ---------- local server: the repo, plus a harness page per game ----------

// Same sandbox as the gallery's #gameFrame; messages from the game are
// collected in window.__got.
const harness = (file, query) => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style></head>
<body><iframe id="f" sandbox="allow-scripts" allow="accelerometer; gyroscope" src="/games/${file}${query || ""}"></iframe>
<script>
window.__got = [];
const f = document.getElementById("f");
window.addEventListener("message", (e) => { if (e.source === f.contentWindow && e.data && e.data.type) window.__got.push(e.data); });
window.tell = (type) => f.contentWindow.postMessage({ type }, "*");
</script></body></html>`;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const m = url.pathname.match(/^\/__harness\/([a-z0-9-]+)$/);
  if (m) {
    const g = games.find((x) => x.id === m[1]);
    const daily = url.searchParams.get("daily");
    res.writeHead(g ? 200 : 404, { "Content-Type": "text/html" });
    res.end(g ? harness(g.file, daily ? `?daily=${daily}` : "") : "not found");
    return;
  }
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
  const file = join(root, rel);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------- the monkey ----------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "Escape", "Backspace", "Tab",
  "KeyA", "KeyD", "KeyW", "KeyS", "KeyR", "KeyZ", "KeyQ", "KeyE", "KeyF", "KeyP", "Digit1", "Digit2", "Digit3"];

const VIEWPORTS = [
  { name: "phone", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  { name: "desktop", viewport: { width: 1280, height: 800 } },
];

const DAILY_DATE = new Date().toISOString().slice(0, 10);

async function monkey(browser, game, vp, seed) {
  const problems = [];
  const ctx = await browser.newContext({ viewport: vp.viewport, hasTouch: !!vp.hasTouch, isMobile: !!vp.isMobile });
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    // A sandboxed game can't use localStorage; games already guard it, and
    // Chromium's own message about it isn't a game bug.
    if (msg.type() === "error" && !/sandboxed|localStorage|Failed to load resource/i.test(msg.text())) {
      problems.push(`console: ${msg.text().slice(0, 160)}`);
    }
  });
  page.on("pageerror", (err) => problems.push(`page: ${String(err.message).slice(0, 160)}`));
  try {
    await page.goto(`${base}/__harness/${game.id}${vp.daily ? `?daily=${DAILY_DATE}` : ""}`, { waitUntil: "load" });
    const frame = page.frames().find((f) => f.url().includes(`/games/${game.file}`));
    if (!frame) throw new Error("game frame missing");
    await frame.waitForLoadState("load");
    await page.waitForTimeout(300);

    const r = rng(seed);
    const { width: W, height: H } = vp.viewport;
    const at = () => [Math.floor(r() * W), Math.floor(r() * H)];
    const end = Date.now() + SECONDS * 1000;
    let step = 0;
    while (Date.now() < end && problems.length === 0) {
      step++;
      const p = r();
      if (p < 0.3) {
        const [x, y] = at();
        if (vp.hasTouch) await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
      } else if (p < 0.55) {
        const [x0, y0] = at();
        const [x1, y1] = at();
        await page.mouse.move(x0, y0);
        await page.mouse.down();
        await page.mouse.move(x1, y1, { steps: 4 + Math.floor(r() * 8) });
        if (r() < 0.3) await page.waitForTimeout(Math.floor(r() * 400)); // a hold
        await page.mouse.up();
      } else if (p < 0.8) {
        const key = KEYS[Math.floor(r() * KEYS.length)];
        if (r() < 0.3) {
          await page.keyboard.down(key);
          await page.waitForTimeout(Math.floor(r() * 300));
          await page.keyboard.up(key);
        } else {
          await page.keyboard.press(key);
        }
      } else if (p < 0.85) {
        await page.mouse.wheel(0, (r() - 0.5) * 400);
      } else if (p < 0.9) {
        await page.evaluate(() => window.tell("arcade:pause"));
        await page.waitForTimeout(100);
        await page.evaluate(() => window.tell("arcade:resume"));
      } else {
        await page.waitForTimeout(Math.floor(r() * 250));
      }
    }

    // Games fill their window with no scrolling (CLAUDE.md).
    const scroll = await frame.evaluate(() => {
      const d = document.scrollingElement || document.documentElement;
      return { x: d.scrollWidth - innerWidth, y: d.scrollHeight - innerHeight };
    });
    if (scroll.x > 1 || scroll.y > 1) problems.push(`scrolls (${scroll.x}px sideways, ${scroll.y}px down)`);

    const got = await page.evaluate(() => window.__got);
    for (const m of got.filter((x) => x.type === "arcade:error")) problems.push(`threw: ${m.message} (line ${m.line})`);

    // The crash reporter itself: a deliberate error must come back.
    const before = got.length;
    await frame.evaluate(() => { setTimeout(() => { throw new Error("monkey self-test"); }); });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => window.__got);
    const selfTest = after.slice(before).find((x) => x.type === "arcade:error" && /monkey self-test/.test(x.message));
    if (!selfTest) problems.push("crash-report snippet didn't report a test error");
    else if (selfTest.game !== game.id) problems.push(`crash report names game '${selfTest.game}'`);
    // That test error is expected in the console; drop it.
    for (let i = problems.length - 1; i >= 0; i--) if (/monkey self-test/.test(problems[i])) problems.splice(i, 1);

    if (vp.daily) {
      const plain = got.filter((x) => x.type === "arcade:result" && x.daily !== DAILY_DATE).length;
      if (plain) problems.push(`${plain} daily result(s) without daily: "${DAILY_DATE}"`);
      for (const f of got.filter((x) => x.type === "arcade:final")) {
        if (f.daily !== DAILY_DATE || !/^[a-z0-9]{1,16}$/.test(String(f.run || "")) || !(Number(f.score) >= 0)) problems.push(`bad arcade:final ${JSON.stringify(f).slice(0, 120)}`);
      }
    }
    const results = got.filter((x) => x.type === "arcade:result").length;
    const ach = got.filter((x) => x.type === "arcade:achievement").length;
    return { problems, info: `${step} inputs, ${results} result(s), ${ach} achievement(s)` };
  } catch (err) {
    problems.push(String(err && err.message || err).split("\n")[0]);
    return { problems, info: "" };
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch();
let failures = 0;
const DAILY_VP = { ...VIEWPORTS[0], name: "daily", daily: true };
const queue = games.flatMap((g, gi) => [...VIEWPORTS, ...(g.daily ? [DAILY_VP] : [])]
  .map((vp, vi) => ({ g, vp, seed: SEED * 1000 + gi * 10 + vi })));
async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const { problems, info } = await monkey(browser, job.g, job.vp, job.seed);
    if (problems.length) failures++;
    const line = `${problems.length ? "FAIL" : "ok  "} ${job.g.id.padEnd(20)} ${job.vp.name.padEnd(8)} seed ${job.seed}  ${problems.length ? problems.slice(0, 3).join(" | ") : info}`;
    console.log(line);
  }
}
await Promise.all(Array.from({ length: Math.max(1, JOBS) }, worker));
await browser.close();
server.close();
console.log(failures ? `\n${failures} failure(s)` : `\nOK: ${games.length} game(s) × ${VIEWPORTS.length} sizes, plus ${games.filter((g) => g.daily).length} daily run(s)`);
process.exit(failures ? 1 : 0);
