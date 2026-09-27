// Headless balance bots for Orbit Garden.
//
// Usage: node scripts/balance-orbit-garden.mjs [runs=100] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-orbit-garden.mjs 100 even2,serial2 WITHER_PER_SEC=0.08
//
// Builds a debug copy of games/orbit-garden.html (state on window, no
// animation loop), then plays games in headless Chromium by calling step()
// directly. The game itself has no randomness, so each bot adds seeded aim
// noise (a stand-in for human error). Prints one line per bot.
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/orbit-garden.html');

// Every bot places its planets at the start, then flings one seed every `gap`
// seconds. Aim: search drag vectors whose predicted path (current masses, no
// other seeds) lands on the target, prefer ones whose neighbors also land, then
// add Gaussian noise of `noise` degrees to the angle and noise% to the power.
// `naive` skips the search and drags straight at the target, ignoring gravity.
// Target: `even` feeds the lightest planet that isn't blooming; `serial` feeds
// planet 1 until it blooms, then 2, then 3.
const TRI = [[110, 320], [290, 320], [200, 170]];
const BOTS = {
  perfect: { layout: TRI, feed: 'even', noise: 0, gap: 1.5 },
  even2: { layout: TRI, feed: 'even', noise: 2, gap: 1.5 },   // skilled human
  even5: { layout: TRI, feed: 'even', noise: 5, gap: 1.5 },   // casual human
  serial2: { layout: TRI, feed: 'serial', noise: 2, gap: 1.5 },
  slow2: { layout: TRI, feed: 'even', noise: 2, gap: 3 },     // careful aimer, one seed per 3 s
  naive: { layout: TRI, feed: 'even', noise: 2, gap: 1.5, naive: true },
  naive5: { layout: TRI, feed: 'even', noise: 5, gap: 1.5, naive: true },
  close2: { layout: [[160, 300], [240, 300], [200, 230]], feed: 'even', noise: 2, gap: 1.5 },
};

function buildDebug(overrides) {
  let html = fs.readFileSync(SRC, 'utf8');
  for (const [k, v] of Object.entries(overrides)) {
    const re = new RegExp(`(\\b${k} = )(\\[[^\\]]*\\]|[^,;]+)`);
    if (!re.test(html)) throw new Error('no const ' + k);
    html = html.replace(re, `$1${v}`);
  }
  const tail = '  newGarden();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace(tail, `
  window.__dbg = {
    get state() { return state; }, get elapsed() { return elapsed; }, get planets() { return planets; },
    get seeds() { return seeds; }, get seedsLeft() { return seedsLeft; },
    LAUNCH, W, H, STEP, SEED_LIFETIME, MAX_DRAG, BLOOM_MASS, START_SEEDS,
    earned: roundEarned, step, fling, placePlanet, newGarden, accel, radius, flingVelocity,
  };
  newGarden();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot }) {
  const D = window.__dbg;
  D.newGarden();
  let s = seed;
  const rand = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const DEG = Math.PI / 180;

  for (const [x, y] of bot.layout) D.placePlanet(x, y);

  // Where a seed flung with this drag lands: planet index, or -1.
  function landsOn(dx, dy) {
    const v = D.flingVelocity(dx, dy);
    if (!v) return -1;
    let x = D.LAUNCH.x, y = D.LAUNCH.y, [vx, vy] = v;
    const dt = D.STEP * 2, P = D.planets;
    for (let t = 0; t < D.SEED_LIFETIME; t += dt) {
      const [ax, ay] = D.accel(x, y);
      vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt;
      for (let i = 0; i < P.length; i++) if (Math.hypot(P[i].x - x, P[i].y - y) < D.radius(P[i])) return i;
      if (x < -60 || x > D.W + 60 || y < -60 || y > D.H + 60) return -1;
    }
    return -1;
  }
  const drag = (a, len) => [Math.sin(a) * len, -Math.cos(a) * len];

  function aimAt(ti) {
    const p = D.planets[ti];
    if (bot.naive) return Math.atan2(p.x - D.LAUNCH.x, D.LAUNCH.y - p.y);
    let best = null;
    for (let len = 50; len <= D.MAX_DRAG; len += 15) {
      const hits = [];
      for (let a = -74; a <= 74; a += 2) hits.push(landsOn(...drag(a * DEG, len)) === ti);
      for (let k = 0; k < hits.length; k++) {
        if (!hits[k]) continue;
        let w = 1; // width of the run of hits around k: wider = more forgiving
        for (let j = k - 1; j >= 0 && hits[j]; j--) w++;
        for (let j = k + 1; j < hits.length && hits[j]; j++) w++;
        if (!best || w > best.w) best = { w, a: (-74 + 2 * k) * DEG, len };
      }
    }
    return best;
  }

  function target() {
    const P = D.planets;
    if (bot.feed === 'serial') {
      const i = P.findIndex(p => p.mass < D.BLOOM_MASS + 0.5);
      return i;
    }
    let ti = -1;
    for (let i = 0; i < P.length; i++) if (P[i].mass < D.BLOOM_MASS + 0.5 && (ti < 0 || P[i].mass < P[ti].mass)) ti = i;
    return ti;
  }

  let nextFling = 0;
  let misses = 0;
  while (D.state === 'playing' && D.elapsed < 300) {
    if (D.elapsed >= nextFling && D.seedsLeft > 0) {
      nextFling = D.elapsed + bot.gap;
      // Planets that withered away are placed again where they were.
      if (D.planets.length < bot.layout.length) {
        for (const [x, y] of bot.layout) if (!D.planets.some(p => p.x === x && p.y === y)) D.placePlanet(x, y);
      }
      const ti = target();
      if (ti >= 0) {
        let a, len;
        if (bot.naive) {
          a = aimAt(ti); len = D.MAX_DRAG;
        } else {
          const b = aimAt(ti);
          if (!b) { misses++; a = 0; len = D.MAX_DRAG; } else { a = b.a; len = b.len; }
        }
        a += gauss() * bot.noise * DEG;
        len *= 1 + gauss() * bot.noise / 100;
        D.fling(...drag(a, len));
      }
    }
    D.step(D.STEP);
  }
  return {
    won: D.state === 'won', time: D.elapsed, used: D.START_SEEDS - D.seedsLeft,
    earned: [...D.earned], noAim: misses,
  };
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
  console.log(`${name.padEnd(7)} win ${pct(wins.length).padStart(4)} | seeds used (wins) ${med(wins.map(r => r.used))}` +
    ` | time (wins) ${Math.round(med(wins.map(r => r.time)))}s | no aim found ${med(rs.map(r => r.noAim))} | ${achs}`);
}

const runs = +process.argv[2] || 100;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
for (const kv of (process.argv[4] || '').split(/,(?![^\[]*\])/).filter(Boolean)) { const [k, v] = kv.split('='); overrides[k] = v; }
const file = buildDebug(overrides);
const browser = await chromium.launch();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS[n], runs, file, browser));
}
await browser.close();
