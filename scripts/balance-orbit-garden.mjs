// Headless balance bots for Orbit Garden.
//
// Usage: node scripts/balance-orbit-garden.mjs [runs=100] [bot,bot,...] [CONST=value,...] [--garden N]
//   e.g. node scripts/balance-orbit-garden.mjs 40 preview2,preview5
//        node scripts/balance-orbit-garden.mjs 100 preview2 '' --garden 3
//
// Builds a debug copy of games/orbit-garden.html (state on window, no
// animation loop), then plays in headless Chromium by calling step()
// directly. The game itself has no randomness, so each bot adds seeded aim
// noise (a stand-in for human error). Prints one line per bot.
// Default: whole voyages (a lost garden is retried up to RETRIES times, then
// the bot gives up; the score is gardens bloomed). --garden N: garden N
// alone, from START_SEEDS, first try only.
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
const RETRIES = 3;         // a bot tries a garden this many times before giving up the voyage
const OVERHEAD = 8;        // seconds per garden a human spends reading, placing, on the end card
const MAX_GARDENS = 40;

// Every bot places planets from SPOTS (the first ones that fit around rocks,
// moons and wild planets) until there are `goal` planets, then flings one
// seed every `gap` seconds. Aim: search drag vectors whose predicted path
// (current masses, no other seeds) lands on the target, prefer ones whose
// neighbors also land, then add Gaussian noise of `noise` degrees to the
// angle and noise% to the power. `naive` drags straight at the target.
// `preview` reads only what a player sees: the in-game dotted aim preview
// (first ~1.2 s of the path), extended in a straight line from its end.
// Target: `even` feeds the lightest planet that isn't blooming; `serial`
// feeds one planet until it blooms, then the next.
const SPOTS = [[110, 320], [290, 320], [200, 170], [200, 420], [110, 190], [290, 190], [60, 420], [340, 420],
  [200, 300], [150, 240], [250, 240], [120, 120], [280, 120], [200, 90], [60, 260], [340, 260]];
const BOTS = {
  perfect: { feed: 'even', noise: 0, gap: 1.5 },
  even2: { feed: 'even', noise: 2, gap: 1.5 },   // skilled human
  even5: { feed: 'even', noise: 5, gap: 1.5 },   // casual human
  serial2: { feed: 'serial', noise: 2, gap: 1.5 },
  fast2: { feed: 'even', noise: 2, gap: 0.5 },   // rapid flinger
  naive: { feed: 'even', noise: 2, gap: 1.5, naive: true },
  preview2: { feed: 'even', noise: 2, gap: 1.5, preview: true },
  preview3: { feed: 'even', noise: 3, gap: 2, preview: true },
  preview5: { feed: 'even', noise: 5, gap: 2, preview: true },
  pfast2: { feed: 'even', noise: 2, gap: 0.5, preview: true },
};

