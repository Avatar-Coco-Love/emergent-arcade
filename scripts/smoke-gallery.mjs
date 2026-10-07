#!/usr/bin/env node
// Browser smoke test for the gallery and cabinet (Playwright + Chromium).
// Serves the repo on a local port (telemetry and feedback go to a fake local
// endpoint, never the real one), then at 360×740, 740×360 and 1280×800 checks
// that the gallery renders, every game opens, panels open and close, nothing
// scrolls sideways, share and download work, tap/click wording follows the
// pointer (coarse on the phone sizes, fine at 1280×800), and the console
// stays clean.
// The downloaded copy of a game is also opened from file:// and played until
// it unlocks an achievement. One line per check.
//
//   node scripts/smoke-gallery.mjs [--out <dir for screenshots>]
//
// Screenshots go to --out (default: a temp dir), never into the repo.
import http from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execSync, execFileSync } from "node:child_process";
import os from "node:os";
import { selfContainedProblems } from "./self-contained.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? args[outIdx + 1] : join(os.tmpdir(), "arcade-smoke");
mkdirSync(outDir, { recursive: true });

// Playwright may only be installed globally.
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (_) {
    const require = createRequire(import.meta.url);
    return require(join(execSync("npm root -g").toString().trim(), "playwright"));
  }
}
const { chromium } = await loadPlaywright();

const manifest = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8"));
const { WORDS } = (await import("./wording.mjs")).wording;
const Topics = (await import("./topics.mjs")).topics;
const games = manifest.games;
const { daily: Daily } = await import("./daily.mjs");
// Today's Daily Challenge, in this machine's time zone (the browser's too).
const TODAY = Daily.today();
const dailyGame = games.find((g) => g.id === Daily.pick(games, TODAY));
const rows = []; // everything the gallery sent to the (fake) endpoint

// Play counts in the leaderboards.json fixture: the first game has 18 plays
// on its 4 newest versions (older ones fold into "before counting"), the
// second a single play (shown from the first), the third none (hidden).
const PLAYS = { since: "2026-09-27", through: "2026-10-01T12:00:00Z", recent: {}, games: {
  [games[0].id]: Object.fromEntries([4, 6, 3, 5].map((n, i) => [games[0].version - 3 + i, n]).filter(([v]) => v >= 1)),
  [games[1].id]: { [games[1].version]: 1 },
} };

// Spotlight tallies (current versions): Pressure Grid held a player past 10
// minutes, Hot Iron's players lose every round, the rest have no plays.
const vOf = (id) => (games.find((g) => g.id === id) || {}).version;
const SPOTLIGHT = { through: "2026-10-01T12:00:00Z", recent: {}, games: {
  "pressure-grid": { v: vOf("pressure-grid"), sessions: 5, early: 0, rounds: 5, wins: 5, players: { a: 700, b: 100, c: 50 } },
  "hot-iron": { v: vOf("hot-iron"), sessions: 4, early: 1, rounds: 4, wins: 0, players: { a: 90, b: 60, c: 30 } },
} };

