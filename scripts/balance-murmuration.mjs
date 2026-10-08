// Headless balance bots for Murmuration.
//
// Usage: node scripts/balance-murmuration.mjs [runs=300] [bot,bot,...]
//   e.g. node scripts/balance-murmuration.mjs 300 lure80,smart90
//
// Builds a debug copy of games/murmuration.html (state on window, seeded
// Math.random, no animation loop), then plays seeded games in headless
// Chromium by calling step() directly. Night is pushed out to 200 s so one set
// of runs gives the win rate for several dusk times ("@60: 79%" = wins by 60 s).
// Needs Playwright (installed globally in Claude Code cloud sessions).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  const root = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(pathToFileURL(path.join(root, 'playwright/index.mjs'))));
}

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/murmuration.html');
const DUSK_TIMES = [45, 50, 55, 60, 65, 70];

const BOTS = {
  // Lure only: hold the lure `lead` units ahead of the main cluster, aimed through the gate.
  lure60: { lead: 60 },   // close leader (the brief's bot)
  lure80: { lead: 80 },   // best lure-only setting
  lure100: { lead: 100 },
  // Naive startle: tap just behind the rearmost bird every 3 s while calm.
  rear100: { lead: 100, startle: { mode: 'rear', every: 3, back: 15 } },
  // Smart startle: tap behind the flock only if it is calm, already heading the
  // right way, has room to burst without leaving the sky, and is away from the gate.
  smart90: { lead: 90, startle: { mode: 'smart', every: 2, back: 10, room: 110, align: 0.7 } },
};

function buildDebug() {
  let html = fs.readFileSync(SRC, 'utf8');
  const seed = `<script>
let __s = 1;
Math.random = function() { __s |= 0; __s = __s + 0x6D2B79F5 | 0; let t = Math.imul(__s ^ __s >>> 15, 1 | __s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
window.__seed = s => { __s = s; };
</script>`;
  const tail = '  newFlock();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get birds() { return birds; }, get gate() { return gate; }, get state() { return state; },
    get elapsed() { return elapsed; }, get passed() { return passed.size; }, get startles() { return startles; },
    get GATES() { return GATES; },
    earned: roundEarned, NIGHTS, W, H, step, startle, newFlock, draw, fitSky,
    setGate(k) { gate = k; },
    setLure(x, y) { lure = x == null ? null : { x, y, on: true }; },
  };
  newFlock();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'murm-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot, night, dusk }) {
  const D = window.__dbg;
  D.NIGHTS[night].dusk = dusk; // night pushed out, so one set of runs gives several dusk times
  window.__seed(seed);
  D.newFlock(night);
  const dt = 1 / 60, hyp = Math.hypot;
  let luring = true, lastTap = -99, t = 0, lastGate = 0, taps = 0, tick = 0;
  const gateTimes = [];
  function cluster(bs) {
    let cx = 0, cy = 0;
    for (const b of bs) { cx += b.x; cy += b.y; }
    cx /= bs.length; cy /= bs.length;
    for (let it = 0; it < 3; it++) {
      let sx = 0, sy = 0, n = 0;
      for (const b of bs) if (hyp(b.x - cx, b.y - cy) < 70) { sx += b.x; sy += b.y; n++; }
      if (n) { cx = sx / n; cy = sy / n; }
    }
    const mem = bs.filter(b => hyp(b.x - cx, b.y - cy) < 70);
    let vx = 0, vy = 0;
    for (const b of mem) { vx += b.vx; vy += b.vy; }
    return { cx, cy, mem, vx: vx / (mem.length || 1), vy: vy / (mem.length || 1) };
  }
  while (D.state === 'playing') {
    if (tick++ % 6 === 0) { // 10 decisions per second
      const bs = D.birds, c = cluster(bs), g = D.GATES[D.gate];
      const a = g.a * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
      let nx = -uy, ny = ux; // gate normal, pointed from the flock's side through the gate
      if ((c.cx - g.x) * nx + (c.cy - g.y) * ny > 0) { nx = -nx; ny = -ny; }
      const along = (c.cx - g.x) * ux + (c.cy - g.y) * uy;
      const depth = Math.abs((c.cx - g.x) * nx + (c.cy - g.y) * ny);
      // Line up on a staging point first, then lead straight through.
      const stage = Math.abs(along) > 25 && depth < 60;
      const wx = g.x + nx * (stage ? -70 : 80), wy = g.y + ny * (stage ? -70 : 80);
      let dx = wx - c.cx, dy = wy - c.cy;
      const dl = hyp(dx, dy) || 1; dx /= dl; dy /= dl;
      const meanFear = bs.reduce((s, b) => s + b.fear, 0) / bs.length;
      if (luring && meanFear > 0.3) luring = false;
      if (!luring && meanFear < 0.15) luring = true;
      D.setLure(luring ? c.cx + dx * bot.lead : null, c.cy + dy * bot.lead);

      const S = bot.startle;
      if (S && t - lastTap > S.every && meanFear < 0.1 && hyp(g.x - c.cx, g.y - c.cy) > 110 && c.mem.length) {
        let rp = Infinity, rear = null;
        for (const b of c.mem) { const p = (b.x - c.cx) * dx + (b.y - c.cy) * dy; if (p < rp) { rp = p; rear = b; } }
        let tx, ty, ok = true;
        if (S.mode === 'rear') { tx = rear.x - dx * S.back; ty = rear.y - dy * S.back; }
        else {
          const sp = hyp(c.vx, c.vy) || 1;
          if ((c.vx * dx + c.vy * dy) / sp < S.align) ok = false;
          tx = c.cx + dx * (rp - S.back); ty = c.cy + dy * (rp - S.back);
          const px = c.cx + dx * S.room, py = c.cy + dy * S.room;
          if (px < 25 || px > D.W - 25 || py < 25 || py > D.H - 25) ok = false;
        }
        if (ok) { D.startle(tx, ty); lastTap = t; taps++; }
      }
    }
    D.step(dt);
    t += dt;
    if (D.gate !== lastGate) { gateTimes.push(t); lastGate = D.gate; }
  }
  if (D.state === 'won') gateTimes.push(t);
  return { won: D.state === 'won', t, birds: D.birds.length, taps, gateTimes };
}

async function run(bot, runs, file, browser, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot, night: 0, dusk: 200 }); }
    await page.close();
  }));
  return results;
}

function report(name, rs) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const win = T => `@${T}:${(100 * rs.filter(r => r.won && r.t <= T).length / rs.length).toFixed(0).padStart(3)}%`;
  const perGate = [0, 1, 2, 3, 4].map(k =>
    med(rs.filter(r => r.gateTimes.length > k).map(r => r.gateTimes[k] - (k ? r.gateTimes[k - 1] : 0))).toFixed(1));
  const scattered = rs.filter(r => !r.won).length;
  console.log(`${name.padEnd(9)} ${DUSK_TIMES.map(win).join(' ')}  taps ${med(rs.map(r => r.taps))}` +
    `  scattered ${scattered}/${rs.length}  s/gate ${perGate.join('/')}`);
}

const runs = +process.argv[2] || 300;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const file = buildDebug();
const browser = await chromium.launch();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS[n], runs, file, browser));
}
await browser.close();