function buildDebug(overrides) {
  let html = fs.readFileSync(SRC, 'utf8');
  for (const [k, v] of Object.entries(overrides)) {
    const re = new RegExp(`(\\b${k} = )(\\[[^\\]]*\\]|[^,;]+)`);
    if (!re.test(html)) throw new Error('no const ' + k);
    html = html.replace(re, `$1${v}`);
  }
  const tail = '  newVoyage();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace(tail, `
  window.__dbg = {
    get state() { return state; }, get elapsed() { return elapsed; }, get planets() { return planets; },
    get seeds() { return seeds; }, get seedsLeft() { return seedsLeft; }, get garden() { return garden; },
    get goal() { return goal; }, get startSeeds() { return startSeeds; },
    set garden(n) { garden = n; },
    LAUNCH, W, H, STEP, SEED_LIFETIME, PREVIEW_STEPS, MAX_DRAG, BLOOM_MASS, START_SEEDS,
    earned: roundEarned, step, fling, placePlanet, newVoyage, startGarden, nextGarden, accel, radius,
    flingVelocity, obstacleAt,
  };
  newVoyage();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page: one voyage (or one garden with `only`).
function playInPage({ seed, bot, only, RETRIES, OVERHEAD, MAX_GARDENS }) {
  const D = window.__dbg;
  let s = seed;
  const rand = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const DEG = Math.PI / 180;
  const SPOTS = bot.spots;

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
      if (D.obstacleAt(x, y)) return -1;
      if (x < -60 || x > D.W + 60 || y < -60 || y > D.H + 60) return -1;
    }
    return -1;
  }
  const drag = (a, len) => [Math.sin(a) * len, -Math.cos(a) * len];

  function aimAt(ti) {
    const p = D.planets[ti];
    if (bot.naive) return { a: Math.atan2(p.x - D.LAUNCH.x, D.LAUNCH.y - p.y), len: D.MAX_DRAG };
    if (bot.preview) {
      let best = null;
      for (let len = 50; len <= D.MAX_DRAG; len += 15) {
        for (let a = -74; a <= 74; a += 1) {
          const v = D.flingVelocity(...drag(a * DEG, len));
          if (!v) continue;
          let x = D.LAUNCH.x, y = D.LAUNCH.y, [vx, vy] = v, blocked = false, closest = Infinity;
          const dt = D.STEP * 2;
          for (let i = 0; i < D.PREVIEW_STEPS; i++) {
            const [ax, ay] = D.accel(x, y);
            vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt;
            const d = Math.hypot(p.x - x, p.y - y);
            closest = Math.min(closest, d);
            if (d < D.radius(p)) break;
            if (D.obstacleAt(x, y)) { blocked = true; break; } // the dots run into a rock or moon
          }
          if (blocked) continue;
          // closest pass of the dots, or of their straight continuation past the end
          const sp = Math.hypot(vx, vy), ux = vx / sp, uy = vy / sp;
          const along = (p.x - x) * ux + (p.y - y) * uy;
          const miss = Math.min(closest, along < 0 ? Infinity : Math.abs((p.x - x) * uy - (p.y - y) * ux));
          if (!best || miss < best.miss) best = { miss, a: a * DEG, len };
        }
      }
      return best;
    }
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
    if (bot.feed === 'serial') return P.findIndex(p => p.mass < D.BLOOM_MASS + 0.5);
    let ti = -1;
    for (let i = 0; i < P.length; i++) if (P[i].mass < D.BLOOM_MASS + 0.5 && (ti < 0 || P[i].mass < P[ti].mass)) ti = i;
    return ti;
  }
  // Tops the sky up to `goal` planets (wild ones count) from the first SPOTS that fit.
  // A player's layout: spots 50+ from rock and moon edges, 90+ from other
  // planets and not behind one (seen from the launcher) come first (with `lineClear`, only those with a clear straight
  // line from the launcher).
  function placeUp() {
    const lineClear = ([x, y]) => {
      for (let t = 0.1; t <= 1; t += 0.05) {
        if (D.obstacleAt(D.LAUNCH.x + (x - D.LAUNCH.x) * t, D.LAUNCH.y + (y - D.LAUNCH.y) * t, 15)) return false;
      }
      return true;
    };
    // (A planet right above the launcher swallows every seed: a player learns
    // that in a shot or two.)
    const good = p => (!bot.lineClear || lineClear(p)) && !D.obstacleAt(p[0], p[1], 50) && !(Math.abs(p[0] - D.LAUNCH.x) < 60 && p[1] > 360)
      && D.planets.every(q => Math.hypot(q.x - p[0], q.y - p[1]) >= 90)
      && D.planets.every(q => !shadowed(p, q));
    // q sits near the straight line from the launcher to p: it would steal p's seeds.
    function shadowed([x, y], q) {
      const lx = x - D.LAUNCH.x, ly = y - D.LAUNCH.y, L = Math.hypot(lx, ly);
      const along = ((q.x - D.LAUNCH.x) * lx + (q.y - D.LAUNCH.y) * ly) / L;
      return along > 0 && along < L && Math.abs((q.x - D.LAUNCH.x) * ly - (q.y - D.LAUNCH.y) * lx) / L < 50;
    }
    for (let pass = 0; pass < 2; pass++) {
      for (const sp of SPOTS) {
        if (D.planets.length >= D.goal) return;
        if (pass === 0 && !good(sp)) continue;
        if (D.planets.some(p => Math.hypot(p.x - sp[0], p.y - sp[1]) < 40)) continue;
        D.placePlanet(sp[0], sp[1]);
      }
    }
  }

  function playGarden() {
    placeUp();
    let nextFling = 0;
    while (D.state === 'playing' && D.elapsed < 300) {
      if (D.elapsed >= nextFling && D.seedsLeft > 0) {
        nextFling = D.elapsed + bot.gap;
        if (D.planets.length < D.goal) placeUp(); // planets that withered away are replaced
        const ti = target();
        if (ti >= 0) {
          const b = aimAt(ti) || { a: 0, len: D.MAX_DRAG };
          let a = b.a, len = b.len;
          a += gauss() * bot.noise * DEG;
          len *= 1 + gauss() * bot.noise / 100;
          D.fling(...drag(a, len));
        }
      }
      D.step(D.STEP);
    }
    return D.state === 'won';
  }

  const earned = new Set();
  if (only) {
    D.newVoyage(); D.garden = only; D.startGarden();
    const won = playGarden();
    for (const id of D.earned) earned.add(id);
    return { won, time: D.elapsed, used: D.startSeeds - D.seedsLeft, earned: [...earned] };
  }
  D.newVoyage();
  let time = 0, tries = 0, losses = 0, firstTry = [];
  const arrive = [];   // seeds each garden started with
  while (D.garden <= MAX_GARDENS) {
    if (tries === 0) arrive.push(D.startSeeds);
    const won = playGarden();
    time += D.elapsed + OVERHEAD;
    for (const id of D.earned) earned.add(id);
    tries++;
    if (tries === 1) firstTry.push(won);
    if (won) { D.nextGarden(); tries = 0; continue; }
    losses++;
    if (tries >= RETRIES) break;
    D.startGarden();
  }
  const bloomed = D.garden - 1;
  return { bloomed, time, losses, firstTry, arrive, earned: [...earned] };
}