// ---------- local server ----------

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__endpoint") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { rows.push(JSON.parse(body)); } catch (_) {}
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end('{"ok":true}');
    });
    return;
  }
  // The published site builds leaderboards.json at deploy; serve a fixture.
  if (url.pathname === "/leaderboards.json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ format: "emergent-arcade-leaderboards", version: 1, updated_at: "2026-09-30T12:00:00Z", through: null,
      games: { "pressure-grid": { epoch: 2, boards: { main: [{ h: "Jade Owl", p: "x", s: 12, at: "2026-10-01", v: 8 }, { h: "Misty Wren", p: "y", s: 6, at: "2026-10-01", v: 8 }] } } },
      names: { x: { n: "Coco", r: "Jade Owl", at: "2026-10-01T00:00:00.000Z" } },
      plays: PLAYS, spotlight: SPOTLIGHT,
      daily: dailyGame ? { [TODAY]: { game: dailyGame.id, n: 2, top: [{ h: "Jade Owl", p: "x", s: 5, at: TODAY }, { h: "Misty Wren", p: "y", s: 1, at: TODAY }] } } : {} }));
    return;
  }
  const rel = normalize(decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)).replace(/^([/\\])+/, "");
  const file = join(root, rel);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  let body = readFileSync(file);
  if (rel === join("assets", "config.js")) {
    body = body.toString().replace(/feedbackEndpoint:\s*"[^"]*"/, `feedbackEndpoint: "http://127.0.0.1:${server.address().port}/__endpoint"`);
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(req.method === "HEAD" ? undefined : body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

// ---------- reporting ----------

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
}
async function check(label, fn) {
  try {
    const detail = await fn();
    report(true, label, typeof detail === "string" ? detail : "");
  } catch (err) {
    report(false, label, (String(err && err.message || "") || String(err && err.stack)).split("\n").slice(0, 2).join(" ")); 
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const browser = await chromium.launch();

const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const waitGame = (page) => page.waitForFunction(() => {
  const s = document.getElementById("loadState");
  return document.getElementById("gameFrame").getAttribute("src") && s.hidden;
}, null, { timeout: 10000 });

// Taps the middle of Pressure Grid's board until a cell erupts.
async function erupt(frameOrPage) {
  const box = await frameOrPage.locator("#board").boundingBox();
  for (let i = 0; i < 6; i++) await frameOrPage.locator("#board").click({ position: { x: box.width / 2, y: box.height / 2 } });
}

const VIEWPORTS = [
  { name: "360x740", width: 360, height: 740, mobile: true },
  { name: "740x360", width: 740, height: 360, mobile: true },
  { name: "1280x800", width: 1280, height: 800, mobile: false },
];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    acceptDownloads: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const tag = (s) => `${vp.name} ${s}`;
  const shot = (name) => page.screenshot({ path: join(outDir, `${vp.name}-${name}.png`) });
  const narrow = vp.width < 560;

  // Phone sizes emulate a touchscreen (pointer: coarse), 1280×800 a mouse.
  const coarse = vp.mobile;
  const W = (name) => (coarse ? WORDS[name][0] : WORDS[name][1]);

  await check(tag(`wording: ${coarse ? "tap" : "click"}`), async () => {
    await page.goto(base);
    await page.waitForSelector(".game-card");
    const isCoarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    assert(isCoarse === coarse, `pointer: coarse is ${isCoarse}`);
    const chips = await page.locator(".verb-chip").allTextContents();
    assert(chips.includes(W("tap")) && chips.includes(W("hold")), `chips: ${chips.join(", ")}`);
    assert(!chips.includes(coarse ? "click" : "tap"), `both wordings in chips: ${chips.join(", ")}`);
    assert((await page.locator(".game-card .chips").first().textContent()).includes(`· ${W("tap")}`), "card chip verb");
    assert((await page.locator("#arcadeInfoDialog [data-verb]").textContent()) === W("tap"), "About the arcade verb");
    // Every game's About panel: filled placeholders, translated verb tags.
    // A hold game served without its keyboard line (every hold game has
    // one by now), so the keyboard row must stay hidden.
    const g = games.find((x) => x.mechanics.some((m) => m.verb === "hold") && /\{finger\}/.test(JSON.stringify(x)));
    await page.route("**/games/games.json", async (route) => {
      const data = JSON.parse(JSON.stringify(manifest));
      delete data.games.find((x) => x.id === g.id).keyboard;
      await route.fulfill({ json: data });
    });
    await page.goto("about:blank");
    await page.goto(`${base}#/play/${g.id}`);
    await page.waitForSelector("#panel:not([hidden])");
    await page.unroute("**/games/games.json");
    const tags = await page.locator("#aboutControls .verb-tag").allTextContents();
    assert(tags.includes(W("hold")), `verb tags: ${tags.join(", ")}`);
    const about = await page.locator("#panel").textContent();
    assert(!/[{}]/.test(about), "unfilled placeholder in the About panel");
    assert(about.includes(`your ${W("finger")}`), `no "your ${W("finger")}"`);
    assert(!about.includes(`your ${coarse ? "pointer" : "finger"}`), "wrong wording in the About panel");
    assert(!(await page.locator(".verb-row.keys").count()), "keyboard row without a keyboard line");
    if (!coarse) await shot("about-click");
    await page.keyboard.press("Escape");
    // The desktop-only keyboard line (the next game adds one here).
    await page.route("**/games/games.json", async (route) => {
      const data = JSON.parse(JSON.stringify(manifest));
      data.games[0].keyboard = "← → or A / D to tilt";
      await route.fulfill({ json: data });
    });
    await page.goto("about:blank");
    await page.goto(`${base}#/play/${games[0].id}`);
    await page.waitForSelector("#panel:not([hidden])");
    const keys = await page.locator(".verb-row.keys").count();
    await page.unroute("**/games/games.json");
    assert(keys === (coarse ? 0 : 1), `${keys} keyboard rows`);
    if (!coarse) await shot("about-keys");
    // Back to a fresh browser for the checks below.
    await page.evaluate(() => localStorage.clear());
    await page.goto("about:blank");
    return `${tags.join(", ")}; keyboard line ${coarse ? "hidden" : "shown"}`;
  });

  await check(tag("gallery renders"), async () => {
    await page.goto(base);
    await page.waitForSelector(".game-card");
    const n = await page.locator("#gameList .game-card").count();
    assert(n === games.filter((g) => g.status !== "archived").length, `${n} cards`);
    const newBadges = await page.locator(".pill.new").count();
    assert(newBadges === n, `${newBadges} New badges on a fresh browser`);
    assert(await noHScroll(page), "horizontal scroll");
    await shot("gallery");
    return `${n} cards, version lines, New badges`;
  });

  for (const [i, g] of games.entries()) {
    await check(tag(`opens ${g.id}`), async () => {
      await page.locator(`#gameList .game-card[data-id="${g.id}"]`).click();
      await page.waitForSelector("#cabinet:not([hidden])");
      await waitGame(page);
      assert(await page.locator("#panel").isVisible(), "intro panel not shown on first open");
      assert((await page.locator("#cabVersion").textContent()) === `v${g.version}`, "no version in title bar");
      assert(await noHScroll(page), "horizontal scroll");
      if (i === 0) await shot("intro");
      await page.locator("#aboutPlay").click();
      assert(await page.locator("#panel").isHidden(), "Play didn't close the intro");
      if (i === 0) await shot("game");
      await page.locator("#backLink").click();
      await page.waitForSelector("#galleryView:not([hidden])");
    });
  }

  await check(tag("continue playing + no New badges"), async () => {
    const n = await page.locator("#continueList .continue-card").count();
    assert(n === 3, `${n} recent games`);
    assert((await page.locator(".pill.new").count()) === 0, "New badges remain after opening");
    assert(await noHScroll(page), "horizontal scroll");
    await shot("gallery-played");
  });

  const first = games[0];
  await page.locator(`#gameList .game-card[data-id="${first.id}"]`).click();
  await waitGame(page);

  await check(tag("panels open, Esc closes, focus returns"), async () => {
    for (const name of ["about", "achievements", "rate"]) {
      const btn = page.locator(`.toolbar [data-panel="${name}"]`);
      await btn.click();
      assert(await page.locator("#panel").isVisible(), `${name} didn't open`);
      if (name === "rate") await shot("rate");
      await page.keyboard.press("Escape");
      assert(await page.locator("#panel").isHidden(), `${name} didn't close`);
      const back = await btn.evaluate((b) => b === document.activeElement);
      assert(back, `focus didn't return to the ${name} button`);
    }
    await page.keyboard.press("?");
    assert(await page.locator("#panel").isVisible(), "? didn't open about");
    await page.locator("#panelClose").click();
    assert(await page.locator("#panel").isHidden(), "close button");
  });

  await check(tag("what's new: newest 3, then show all"), async () => {
    const n = (first.changes || []).length;
    await page.locator('.toolbar [data-panel="about"]').click();
    const items = page.locator("#aboutChangeList li");
    assert(await items.count() === Math.min(n, 3), "expected the newest 3 versions");
    const toggle = page.locator("#aboutChangesAll");
    if (n > 3) {
      await toggle.click();
      assert(await items.count() === n, "show all didn't list every version");
      await shot("about-all-versions");
      await toggle.click();
      assert(await items.count() === 3, "show fewer didn't collapse");
    } else {
      assert(await toggle.isHidden(), "toggle shown with 3 or fewer versions");
    }
    await page.keyboard.press("Escape");
  });

  await check(tag("play counts: card line + about table"), async () => {
    const expect = Object.values(PLAYS.games[first.id]).reduce((a, b) => a + b, 0);
    await page.locator('.toolbar [data-panel="about"]').click();
    await page.waitForSelector("#aboutPlays:not([hidden])");
    const rows = await page.locator("#aboutPlaysRows tr").allTextContents();
    assert(rows[0].startsWith(`v${first.version} (current)`), `first row ${rows[0]}`);
    if (first.version > 4) assert(rows.at(-1).includes("before counting"), `last row ${rows.at(-1)}`);
    const note = await page.locator("#aboutPlaysNote").textContent();
    assert(note.startsWith(`${expect} plays since`), `note ${note}`);
    await shot("about-plays");
    await page.keyboard.press("Escape");
    await page.locator("#backLink").click();
    await page.waitForSelector("#galleryView:not([hidden])");
    const line = (id) => page.locator(`#gameList .game-card[data-id="${id}"] .card-plays`);
    await page.waitForFunction((id) => document.querySelector(`.game-card[data-id="${id}"] .card-plays`).textContent, first.id);
    const text = await line(first.id).textContent();
    assert(text === `${expect} plays · ${PLAYS.games[first.id][first.version]} on v${first.version}`, `card ${text}`);
    assert((await line(games[1].id).textContent()) === "1 play", "card hides a single play");
    assert(await line(games[2].id).isHidden(), "card shows a count with no plays");
    assert(await noHScroll(page), "horizontal scroll");
    await page.locator(`#gameList .game-card[data-id="${first.id}"]`).click();
    await waitGame(page);
    return `${rows.length} rows, card "${text}"`;
  });

  await check(tag("focus trap in panel"), async () => {
    await page.locator('.toolbar [data-panel="achievements"]').click();
    for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => document.getElementById("panel").contains(document.activeElement));
    await page.keyboard.press("Escape");
    assert(inside, "focus left the panel");
  });

  await check(tag("achievement toast stacks"), async () => {
    const frame = page.frameLocator("#gameFrame");
    await erupt(frame);
    await page.waitForSelector(".toast-ach", { timeout: 5000 });
    await shot("achievement");
    const badge = await page.locator("#achBadge").textContent();
    assert(/^[1-9]\d*\//.test(badge), `badge ${badge}`);
    return `badge ${badge}`;
  });

  await check(tag("toolbar fits"), async () => {
    const over = await page.evaluate(() => {
      const bar = document.querySelector(".toolbar");
      return bar.scrollWidth > bar.clientWidth + 1;
    });
    assert(!over, "toolbar overflows");
    const small = await page.evaluate(() =>
      [...document.querySelectorAll(".toolbar .tool")].filter((b) => b.offsetParent && (b.offsetWidth < 44 || b.offsetHeight < 44)).length);
    assert(!small, `${small} toolbar targets under 44px`);
    assert(await page.locator("#moreBtn").isVisible() === narrow, "overflow menu at the wrong width");
  });

  async function action(name) {
    if (narrow) {
      await page.locator("#moreBtn").click();
      if (name === "share") await shot("menu");
      await page.locator(`#moreMenu [data-action="${name}"]`).click();
    } else {
      await page.locator(`.toolbar [data-action="${name}"]`).click();
    }
  }

  await check(tag("share copies the link"), async () => {
    await action("share");
    await page.waitForSelector(".toast:has-text('Link copied')", { timeout: 3000 });
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert(clip.endsWith(`#/play/${first.id}`), clip);
  });

  let downloaded = null;
  await check(tag("download"), async () => {
    const [dl] = await Promise.all([page.waitForEvent("download"), action("download")]);
    assert(dl.suggestedFilename() === `${first.id}-v${first.version}.html`, dl.suggestedFilename());
    downloaded = join(outDir, `${vp.name}-${dl.suggestedFilename()}`);
    await dl.saveAs(downloaded);
    const html = readFileSync(downloaded, "utf8");
    const problems = selfContainedProblems(html);
    assert(!problems.length, problems.join("; "));
    assert(html.includes(`${first.title} v${first.version}`), "no header comment");
    assert(html.includes("MIT License"), "no license notice in the header comment");
    return `${Math.round(html.length / 1024)} KB, passes the self-contained rules`;
  });

  if (!vp.mobile && downloaded) {
    await check("file:// copy plays and unlocks offline", async () => {
      const p = await context.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
      await p.goto(pathToFileURL(downloaded).href);
      await erupt(p);
      await p.waitForSelector("text=Achievement unlocked", { timeout: 5000 });
      await p.screenshot({ path: join(outDir, "file-copy.png") });
      const saved = await p.evaluate((id) => JSON.parse(localStorage.getItem(`arcade.achievements.${id}`) || "{}"), first.id);
      assert(Object.keys(saved).length, "achievement not saved");
      assert(!errs.length, errs.join(" | "));
      await p.close();
      return `saved ${Object.keys(saved).join(", ")}`;
    });
  }

  if (!vp.mobile) {
    await check("rate nudge after 3 rounds", async () => {
      const frame = page.frames().find((f) => f.url().includes(first.file));
      for (let i = 0; i < 3; i++) {
        await frame.evaluate((id) => parent.postMessage({ type: "arcade:result", game: id, outcome: "loss", time: 5 }, "*"), first.id);
      }
      await page.waitForSelector(".toast.callout:has-text('rating')", { timeout: 3000 });
      await page.locator(".toast.callout button:has-text('Rate it')").click();
      assert((await page.locator("#panelTitle").textContent()) === "Rate this game", "didn't open rating");
      await page.keyboard.press("Escape");
    });

    await check("scores: best, toasts, records panel, leaderboard", async () => {
      assert(first.id === "pressure-grid", `fixture is for pressure-grid, first is ${first.id}`);
      const frame = page.frames().find((f) => f.url().includes(first.file));
      // Pressure Grid's score is total stars, posted by the game (score.from "score").
      const post = (outcome, stars) => frame.evaluate(([id, o, s]) => parent.postMessage({ type: "arcade:result", game: id, outcome: o, time: 20, score: s }, "*"), [first.id, outcome, stars]);
      await post("win", 5);
      await page.waitForSelector(".toast:has-text('Your first best')", { timeout: 3000 });
      await post("win", 9);
      await page.waitForSelector(".toast:has-text('New best!'):has-text('was 5'):has-text('#2 on the leaderboard')", { timeout: 3000 });
      await post("win", 4);
      await page.waitForSelector(".toast:has-text('your best 9')", { timeout: 3000 });
      const scored = rows.filter((r) => r.kind === "round" && r.score != null && !r.daily);
      assert(scored.length === 3 && scored[1].score === 9 && scored[1].board === "main" && scored[1].score_epoch === 2 && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(scored[1].handle), JSON.stringify(scored[1]));
      await page.locator('.toolbar [data-panel="achievements"]').click();
      assert((await page.locator("#panelTitle").textContent()) === "Records", "panel title");
      assert((await page.locator("#bestLine").textContent()).includes("9"), "best line");
      await page.waitForSelector("#lbList li.me");
      const lb = await page.locator("#lbList li").allTextContents();
      assert(lb.length === 3 && lb[0].includes("Jade Owl") && lb[1].includes("(you)") && lb[1].startsWith("#2"), lb.join(" | "));
      await page.locator("#lbListed").uncheck();
      assert(!(await page.locator("#lbList li.me").count()), "still listed after opting out");
      await page.locator("#lbListed").check();
      // Typed name: instant checks, then saved and sent in the handle event.
      await page.locator("#lbType").click();
      const typeName = async (text) => {
        await page.locator("#lbNameInput").fill(text);
        await page.waitForFunction((t) => document.getElementById("lbNameInput").value === t && document.getElementById("lbNameMsg").textContent !== "", text);
        await page.waitForTimeout(50);
        return { msg: await page.locator("#lbNameMsg").textContent(), off: await page.locator("#lbNameSave").isDisabled() };
      };
      for (const [text, want] of [["Adm1n", "reserved"], ["Sh1t", "allowed"], ["C0co", "taken"], ["Co😀", "letters"]]) {
        const got = await typeName(text);
        assert(got.off && got.msg.includes(want), `${text}: ${got.msg}`);
      }
      await shot("records-name");
      const handleRows = () => rows.filter((r) => r.kind === "gallery" && r.action === "handle");
      const nextHandleRow = async (n) => {
        for (let i = 0; i < 60 && handleRows().length <= n; i++) await page.waitForTimeout(50);
        return handleRows()[n];
      };
      const good = await typeName("Kiko");
      assert(!good.off && /Shows as Kiko ·[0-9A-F]{4}/.test(good.msg), good.msg);
      let n = handleRows().length;
      await page.locator("#lbNameSave").click();
      const sent = await nextHandleRow(n);
      assert(sent && sent.name === "Kiko" && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(sent.handle) && sent.lb === 1, JSON.stringify(sent));
      await page.waitForSelector("#lbList li.me:has-text('Kiko ·')");
      assert((await page.locator("#lbHandle").textContent()).startsWith("Kiko ·"), "handle line");
      n = handleRows().length;
      await page.locator("#lbRename").click();
      const back = await nextHandleRow(n);
      assert(back && !back.name && !(await page.locator("#lbHandle").textContent()).includes("·"), "random name didn't clear the typed one");
      await page.keyboard.press("Escape");
      return lb.join(" | ");
    });

    await check("comment-only feedback", async () => {
      await page.locator('.toolbar [data-panel="rate"]').click();
      assert(await page.locator("#submitBtn").isDisabled(), "enabled with nothing entered");
      await page.locator("#tags .tag", { hasText: "fun" }).click();
      await page.locator("#comment").fill("smoke test");
      assert(await page.locator("#submitBtn").isEnabled(), "comment alone doesn't enable submit");
      await page.locator("#submitBtn").click();
      await page.waitForSelector("#feedbackStatus.ok");
      const row = rows.find((r) => r.comment === "smoke test");
      assert(row && row.rating === "" && row.tags && row.tags[0] === "fun", JSON.stringify(row));
      await page.keyboard.press("Escape");
    });
  }

  await page.locator("#backLink").click();
  await page.waitForSelector("#galleryView:not([hidden])");

  await check(tag("daily challenge: banner, run, result card, board"), async () => {
    assert(dailyGame, "no game in the daily rotation");
    await page.goto(`${base}#/`);
    await page.waitForSelector("#dailyBanner:not([hidden])");
    const kicker = await page.locator("#dailyBanner .daily-kicker").textContent();
    assert(kicker.includes(`Daily #${Daily.number(TODAY)} ·`), kicker);
    assert((await page.locator("#dailyTitle").textContent()) === dailyGame.title, "banner title");
    await page.waitForSelector("#dailyBanner .daily-leader:has-text('Jade Owl')");
    assert(await noHScroll(page), "horizontal scroll");
    await shot("daily-banner");
    await page.locator("#dailyBanner a.primary").click();
    await page.waitForSelector("#cabinet:not([hidden])");
    await waitGame(page);
    assert((await page.evaluate(() => location.hash)) === "#/daily", "hash");
    assert((await page.locator("#gameFrame").getAttribute("src")).includes(`daily=${TODAY}`), "frame src has no daily date");
    assert((await page.locator("#cabVersion").textContent()) === `Daily #${Daily.number(TODAY)}`, "title bar tag");
    assert(await page.locator("#dailyBtn").isVisible(), "no daily button");
    assert(!(await page.evaluate(() => { const b = document.querySelector(".toolbar"); return b.scrollWidth > b.clientWidth + 1; })), "toolbar overflows");
    if (await page.locator("#panel").isVisible()) {
      assert(await page.locator("#aboutDaily").isVisible(), "intro has no daily note");
      await page.locator("#aboutPlay").click();
    }
    const frame = page.frames().find((f) => f.url().includes(`daily=${TODAY}`));
    const post = (msg) => frame.evaluate(([id, m]) => parent.postMessage(Object.assign({ game: id }, m), "*"), [dailyGame.id, msg]);
    const n0 = rows.length;
    const r = (outcome, score, run) => post({ type: "arcade:result", outcome, time: 9, score, run, daily: TODAY, level: 13 });
    await r("win", 1, "smoke1");
    await r("win", 2, "smoke1");
    await r("loss", 2, "smoke1");
    await post({ type: "arcade:final", run: "smoke1", score: 2, daily: TODAY });
    await page.waitForSelector('#panel:not([hidden]) [data-body="daily"]:not([hidden])', { timeout: 5000 });
    await page.waitForFunction(() => document.getElementById("dailyCard").src.startsWith("blob:"), null, { timeout: 5000 });
    await page.waitForSelector("#dailyLb li.me");
    const lb = await page.locator("#dailyLb li").allTextContents();
    assert(lb.length === 3 && lb[0].includes("Jade Owl") && lb[1].includes("(you)") && lb[1].startsWith("#2"), lb.join(" | "));
    await shot("daily-result");
    for (let i = 0; i < 40 && rows.slice(n0).filter((x) => x.kind === "round").length < 3; i++) await page.waitForTimeout(50);
    const rounds = rows.slice(n0).filter((x) => x.kind === "round");
    assert(rounds.length === 3 && rounds.every((x) => x.daily === TODAY && x.daily_first === 1 && x.board === undefined && x.score_epoch >= 1), JSON.stringify(rounds[0]));
    // A practice run: sent, but not as a first run.
    await page.keyboard.press("Escape");
    await r("win", 1, "smoke2");
    for (let i = 0; i < 40 && rows.slice(n0).filter((x) => x.kind === "round").length < 4; i++) await page.waitForTimeout(50);
    const practice = rows.slice(n0).filter((x) => x.kind === "round")[3];
    assert(practice && practice.daily_first === 0, `practice row ${JSON.stringify(practice)}`);
    await page.locator("#backLink").click();
    await page.waitForSelector("#galleryView:not([hidden])");
    const sub = await page.locator("#dailyBanner .daily-sub").first().textContent();
    assert(sub.includes("Your run: 2") && sub.includes("🟩🟩🟥"), sub);
    if (!coarse) {
      await page.locator("#dailyBanner button:has-text('Share result')").click();
      await page.waitForSelector(".toast:has-text('Result copied')", { timeout: 3000 });
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      assert(clip.includes(`Daily #${Daily.number(TODAY)} · ${dailyGame.title}`) && clip.includes("🟩🟩🟥") && clip.includes("#/daily"), clip);
    }
    return `${dailyGame.id}: ${lb.join(" | ")}`;
  });

  await check(tag("class challenge: teacher link, seeded run, card with the code"), async () => {
    const chGame = games.filter((g) => g.daily && g.status !== "archived").sort((x, y) => x.id.localeCompare(y.id)).find((g) => g.id !== (dailyGame && dailyGame.id)) || dailyGame;
    assert(chGame, "no game with daily");
    await page.goto(`${base}#/teachers`);
    await page.waitForSelector("#teachersView:not([hidden])");
    const options = await page.locator("#challengeGame option").evaluateAll((os) => os.map((o) => o.value));
    assert(options.length === games.filter((g) => g.daily && g.status !== "archived").length, `options ${options}`);
    await page.selectOption("#challengeGame", chGame.id);
    await page.locator("#challengeMake").click();
    await page.waitForSelector("#challengeOut:not([hidden])");
    const withClass = await page.locator("#challengeLink").inputValue();
    const m = withClass.match(/\?class=1#\/challenge\/([a-z0-9-]+)\/([a-z2-9]{5})$/);
    assert(m && m[1] === chGame.id, withClass);
    const code = m[2];
    assert((await page.locator("#challengeCode").textContent()) === code.toUpperCase(), "code shown");
    assert((await page.locator("#challengeStatus").textContent()).includes(coarse ? "Tap Copy" : "Click Copy"), "tap/click wording");
    await page.locator("#challengeClass").uncheck(); // keep stats on for the rows below
    const link = await page.locator("#challengeLink").inputValue();
    assert(link === `${base}#/challenge/${chGame.id}/${code}`, link);
    assert(await noHScroll(page), "horizontal scroll");
    await shot("challenge-teacher");

    await page.goto(link);
    await page.waitForSelector("#cabinet:not([hidden])");
    await waitGame(page);
    const tagDate = Daily.challengeDate(code);
    const frame = page.frames().find((f) => f.url().includes(`daily=${tagDate}`));
    assert(frame, `frame src ${await page.locator("#gameFrame").getAttribute("src")}`);
    assert((await frame.evaluate(() => location.search)).includes(`daily=${tagDate}`), "the game didn't get the challenge seed");
    assert((await page.locator("#cabVersion").textContent()) === `Challenge ${code.toUpperCase()}`, "title bar tag");
    assert(await page.locator("#dailyBtn").isVisible(), "no result button");
    if (await page.locator("#panel").isVisible()) {
      assert((await page.locator("#aboutDaily").textContent()).includes(`Class challenge ${code.toUpperCase()}`), "intro note");
      await page.locator("#aboutPlay").click();
    }
    const post = (msg) => frame.evaluate(([id, m2]) => parent.postMessage(Object.assign({ game: id }, m2), "*"), [chGame.id, msg]);
    const n0 = rows.length;
    await post({ type: "arcade:result", outcome: "win", time: 9, score: 1, run: "chal1", daily: tagDate, level: 3 });
    await post({ type: "arcade:result", outcome: "loss", time: 9, score: 1, run: "chal1", daily: tagDate, level: 4 });
    await post({ type: "arcade:final", run: "chal1", score: 1, daily: tagDate });
    await page.waitForSelector('#panel:not([hidden]) [data-body="daily"]:not([hidden])', { timeout: 5000 });
    await page.waitForFunction(() => document.getElementById("dailyCard").src.startsWith("blob:"), null, { timeout: 5000 });
    assert((await page.locator("#panelTitle").textContent()) === `Challenge ${code.toUpperCase()}`, "panel title");
    const alt = await page.locator("#dailyCard").getAttribute("alt");
    assert(alt.includes(`class challenge ${code.toUpperCase()} · ${chGame.title}`) && alt.includes("🟩🟥"), alt);
    assert(await page.locator("#challengeNote").isVisible() && !(await page.locator("#dailyBoard").isVisible()), "board shown for a challenge");
    await shot("challenge-result");
    for (let i = 0; i < 40 && rows.slice(n0).filter((x) => x.kind === "round").length < 2; i++) await page.waitForTimeout(50);
    const rounds = rows.slice(n0).filter((x) => x.kind === "round");
    assert(rounds.length === 2 && rounds.every((x) => x.challenge === code && x.challenge_first === 1 && x.daily === undefined && x.score === undefined && x.board === undefined), JSON.stringify(rounds[0]));
    assert(rows.slice(n0).some((x) => x.action === "challenge" && x.challenge === code), "no challenge event");
    if (!coarse) {
      await page.locator("#dailyShare").click();
      await page.waitForSelector(".toast:has-text('Result copied')", { timeout: 3000 });
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      assert(clip.includes(`class challenge ${code.toUpperCase()}`) && clip.includes(`#/challenge/${chGame.id}/${code}`), clip);
    }
    // A second run is practice; the Daily's own entry is untouched.
    await page.keyboard.press("Escape");
    await post({ type: "arcade:result", outcome: "win", time: 9, score: 1, run: "chal2", daily: tagDate, level: 3 });
    for (let i = 0; i < 40 && rows.slice(n0).filter((x) => x.kind === "round").length < 3; i++) await page.waitForTimeout(50);
    const practice = rows.slice(n0).filter((x) => x.kind === "round")[2];
    assert(practice && practice.challenge_first === 0, `practice ${JSON.stringify(practice)}`);
    const stored = await page.evaluate(() => [localStorage.getItem("arcade.challenge"), localStorage.getItem("arcade.daily")]);
    assert(stored[0].includes(`${chGame.id}/${code}`) && !(stored[1] || "").includes(tagDate), "stored in the wrong place");
    await page.goto(`${base}#/challenge/${chGame.id}/abc`);
    await page.waitForSelector("#galleryView:not([hidden])");
    assert((await page.locator("#galleryStatus").textContent()).includes("class challenge link doesn't work"), "bad link notice");
    return `${chGame.id} ${code.toUpperCase()} → ${tagDate}`;
  });

  await check(tag("sort, verb filter, search in the hash"), async () => {
    await page.selectOption("#sort", "title");
    const titles = await page.locator("#gameList h3 > span:first-child").allTextContents();
    assert(titles.join() === [...titles].sort((a, b) => a.localeCompare(b)).join(), "not sorted by title");
    await page.locator(".verb-chip", { hasText: new RegExp(`^${W("hold")}$`) }).click();
    const hash = await page.evaluate(() => location.hash);
    assert(hash.includes("sort=title") && hash.includes("verb=hold"), hash);
    await page.reload();
    await page.waitForSelector(".game-card");
    const pressed = await page.locator('.verb-chip[aria-pressed="true"]').textContent();
    assert(pressed === W("hold"), "state lost on reload");
    const n = await page.locator("#gameList .game-card").count();
    await page.fill("#search", "zzzz");
    assert((await page.locator("#gameList .game-card").count()) === 0, "search didn't filter");
    await page.locator("#galleryStatus button").click();
    assert(await noHScroll(page), "horizontal scroll");
    return `${n} hold games`;
  });

  // Topic tags (assets/topics.js): ?topic= in the hash, chips, search, the
  // ⓘ panel's links back to the filtered gallery. Phones scroll the chip row
  // sideways, so the page itself never does.
  await check(tag("topic filter, search and ⓘ links"), async () => {
    const tagged = (id) => games.filter((g) => (g.topics || []).includes(id) && g.status !== "archived").length;
    const used = [...new Set(games.flatMap((g) => g.topics || []))];
    assert(used.length, "no game has topics");
    const first = used[0];
    await page.goto(`${base}#/?topic=${first}`);
    await page.waitForSelector(".game-card");
    assert((await page.locator("#gameList .game-card").count()) === tagged(first), `?topic=${first} shows the wrong games`);
    assert((await page.locator(".topic-chip[aria-pressed=\"true\"]").getAttribute("data-topic")) === first, "chip not pressed from the hash");
    const chips = await page.locator(".topic-chip[data-topic]").evaluateAll((bs) => bs.map((b) => [b.dataset.topic, b.offsetHeight]));
    assert(chips.length === used.length, `${chips.length} chips for ${used.length} used topics`);
    assert(chips.every(([, h]) => h >= (coarse ? 44 : 34)), "topic chip too small");
    // Press another (scrolled into view on phones), then clear it.
    const other = used.find((t) => t !== first);
    await page.locator(`.topic-chip[data-topic="${other}"]`).click();
    let hash = await page.evaluate(() => location.hash);
    assert(hash.includes(`topic=${other}`) && !hash.includes(`topic=${first}`), hash);
    assert((await page.locator("#gameList .game-card").count()) === tagged(other), "chip didn't filter");
    assert(await noHScroll(page), "horizontal scroll");
    await shot("topics");
    await page.locator(".topic-chip:not([data-topic])").click();
    hash = await page.evaluate(() => location.hash);
    assert(!hash.includes("topic="), `not cleared: ${hash}`);
    // Search finds a game by its topic label; an unknown topic is ignored.
    const g = games.find((x) => (x.topics || []).length && x.status !== "archived");
    const label = Topics.get(g.topics[0]).label;
    await page.fill("#search", label);
    const found = await page.locator("#gameList h3 > span:first-child").allTextContents();
    assert(found.includes(g.title), `search "${label}" missed ${g.title}`);
    await page.goto(`${base}#/?topic=no-such-topic`);
    await page.waitForSelector(".game-card");
    assert((await page.locator("#gameList .game-card").count()) === games.filter((x) => x.status !== "archived").length, "unknown topic filtered");
    // The ⓘ panel lists the game's topics; each links to the filtered gallery.
    await page.goto(`${base}#/play/${g.id}`);
    await waitGame(page);
    if (!(await page.locator("#aboutTopics").isVisible())) await page.locator('[data-panel="about"]').first().click();
    const links = await page.locator("#aboutTopics .topic-link").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert(links.join() === g.topics.map((t) => `#/?topic=${t}`).join(), `ⓘ topics: ${links.join(", ")}`);
    await page.locator("#aboutTopics .topic-link").first().click();
    await page.waitForSelector("#galleryView:not([hidden])");
    assert((await page.locator("#gameList .game-card").count()) === tagged(g.topics[0]), "ⓘ link didn't filter");
    assert(await noHScroll(page), "horizontal scroll after the ⓘ link");
    return `${used.length} topics, ${tagged(first)} ${first}`;
  });

  await check(tag("header share copies the arcade link"), async () => {
    await page.goto(base);
    await page.waitForSelector(".game-card");
    const n = rows.length;
    await page.locator("#shareArcadeBtn").click();
    await page.waitForSelector("#galleryToasts .toast:has-text('Link copied')", { timeout: 3000 });
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    const site = readFileSync(join(root, "assets/config.js"), "utf8").match(/siteUrl:\s*"([^"]+)"/)[1];
    assert(clip === site, clip);
    const header = await page.evaluate(() => {
      const row = document.querySelector(".header-row");
      const brand = row.querySelector(".brand");
      return {
        over: row.scrollWidth > row.clientWidth + 1,
        cut: brand.scrollWidth > brand.clientWidth + 1,
        small: [...row.querySelectorAll(".tool")].filter((b) => b.offsetWidth < 44 || b.offsetHeight < 44).length,
      };
    });
    assert(!header.over && !header.cut && !header.small, `header overflows, cuts the name or has small targets: ${JSON.stringify(header)}`);
    await shot("header-share");
    await page.waitForTimeout(300);
    const row = rows.slice(n).find((r) => r.kind === "gallery" && r.action === "share");
    const extra = row && (row.extra || row);
    assert(extra && extra.from === "gallery" && extra.method === "copy", `telemetry row ${JSON.stringify(row)}`);
  });

  await check(tag("records view: every leaderboard, my bests, play and back"), async () => {
    // A best of 9 in Pressure Grid (the fixture's board: Jade Owl 12, Misty Wren 6).
    const pg = games.find((g) => g.id === "pressure-grid");
    const saved = await page.evaluate(([epoch, v]) => {
      const old = localStorage.getItem("arcade.best.pressure-grid");
      localStorage.setItem("arcade.best.pressure-grid", JSON.stringify({ [`e${epoch}:main`]: { score: 9, at: "2026-10-01T00:00:00Z", version: v } }));
      return old;
    }, [pg.score.epoch || 1, pg.version]);
    await page.goto(base);
    await page.waitForSelector(".game-card");
    const n = rows.length;
    await page.locator("#recordsLink").click();
    await page.waitForSelector("#recordsView:not([hidden]) .rec-row");
    assert(await page.locator("#galleryView").isHidden(), "gallery still shown");
    const scored = games.filter((g) => g.score && g.status !== "archived").length;
    assert((await page.locator(".rec-row").count()) === scored, `${await page.locator(".rec-row").count()} rows for ${scored} games`);
    const row = page.locator('.rec-row[data-id="pressure-grid"]');
    await page.waitForFunction(() => document.querySelector('.rec-row[data-id="pressure-grid"] .rec-lead').textContent.includes("Jade Owl"));
    const line = await row.locator(".rec-line").textContent();
    assert(line.includes("Jade Owl") && line.includes("12") && line.includes("You #2") && line.includes("9"), `row: ${line}`);
    const sum = await page.locator("#recordsSummary").textContent();
    assert(sum.includes("1 board in 1 game"), `summary: ${sum}`);
    await row.locator("summary").click();
    await row.locator(".lb-list li").first().waitFor();
    const lb = await row.locator(".lb-list li").allTextContents();
    assert(lb.length === 3 && lb[1].includes("(you)"), `top 10: ${lb.join(" | ")}`);
    assert(await noHScroll(page), "horizontal scroll");
    // The name controls work here too, and the open row follows the new name.
    await page.locator("#recType").click();
    await page.locator("#recNameInput").fill("Pip");
    await page.waitForFunction(() => !document.getElementById("recNameSave").disabled);
    await page.locator("#recNameSave").click();
    await page.waitForSelector('.rec-row[data-id="pressure-grid"] .lb-list li.me:has-text("Pip ·")');
    assert((await page.locator("#recHandle").textContent()).startsWith("Pip ·"), "records handle line");
    assert(await page.locator("#recNameForm").isHidden(), "name form still open");
    await page.locator("#recRename").click();
    assert(!(await page.locator("#recHandle").textContent()).includes("·"), "random name didn't clear the typed one");
    await shot("records");
    await page.locator('#recordsFilter [data-mine="1"]').click();
    assert(page.url().endsWith("#/records?mine=1"), page.url());
    assert((await page.locator(".rec-row").count()) === 1, "My bests shows other games");
    await page.locator('.rec-row[data-id="pressure-grid"] .rec-play').click();
    await page.waitForSelector("#cabinet:not([hidden])");
    assert((await page.locator("#backLink").getAttribute("href")) === "#/records?mine=1", "back link");
    await page.locator("#backLink").click();
    await page.waitForSelector("#recordsView:not([hidden]) .rec-row");
    assert(await page.evaluate(() => document.activeElement.classList.contains("rec-play")), "focus not back on the row");
    await page.locator("#recordsBack").click();
    await page.waitForSelector("#galleryView:not([hidden])");
    assert(await page.locator("#recordsView").isHidden(), "records still shown");
    await page.evaluate((old) => (old == null ? localStorage.removeItem("arcade.best.pressure-grid") : localStorage.setItem("arcade.best.pressure-grid", old)), saved);
    await page.waitForTimeout(300);
    const gal = rows.slice(n).filter((r) => r.kind === "gallery").map((r) => Object.assign({}, r, r.extra || {}));
    assert(gal.some((r) => r.action === "records") && gal.some((r) => r.action === "open" && r.from === "records") && gal.some((r) => r.action === "handle" && r.name === "Pip"), `telemetry ${JSON.stringify(gal.map((r) => r.action))}`);
    return `${scored} rows; ${line}`;
  });

  await check(tag("spotlight view: groups from the tallies, play and back"), async () => {
    await page.goto(base);
    await page.waitForSelector(".game-card");
    const n = rows.length;
    await page.locator("#spotlightLink").click();
    await page.waitForSelector("#spotlightGroups:not([hidden]) .spot-card");
    assert(await page.locator("#galleryView").isHidden(), "gallery still shown");
    const groups = await page.$$eval(".spot-group", (gs) => Object.fromEntries(gs.map((g) => [g.getAttribute("aria-label"), [...g.querySelectorAll(".spot-card")].map((c) => c.dataset.id)])));
    const active = games.filter((g) => g.status !== "archived").length;
    assert(Object.values(groups).flat().length === active, `${Object.values(groups).flat().length} cards for ${active} games`);
    assert(groups["Past 10 minutes"] && groups["Past 10 minutes"].join() === "pressure-grid", `done: ${JSON.stringify(groups)}`);
    assert(groups["Players get stuck"] && groups["Players get stuck"].join() === "hot-iron", `stuck: ${JSON.stringify(groups)}`);
    assert(groups["Needs first players"].length === active - 2, "fresh group");
    const picks = await page.locator("#spotlightPicks .spot-card").count();
    assert(picks === 3, `${picks} picks`);
    const stat = await page.locator("#spotlightStats").textContent();
    assert(stat.includes(`1 of ${active}`) && stat.includes("11:40"), `stats: ${stat}`);
    assert(await noHScroll(page), "horizontal scroll");
    await shot("spotlight");
    await page.locator('#spotlightGroups .spot-card[data-id="hot-iron"] .spot-play').click();
    await page.waitForSelector("#cabinet:not([hidden])");
    assert((await page.locator("#backLink").getAttribute("href")) === "#/spotlight", "back link");
    await page.locator("#backLink").click();
    await page.waitForSelector("#spotlightView:not([hidden]) .spot-card");
    assert(await page.evaluate(() => document.activeElement.classList.contains("spot-play")), "focus not back on the card");
    await page.locator("#spotlightBack").click();
    await page.waitForSelector("#galleryView:not([hidden])");
    assert(await page.locator("#spotlightView").isHidden(), "spotlight still shown");
    await page.waitForTimeout(300);
    const gal = rows.slice(n).filter((r) => r.kind === "gallery").map((r) => Object.assign({}, r, r.extra || {}));
    assert(gal.some((r) => r.action === "spotlight") && gal.some((r) => r.action === "open" && r.from === "spotlight"), `telemetry ${JSON.stringify(gal.map((r) => r.action))}`);
    return `${Object.entries(groups).map(([k, v]) => `${k} ${v.length}`).join(", ")}`;
  });

  await check(tag("teacher page: subject table, links, play and back"), async () => {
    await page.goto(base);
    await page.waitForSelector(".game-card");
    assert(await page.locator("#classroomNote").isHidden(), "classroom note shown without the link");
    const n = rows.length;
    await page.locator("#teachersLink").click();
    await page.waitForSelector("#teachersView:not([hidden]) #teachTopicRows tr");
    assert(await page.locator("#galleryView").isHidden(), "gallery still shown");
    // The table: every topic a playable game uses, subjects then skills, its
    // games by title, straight from games.json.
    const live = games.filter((g) => g.status !== "archived");
    const want = Topics.KINDS.flatMap((k) => Topics.LIST.filter((t) => t.kind === k))
      .map((t) => [t.id, live.filter((g) => (g.topics || []).includes(t.id)).sort((a, b) => a.title.localeCompare(b.title)).map((g) => g.id)])
      .filter(([, ids]) => ids.length);
    const got = await page.$$eval("#teachTopicRows tr[data-topic]", (trs) => trs.map((tr) => [tr.dataset.topic, tr.querySelector("th a").getAttribute("href"), [...tr.querySelectorAll("td a")].map((a) => a.getAttribute("href").replace("#/play/", ""))]));
    assert(JSON.stringify(got.map(([id, , ids]) => [id, ids])) === JSON.stringify(want), `table ${JSON.stringify(got.map((r) => r[0]))} vs ${JSON.stringify(want.map((r) => r[0]))}`);
    assert(got.every(([id, href]) => href === `#/?topic=${id}`), "topic links");
    assert(await page.locator("#classForm").isVisible(), "feedback form hidden");
    assert((await page.locator("#classLinkText").inputValue()) === `${base}?class=1`, "classroom link");
    assert(await noHScroll(page), "horizontal scroll");
    await page.screenshot({ path: join(outDir, `${vp.name}-teachers.png`), fullPage: true });
    // A game from the table, and back to the same link.
    const first = want[0];
    const link = page.locator(`#teachTopicRows tr[data-topic="${first[0]}"] a[href="#/play/${first[1][0]}"]`);
    await link.click();
    await page.waitForSelector("#cabinet:not([hidden])");
    assert((await page.locator("#backLink").getAttribute("href")) === "#/teachers", "back link");
    await page.locator("#backLink").click();
    await page.waitForSelector("#teachersView:not([hidden])");
    assert(await page.evaluate((id) => document.activeElement.getAttribute("href") === `#/play/${id}` && !!document.activeElement.closest("#teachTopicRows"), first[1][0]), "focus not back on the link");
    // A subject link filters the gallery.
    await page.locator(`#teachTopicRows tr[data-topic="${first[0]}"] th a`).click();
    await page.waitForSelector("#galleryView:not([hidden])");
    assert(await page.locator(`.topic-chip[aria-pressed="true"]`).count() === 1, "topic filter not applied");
    // The About box links here too.
    await page.locator("#arcadeInfoBtn").click();
    await page.locator('#arcadeInfoDialog a[href="#/teachers"]').click();
    await page.waitForSelector("#teachersView:not([hidden])");
    assert(await page.locator("#arcadeInfoDialog").isHidden(), "About box still open");
    await page.waitForTimeout(300);
    const gal = rows.slice(n).filter((r) => r.kind === "gallery");
    assert(gal.some((r) => r.action === "teachers") && gal.some((r) => r.action === "open" && r.from === "teachers"), `telemetry ${JSON.stringify(gal.map((r) => r.action))}`);
    return `${got.length} topics, ${new Set(got.flatMap((r) => r[2])).size} games`;
  });

  // "Download all <topic> games" (assets/bundle.js): the gallery's button
  // for a topic with games, a zip that holds exactly that topic's games plus
  // index.html (read by Python's zipfile), and one button per teacher row.
  await check(tag("topic download: button, zip lists the topic's games"), async () => {
    const live = games.filter((g) => g.status !== "archived");
    const used = Topics.LIST.filter((t) => live.some((g) => (g.topics || []).includes(t.id)));
    const t = used[0];
    const want = live.filter((g) => (g.topics || []).includes(t.id)).sort((a, b) => a.title.localeCompare(b.title));
    await page.goto(`${base}#/`);
    await page.waitForSelector(".game-card");
    assert(await page.locator("#topicBundle").isHidden(), "button shown with no topic");
    await page.goto(`${base}#/?topic=${t.id}`);
    await page.waitForSelector("#topicBundle:not([hidden])");
    assert((await page.locator("#topicBundleBtn").textContent()) === `Download all ${t.label} games (${want.length})`, "button label");
    const n = rows.length;
    const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#topicBundleBtn").click()]);
    const zipPath = join(outDir, `${vp.name}-${dl.suggestedFilename()}`);
    await dl.saveAs(zipPath);
    const names = execFileSync("python3", ["-I", "-c", "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(chr(10).join(z.namelist()))", zipPath]).toString().trim().split("\n");
    const dir = `emergent-arcade-${t.id}/`;
    const expect = [dir, `${dir}index.html`, ...want.map((g) => `${dir}${g.id}-v${g.version}.html`)];
    assert(JSON.stringify(names) === JSON.stringify(expect), `zip lists ${names.join(", ")}`);
    await page.waitForSelector("#topicBundleStatus.ok");
    assert(await noHScroll(page), "horizontal scroll");
    await page.waitForTimeout(300);
    assert(rows.slice(n).some((r) => r.action === "download_topic" && r.topic === t.id && r.from === "gallery"), "no download_topic row");
    // The teacher page: one button per subject row, named after it.
    await page.goto(`${base}#/teachers`);
    await page.waitForSelector("#teachTopicRows tr[data-topic]");
    const btns = await page.$$eval("#teachTopicRows tr[data-topic]", (trs) => trs.map((tr) => (tr.querySelector(".teach-zip") || {}).ariaLabel || ""));
    assert(btns.length === used.length && btns.every((b) => b.startsWith("Download all as zip: ")), `teacher buttons ${btns.length}`);
    return `${t.id}: ${want.length} games, ${Math.round(statSync(zipPath).size / 1024)} KB`;
  });

  if (!vp.mobile) {
    await check("classroom mode: link, stats off, names and rating hidden, turn off", async () => {
      await page.goto("about:blank");
      await page.goto(`${base}?class=1`);
      await page.waitForSelector(".game-card");
      const n = rows.length;
      assert(!(await page.evaluate(() => location.search)), "?class=1 left in the address bar");
      assert(await page.locator("#classroomNote").isVisible(), "no classroom note");
      assert(await page.locator("#telemetryNote").isHidden(), "play stats note shown");
      await page.locator("#settingsBtn").click();
      assert(await page.locator("#statsToggle").isDisabled() && !(await page.locator("#statsToggle").isChecked()), "stats toggle");
      await page.keyboard.press("Escape");
      await page.selectOption("#sort", "title");
      // Persists in this browser, and carries into a game.
      await page.goto("about:blank");
      await page.goto(`${base}#/play/pressure-grid`);
      await waitGame(page);
      assert(await page.locator("#classroomNote").count() === 1 && await page.evaluate(() => document.documentElement.classList.contains("classroom")), "not kept after reload");
      assert(await page.locator('.toolbar [data-panel="rate"]').isHidden(), "rate button shown");
      if (await page.locator("#panel").isVisible()) await page.keyboard.press("Escape");
      await page.locator('.toolbar [data-panel="achievements"]').click();
      await page.waitForSelector("#panel:not([hidden])");
      assert(await page.locator("#panel .lb-name-ctl").isHidden(), "name controls shown in the 🏆 panel");
      const frame = page.frames().find((f) => f.url().includes("pressure-grid"));
      await page.keyboard.press("Escape");
      for (let i = 0; i < 3; i++) await frame.evaluate(() => parent.postMessage({ type: "arcade:result", game: "pressure-grid", outcome: "win", time: 30, score: 3 }, "*"));
      await page.waitForTimeout(400);
      assert(!(await page.locator(".toast.callout:has-text('rating')").count()), "rate nudge shown");
      await page.goto(`${base}#/records`);
      await page.waitForSelector("#recordsView:not([hidden]) .rec-row");
      assert(await page.locator("#recordsName .lb-name-ctl").isHidden(), "name controls shown in Records");
      await page.goto(`${base}#/teachers`);
      await page.waitForSelector("#teachersView:not([hidden])");
      assert(await page.locator("#classForm").isHidden() && await page.locator("#classFormOff").isVisible(), "feedback form shown");
      await page.locator("#classLinkBtn").click();
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      assert(clip === `${base}?class=1`, `copied ${clip}`);
      await page.waitForTimeout(300);
      assert(rows.length === n, `${rows.length - n} row(s) sent in classroom mode: ${rows.slice(n).map((r) => r.kind + "/" + (r.action || "")).join(" ")}`);
      await page.locator("#classroomOff").click();
      assert(await page.locator("#classroomNote").isHidden() && await page.locator("#classForm").isVisible(), "turn off");
      await page.goto(`${base}#/`);
      await page.waitForSelector(".game-card");
      await page.selectOption("#sort", "updated");
      await page.waitForTimeout(300);
      assert(rows.length > n, "stats still off after turning classroom mode off");
      await page.selectOption("#sort", "");
      return `nothing sent; copied ${clip.replace(base, "")}`;
    });

    await check("classroom feedback form posts kind classroom", async () => {
      await page.goto(`${base}#/teachers`);
      await page.waitForSelector("#teachersView:not([hidden]) #classGames input");
      assert(await page.locator("#classSend").isDisabled(), "send enabled with no text");
      await page.fill("#classGrade", "Year 9");
      await page.fill("#classSubject", "Physics");
      await page.locator('#classGames input[value="hot-iron"]').check();
      await page.locator('#classGames input[value="tidewright"]').check();
      await page.fill("#classWorked", "They argued about heat for twenty minutes.");
      await page.fill("#classContact", "teacher@example.org");
      const n = rows.length;
      await page.locator("#classSend").click();
      await page.waitForSelector("#classStatus.ok");
      const row = rows.slice(n).find((r) => r.kind === "classroom");
      assert(row && row.grade === "Year 9" && row.subject === "Physics" && row.games.join() === "hot-iron,tidewright" && row.worked.startsWith("They argued") && row.didnt === "" && row.contact === "teacher@example.org" && row.client_id, JSON.stringify(row));
      assert((await page.locator("#classWorked").inputValue()) === "" && await page.locator("#classSend").isDisabled(), "form not cleared");
      await page.locator("#classForm").screenshot({ path: join(outDir, "1280x800-class-form.png") });
      return `${Object.keys(row).length} fields`;
    });
  }

  await check(tag("arcade play total from 250 plays"), async () => {
    // The fixture's 19 plays stay hidden; 249 too, 250 shows (summed over games).
    const total = async (n) => {
      if (n !== null) {
        await page.route("**/leaderboards.json", (route) => route.fulfill({ json: { format: "emergent-arcade-leaderboards", version: 1, games: {},
          plays: { since: "2026-09-27", recent: {}, games: { [games[0].id]: { [games[0].version]: n - 10 }, [games.at(-1).id]: { 1: 10 } } } } }));
      }
      await page.goto("about:blank");
      await page.goto(base);
      await page.waitForFunction(() => document.querySelector(".game-card .card-plays:not([hidden])"));
      const line = page.locator("#playTotal");
      const text = (await line.isHidden()) ? null : await line.textContent();
      await page.unroute("**/leaderboards.json");
      return text;
    };
    const fixture = await total(null);
    assert(fixture === null, `shown at 19 plays: ${fixture}`);
    const below = await total(249);
    assert(below === null, `shown at 249 plays: ${below}`);
    const at = await total(250);
    assert(at === "250 games played", `at 250: ${at}`);
    assert(await noHScroll(page), "horizontal scroll");
    await shot("play-total");
    return `"${at}"`;
  });

  await check(tag("settings: export, reset, import"), async () => {
    await page.goto(base);
    await page.waitForSelector(".game-card");
    await page.locator("#settingsBtn").click();
    assert(await page.locator("#settingsDialog").isVisible(), "dialog didn't open");
    await shot("settings");
    assert(await noHScroll(page), "horizontal scroll");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#exportBtn").click()]);
    const file = join(outDir, `${vp.name}-arcade-progress.json`);
    await dl.saveAs(file);
    const before = await page.locator("#trophyTotal").textContent();
    await page.locator("#resetAchBtn").click();
    await page.locator("#resetAchYes").click();
    const zero = await page.locator("#trophyTotal").textContent();
    assert(/^🏆 0 \//.test(zero), `after reset: ${zero}`);
    await page.setInputFiles("#importFile", file);
    await page.waitForSelector("#importPreview:not([hidden])");
    const preview = await page.locator("#importText").textContent();
    assert(/^[1-9]\d* achievements? across 1 game/.test(preview), preview);
    await page.locator("#importYes").click();
    assert((await page.locator("#trophyTotal").textContent()) === before, "import didn't restore the total");
    await page.keyboard.press("Escape");
    assert(await page.locator("#settingsDialog").isHidden(), "Esc didn't close");
    assert(await page.locator("#settingsBtn").evaluate((b) => b === document.activeElement), "focus didn't return to the gear");
    return `${before.trim()}; preview "${preview.split(".")[0]}"`;
  });

  if (!vp.mobile) {
    await check("stats opt-out stops sending", async () => {
      await page.locator("#settingsBtn").click();
      await page.locator("#statsToggle").uncheck();
      await page.keyboard.press("Escape");
      const n = rows.length;
      await page.selectOption("#sort", "new");
      await page.waitForTimeout(300);
      assert(rows.length === n, "a row was sent after opting out");
      await page.locator("#settingsBtn").click();
      await page.locator("#statsToggle").check();
      await page.keyboard.press("Escape");
    });

    await check("what's new callout + Updated badge", async () => {
      const g = games.find((x) => (x.changes || []).length) || games[0];
      await page.evaluate(({ id, v }) => localStorage.setItem(`arcade.seenVersion.${id}`, String(v)), { id: g.id, v: g.version - 1 });
      await page.goto(base);
      await page.waitForSelector(".game-card");
      assert(await page.locator(`.game-card[data-id="${g.id}"] .pill.updated`).count() === 1, "no Updated badge");
      await page.locator(`#gameList .game-card[data-id="${g.id}"]`).click();
      await page.waitForSelector(`.toast.callout:has-text('Updated to v${g.version}')`, { timeout: 3000 });
      await shot("whats-new");
      await page.locator("#backLink").click();
    });

    await check("archived games get their own section", async () => {
      await page.route("**/games/games.json", async (route) => {
        const data = JSON.parse(JSON.stringify(manifest));
        data.games[data.games.length - 1].status = "archived";
        await route.fulfill({ json: data });
      });
      await page.goto(base);
      await page.waitForSelector("#archiveSection:not([hidden]) .game-card");
      assert(await page.locator("#archiveSection .pill.archived").count() === 1, "no Archived badge");
      await page.locator("#archiveSection").scrollIntoViewIfNeeded();
      await shot("archive");
      await page.unroute("**/games/games.json");
    });

    await check("load error shows retry", async () => {
      const g = games[1];
      await page.route(`**/games/${g.file}*`, (route) => route.abort());
      await page.goto(`${base}#/play/${g.id}`);
      await page.waitForSelector('#loadState[data-state="error"]:not([hidden])', { timeout: 5000 });
      await shot("load-error");
      await page.unroute(`**/games/${g.file}*`);
      await page.locator("#retryBtn").click();
      await waitGame(page);
    });

    await check("content security policy blocks other hosts", async () => {
      // The fake endpoint is this server, so 'self' covers it; any other host
      // must be refused.
      const blocked = await page.evaluate(() => new Promise((resolve) => {
        document.addEventListener("securitypolicyviolation", (e) => resolve(e.violatedDirective), { once: true });
        fetch("https://example.invalid/").catch(() => {});
        setTimeout(() => resolve(""), 2000);
      }));
      assert(blocked.startsWith("connect-src"), `not blocked (${blocked || "no violation"})`);
    });

    await check("crash reports: a game's arcade:error becomes an error row", async () => {
      await page.goto(`${base}#/play/${games[0].id}`);
      await waitGame(page);
      const frame = page.frames().find((f) => f.url().includes(games[0].file));
      await frame.evaluate((id) => parent.postMessage({ type: "arcade:error", game: id, message: "smoke test error", line: 7, col: 3 }, "*"), games[0].id);
      await page.waitForTimeout(300);
      const errs = rows.filter((r) => r.kind === "error");
      const row = errs.find((r) => r.message === "smoke test error");
      assert(row && row.source === "game" && row.game_id === games[0].id && row.line === 7, JSON.stringify(row));
      const other = errs.filter((r) => r !== row && r.message !== "smoke test error");
      assert(!other.length, `unexpected error rows: ${other.map((r) => r.message).join(" | ")}`);
    });

    await check("gallery telemetry rows", async () => {
      const gal = rows.filter((r) => r.kind === "gallery");
      const kinds = [...new Set(gal.map((r) => r.action))].sort();
      for (const need of ["download", "open", "settings", "share", "sort"]) assert(kinds.includes(need), `no ${need} row`);
      assert(gal.some((r) => r.action === "open" && r.position >= 1), "open rows lack position");
      return kinds.join(", ");
    });
  }

  // Aborted requests in the load-error check, and the CSP check's refused
  // fetch, log console errors on purpose.
  const real = errors.filter((e) => !/ERR_FAILED|Failed to load resource|example\.invalid/.test(e));
  report(!real.length, tag("console has no errors"), real.slice(0, 3).join(" | "));
  await context.close();
}

await browser.close();
server.close();
// What the gallery sent, for checking the fetch scripts offline:
//   node scripts/fetch-telemetry.mjs --input <out>/endpoint-rows.json
writeFileSync(join(outDir, "endpoint-rows.json"), JSON.stringify(rows, null, 1));
console.log(`${failures ? `${failures} check(s) failed` : "all checks passed"}; screenshots in ${outDir}`);
process.exit(failures ? 1 : 0);
