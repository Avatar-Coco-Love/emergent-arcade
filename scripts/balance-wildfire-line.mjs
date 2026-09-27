// Headless balance bots for Wildfire Line.
//
// Usage: node scripts/balance-wildfire-line.mjs [runs=200] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-wildfire-line.mjs 300 cut,cutburn EMBER_RATE=0.03
//
// Builds a debug copy of games/wildfire-line.html (state on window, seeded
// Math.random, no animation loop), then plays seeded games in headless
// Chromium by calling step() directly. Prints one line per bot.
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/wildfire-line.html');

const BOTS = {
  idle: {},                          // no input: the fire runs its course
  cut: { cut: true },                // cut a line across the meadow above the village, nearest the fire first
  cutburn: { cut: true, burn: true }, // same lines, burned out from right above them as sections finish
  burn: { ahead: true },             // diagnostic: no cutting, backburn ahead of the fire when the wind blows back at it
};

function buildDebug(overrides) {
  let html = fs.readFileSync(SRC, 'utf8');
  for (const [k, v] of Object.entries(overrides)) {
    const re = new RegExp(`(\\b${k} = )[^,;]+`);
    if (!re.test(html)) throw new Error('no const ' + k);
    html = html.replace(re, `$1${v}`);
  }
  const seed = `<script>
let __s = 1;
Math.random = function() { __s |= 0; __s = __s + 0x6D2B79F5 | 0; let t = Math.imul(__s ^ __s >>> 15, 1 | __s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
window.__seed = s => { __s = s; };
</script>`;
  const tail = '  newRound();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get state() { return state; }, get elapsed() { return elapsed; }, get stamina() { return stamina; },
    get torchCool() { return torchCool; }, get houses() { return houses; }, get wind() { return wind; },
    get taps() { return taps; }, get cuts() { return cuts; },
    fuel, fire, kind, cut, origin, GW, GH, CELL, W, H,
    earned: roundEarned, step, cutLine, backburn, newRound, windWarning,
  };
  newRound();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wildfire-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newRound();
  const dt = 1 / 60, C = D.CELL, GW = D.GW, GH = D.GH;
  const LINES = [470, 450];          // a line, then a second row to stop sparks
  const CHUNK = 40;
  let tick = 0;
  // A chunk is done when every grass cell within 10 px of its line is cut or already burnt.
  function chunkDone(y, x0) {
    for (let cy = Math.floor((y - 10) / C); cy <= Math.floor((y + 10) / C); cy++) {
      for (let cx = Math.floor(x0 / C); cx < Math.floor((x0 + CHUNK) / C); cx++) {
        const i = cy * GW + cx, py = cy * C + C / 2;
        if (Math.abs(py - y) > 10) continue;
        if (D.kind[i] === 0 && !D.cut[i] && D.fire[i] === 0) return false;
      }
    }
    return true;
  }
  function lineDone(y) { for (let x0 = 0; x0 < D.W; x0 += CHUNK) if (!chunkDone(y, x0)) return false; return true; }
  function front() { // the main fire's cell closest to the village
    let best = null;
    for (let i = 0; i < GW * GH; i++) if (D.fire[i] === 1 && D.origin[i] === 1 && (!best || i > best)) best = i;
    return best === null ? null : { x: (best % GW) * C + C / 2, y: Math.floor(best / GW) * C + C / 2 };
  }
  while (D.state === 'playing') {
    if (tick++ % 6 === 0) { // 10 decisions per second
      const f = front();
      if (bot.cut && f) {
        let done = true;
        for (const y of LINES) {
          const todo = [];
          for (let x0 = 0; x0 < D.W; x0 += CHUNK) if (!chunkDone(y, x0)) todo.push(x0);
          if (!todo.length) continue;
          done = false;
          todo.sort((a, b) => Math.abs(a + CHUNK / 2 - f.x) - Math.abs(b + CHUNK / 2 - f.x));
          if (D.stamina > 25) D.cutLine(todo[0], y, todo[0] + CHUNK, y);
          break;
        }
        // Line finished: ring the house closest to any fire that got past it.
        if (done && f.y > LINES[0] && D.stamina > 25) {
          const h = D.houses.filter(h => !h.burnt).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0];
          if (h) for (let k = 0; k < 12; k++) {
            const a0 = k / 12 * Math.PI * 2, a1 = (k + 1) / 12 * Math.PI * 2;
            D.cutLine(h.x + Math.cos(a0) * 28, h.y + Math.sin(a0) * 28, h.x + Math.cos(a1) * 28, h.y + Math.sin(a1) * 28);
          }
        }
      }
      // Burn out: light right against a cut section of the line, at least two sections from any
      // uncut one (so the burn can't flank round an end), while the fire is still far off.
      if (bot.burn && f && D.torchCool <= 0 && f.y < LINES[0] - 80) {
        const doneAt = x0 => x0 < 0 || x0 >= D.W || chunkDone(LINES[0], x0);
        const spots = [];
        for (let x = 15; x < D.W; x += 30) {
          const x0 = Math.floor(x / CHUNK) * CHUNK, y = LINES[0] - 23, i = Math.floor(y / C) * GW + Math.floor(x / C);
          let safe = true;
          for (let k = -2; k <= 2; k++) if (!doneAt(x0 + k * CHUNK)) safe = false;
          if (safe && D.fire[i] === 0 && D.fuel[i] >= 0.15) spots.push(x);
        }
        spots.sort((a, b) => Math.abs(a - f.x) - Math.abs(b - f.x));
        if (spots.length) D.backburn(spots[0], LINES[0] - 23);
      }
      // Backburn just ahead of the main fire while the wind blows back toward it, with time
      // left before the next shift (no line behind it: the risky way).
      const w = D.wind;
      if (bot.ahead && f && D.torchCool <= 0 && Math.sin(w.heading) < 0 && w.shiftAt - D.elapsed > 5 && w.turnT <= 0) {
        const spots = [];
        for (let x = 15; x < D.W; x += 30) {
          let low = -1; // lowest main-fire cell in this column; light 45 px below it
          for (let cy = GH - 1; cy >= 0 && low < 0; cy--) if (D.fire[cy * GW + Math.floor(x / C)] === 1 && D.origin[cy * GW + Math.floor(x / C)] === 1) low = cy;
          if (low < 0) continue;
          const y = low * C + 45, i = Math.floor(y / C) * GW + Math.floor(x / C);
          if (y < D.H - 60 && D.fire[i] === 0 && D.fuel[i] >= 0.15) spots.push([x, y]);
        }
        spots.sort((a, b) => b[1] - a[1]);
        if (spots.length) D.backburn(spots[0][0], spots[0][1]);
      }
    }
    D.step(dt);
  }
  const hs = D.houses;
  return { won: D.state === 'won', t: D.elapsed, lost: hs.filter(h => h.burnt).length,
    own: hs.filter(h => h.burnt && h.byBack).length, taps: D.taps, cuts: D.cuts, earned: [...D.earned] };
}

async function run(bot, runs, file, browser, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot }); }
    await page.close();
  }));
  return results;
}

function report(name, rs) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const pct = n => `${Math.round(100 * n / rs.length)}%`;
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  const achs = Object.entries(ach).map(([k, v]) => `${k} ${pct(v)}`).join(', ');
  const wins = rs.filter(r => r.won);
  console.log(`${name.padEnd(7)} win ${pct(wins.length).padStart(4)} | 4/4 ${pct(wins.filter(r => !r.lost).length).padStart(4)}` +
    ` | t(win) ${med(wins.map(r => r.t)).toFixed(0)}s t(all) ${med(rs.map(r => r.t)).toFixed(0)}s` +
    ` | own-burn losses ${rs.reduce((s, r) => s + r.own, 0)} | taps ${med(rs.map(r => r.taps))} (${pct(rs.filter(r => r.taps).length)} tapped) cells cut ${med(rs.map(r => r.cuts))} | ${achs}`);
}

const runs = +process.argv[2] || 200;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
for (const kv of (process.argv[4] || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); overrides[k] = v; }
const file = buildDebug(overrides);
const browser = await chromium.launch();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS[n], runs, file, browser));
}
await browser.close();
