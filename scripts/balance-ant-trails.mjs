// Headless balance bots for Ant Trails.
//
// Usage: node scripts/balance-ant-trails.mjs [runs=200] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-ant-trails.mjs 200 trail,wash EVAP=0.08,SMELL_R=25
//
// Builds a debug copy of games/ant-trails.html (state on window, seeded
// Math.random, no animation loop), then plays seeded games in headless
// Chromium by calling step() directly. Sundown is pushed out to 200 s so one
// set of runs gives the win rate for several sundown times ("@90: 60%").
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/ant-trails.html');
const SUN_TIMES = [75, 90, 105, 120];

const BOTS = {
  idle: {},                         // no input: the colony forages on its own
  trail: { trail: true },           // redraw a nest-to-food trail whenever one fades
  wash: { trail: true, wash: true }, // ...and rain on the spider when it closes in on ants
  far: { trail: true, wash: true, far: true }, // same, but trail the far pile first (Long Haul)
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
  const tail = '  newColony();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get ants() { return ants; }, get piles() { return piles; }, get spider() { return spider; },
    get state() { return state; }, get elapsed() { return elapsed; }, get delivered() { return delivered; },
    get lost() { return lost; }, get gland() { return gland; }, get rain() { return rain; },
    earned: roundEarned, NEST, INK_PX, W, H, step, layTrail, scentAt, newColony,
    setRain(x, y) { if (x == null) rain = null; else if (rain) { rain.x = x; rain.y = y; } else rain = { x, y, t: 0 }; },
  };
  newColony();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ants-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newColony();
  const dt = 1 / 60, hyp = Math.hypot, N = D.NEST;
  let t = 0, tick = 0, washUntil = -1, washCool = 0, washes = 0, draws = 0, deliveredAt90 = null;
  function lineScent(p) {
    let s = 0, n = 0;
    for (let k = 0.15; k <= 0.85; k += 0.1) { s += D.scentAt(N.x + (p.x - N.x) * k, N.y + (p.y - N.y) * k); n++; }
    return s / n;
  }
  while (D.state === 'playing') {
    if (tick++ % 6 === 0) { // 10 decisions per second
      const sp = D.spider;
      if (bot.wash) {
        if (t < washUntil) D.setRain(sp.x, sp.y);
        else {
          if (D.rain) D.setRain(null);
          const threatened = sp.eat <= 0 && sp.followT > 0.5 && D.ants.some(a => hyp(a.x - sp.x, a.y - sp.y) < 60);
          if (threatened && t > washCool) { washUntil = t + 1.0; washCool = t + 4; washes++; D.setRain(sp.x, sp.y); }
        }
      }
      if (bot.trail && !D.rain) {
        const piles = D.piles.filter(p => p.n > 0).sort((a, b) => (bot.far ? -1 : 1) * (hyp(a.x - N.x, a.y - N.y) - hyp(b.x - N.x, b.y - N.y)));
        for (const p of piles) {
          const len = hyp(p.x - N.x, p.y - N.y);
          if (lineScent(p) < 0.25 && D.gland * D.INK_PX >= len) {
            for (let k = 0; k < 1; k += 0.05) {
              D.layTrail(N.x + (p.x - N.x) * k, N.y + (p.y - N.y) * k, N.x + (p.x - N.x) * (k + 0.05), N.y + (p.y - N.y) * (k + 0.05));
            }
            draws++;
            break;
          }
        }
      }
    }
    D.step(dt);
    t += dt;
    if (deliveredAt90 === null && t >= 90) deliveredAt90 = D.delivered;
  }
  if (deliveredAt90 === null) deliveredAt90 = D.delivered;
  return { won: D.state === 'won', t, lost: D.lost, ants: D.ants.length, delivered: D.delivered,
    deliveredAt90, draws, washes, earned: [...D.earned] };
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
  const win = T => `@${T}:${(100 * rs.filter(r => r.won && r.t <= T).length / rs.length).toFixed(0).padStart(3)}%`;
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  const achs = Object.entries(ach).map(([k, v]) => `${k} ${Math.round(100 * v / rs.length)}%`).join(', ');
  console.log(`${name.padEnd(6)} ${SUN_TIMES.map(win).join(' ')} | crumbs@90 ${med(rs.map(r => r.deliveredAt90))}` +
    ` | lost ${med(rs.map(r => r.lost))} | colony died ${rs.filter(r => !r.won && r.ants < 8).length}` +
    ` | washes ${med(rs.map(r => r.washes))} | ${achs}`);
}

const runs = +process.argv[2] || 200;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = { SUNDOWN: 200, SPARE: 200 - 70 }; // Swift still means a win by 70 s
for (const kv of (process.argv[4] || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); overrides[k] = v; }
const file = buildDebug(overrides);
const browser = await chromium.launch();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS[n], runs, file, browser));
}
await browser.close();