async function run(bot, runs, file, browser, only, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) {
      const i = next++;
      results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot: { ...bot, spots: SPOTS }, only, RETRIES, OVERHEAD, MAX_GARDENS });
    }
    await page.close();
  }));
  return results;
}

const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
function achLine(rs) {
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  return Object.entries(ach).map(([k, v]) => `${k} ${Math.round(100 * v / rs.length)}%`).join(', ');
}
function reportGarden(name, rs) {
  const wins = rs.filter(r => r.won);
  console.log(`${name.padEnd(8)} win ${(Math.round(100 * wins.length / rs.length) + '%').padStart(4)} | seeds used (wins) ${med(wins.map(r => r.used))}` +
    ` | time (wins) ${Math.round(med(wins.map(r => r.time)))}s | ${achLine(rs)}`);
}
// One line per bot: gardens bloomed (median, p25-p75), voyage minutes, minutes
// to bloom garden 8 (all hand-made gardens seen), first-try win % per garden.
function reportVoyage(name, rs) {
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(f * (s.length - 1))]; };
  const b = rs.map(r => r.bloomed), mins = rs.map(r => r.time / 60);
  const per = [];
  for (let g = 0; g < 12; g++) {
    const at = rs.filter(r => r.firstTry.length > g);
    if (at.length < 3) break;
    per.push(Math.round(100 * at.filter(r => r.firstTry[g]).length / at.length));
  }
  const seeds = [];
  for (let g = 1; g < 9; g++) { const a = rs.filter(r => r.arrive.length > g).map(r => r.arrive[g]); if (a.length) seeds.push(med(a)); }
  console.log(`${name.padEnd(8)} bloomed ${med(b)} (${q(b, 0.25)}-${q(b, 0.75)}) | voyage ${med(mins).toFixed(1)} min` +
    ` | past g8 ${Math.round(100 * rs.filter(r => r.bloomed >= 8).length / rs.length)}%` +
    ` | 1st-try win% g1.. ${per.join(' ')} | seeds at g2.. ${seeds.join(' ')} | ${achLine(rs)}`);
}

const args = process.argv.slice(2);
const gi = args.indexOf('--garden');
const only = gi >= 0 ? +args.splice(gi, 2)[1] : 0;
const runs = +args[0] || 100;
const names = (args[1] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
for (const kv of (args[2] || '').split(/,(?![^\[]*\])/).filter(Boolean)) { const [k, v] = kv.split('='); overrides[k] = v; }
const file = buildDebug(overrides);
const browser = await chromium.launch();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  const rs = await run(BOTS[n], runs, file, browser, only);
  (only ? reportGarden : reportVoyage)(n, rs);
}
await browser.close();
