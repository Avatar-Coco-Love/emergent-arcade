// Headless balance bots for Hourglass Delivery.
//
// Usage: node scripts/balance-hourglass-delivery.mjs [runs=200] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-hourglass-delivery.mjs 300 pour,both BELT_V=45,LEDGE_ROWS=[50,108]
//
// Builds a debug copy of games/hourglass-delivery.html (state on window, seeded
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/hourglass-delivery.html');

const BOTS = {
  idle: {},                          // no input: the glasses roll past empty
  pour: { pour: true },              // pour down clear columns onto where each glass will be (or onto it anyway)
  knock: { knock: true },            // knock the starting dunes off ledge ends onto passing glasses
  both: { pour: true, knock: true, stock: true }, // knock piles onto glasses, pour direct, restock ledges in between
  // Human-ish (v6): the human data so far (all rounds lost at ~33 s, sand in
  // glasses but under the line) fits slower decisions and loose aim.
  //   sloppy: both, deciding 3x a second (not 10), pour aim off by
  //     N(0, aimNoise) px, and a ready knock taken with chance knockP per decision.
  //   sloppy-pour: sloppy without stocking or knocking.
  sloppy: { pour: true, knock: true, stock: true, every: 20, aimNoise: 10, knockP: 0.5 },
  'sloppy-pour': { pour: true, every: 20, aimNoise: 10 },
};

function buildDebug(overrides) {
  let html = fs.readFileSync(SRC, 'utf8');
  for (const [k, v] of Object.entries(overrides)) {
    const re = new RegExp(`(\\b${k} = )(\\[[^\\]]*\\]|[^,;]+)`);
    if (!re.test(html)) throw new Error('no const ' + k);
    html = html.replace(re, `$1${v}`);
  }
  const seed = `<script>
let __s = 1;
Math.random = function() { __s |= 0; __s = __s + 0x6D2B79F5 | 0; let t = Math.imul(__s ^ __s >>> 15, 1 | __s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
window.__seed = s => { __s = s; };
</script>`;
  const tail = '  newRun();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get state() { return state; }, get elapsed() { return elapsed; }, get hopper() { return hopper; },
    get knockCool() { return knockCool; }, get glasses() { return glasses; }, get ledges() { return ledges; },
    get filled() { return filled; }, get missed() { return missed; }, get poured() { return poured; },
    get spilled() { return spilled; }, get knocks() { return knocks; }, get packedCount() { return packedCount; },
    setPour(on, x) { pouring = on; if (x !== undefined) spoutX = x; },
    grid, GW, CELL, W, MOUTH_ROW, MOUTH_HW, CAP, POUR_RATE, GRAV, VMAX, GLASSES,
    get BELT_V() { return BELT_V; }, get LINE() { return LINE; }, get order() { return order; },
    get runFilled() { return runFilled; }, get hopperNow() { return hopper; }, unlockedAll: unlocked,
    setOrder(k, h) { order = k; startHopper = h === undefined ? HOPPER : h; },
    newRun, nextOrder,
    earned: roundEarned, step, knock, newRound,
    // The sand scan's row parity carries over between rounds; reset it so a
    // seed plays the same whichever worker page runs it.
    resetTick() { tick = 0; stamp.fill(0); },
  };
  newRun();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hourglass-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.resetTick();
  if (bot.runStep === 'next') D.nextOrder();
  else if (bot.runStep === 'retry') D.newRound();
  else { D.setOrder(bot.order || 1); D.newRound(); }
  const dt = 1 / 60, C = D.CELL, GW = D.GW, G = D.grid, MR = D.MOUTH_ROW;
  const LOOSE = 1, PACKED = 2, WALL = 3;
  // Seconds for a grain to fall from row r to the glass mouths down a clear column.
  function fallT(r) {
    let y = r, v = 1, n = 0;
    while (y < MR) { y += Math.max(1, v | 0); v = Math.min(D.VMAX, v + D.GRAV); n++; }
    return n * dt;
  }
  const FALL0 = fallT(0);
  // Nothing solid in columns cx-1..cx+1 from row r down to the mouths.
  function clear(cx, r) {
    for (let x = cx - 1; x <= cx + 1; x++) {
      if (x < 0 || x >= GW) return false;
      for (let y = r; y < MR; y++) { const s = G[y * GW + x]; if (s === WALL || s === PACKED) return false; }
    }
    return true;
  }
  // The first glass still short of its line that sand could reach within t seconds.
  function needy(t, margin = 0) {
    return D.glasses.filter(g => !g.gone && g.n < D.LINE - margin && g.x + D.BELT_V * t < D.W - D.MOUTH_HW + 4);
  }
  function pile(l) {
    let n = 0, sx = 0;
    for (let y = Math.max(0, l.y - 14); y < l.y; y++) for (let x = l.x0; x <= l.x1; x++) {
      const s = G[y * GW + x];
      if (s === LOOSE || s === PACKED) { n++; sx += x; }
    }
    return { n, cx: n ? sx / n : 0 };
  }
  let tick = 0;
  let rs = seed * 7919 + 17;
  const rnd = () => { rs = rs + 0x6D2B79F5 | 0; let t = Math.imul(rs ^ rs >>> 15, 1 | rs);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const INFLIGHT = D.POUR_RATE * FALL0 * 0.8;
  while (D.state === 'playing') {
    if (tick++ % (bot.every || 6) === 0) { // 10 decisions per second (sloppy: 3)
      let pourAt = null;
      // Knock a pile off a ledge end with a clear drop onto where a glass will be.
      if (bot.knock && D.knockCool <= 0 && (!bot.knockP || rnd() < bot.knockP)) {
        let best = null;
        for (const l of D.ledges) {
          const p = pile(l);
          if (p.n < 25) continue;
          for (const [d, ex] of [[-1, l.x0 - 2], [1, l.x1 + 2]]) {
            if (ex < 1 || ex > GW - 2 || !clear(ex, l.y)) continue;
            const t = Math.abs(ex - p.cx) / 2 * dt * 1.6 + fallT(l.y) + 0.15;
            const x = ex * C + C / 2;
            for (const g of needy(t, 20)) {
              if (Math.abs(g.x + D.BELT_V * t - x) < D.MOUTH_HW - 6 && (!best || p.n > best.n)) best = { n: p.n, x: p.cx * C, y: (l.y - 3) * C, d };
            }
          }
        }
        if (best) D.knock(best.x, best.y, best.d, 0);
      }
      if (bot.pour && D.hopper > 0) {
        const gs = needy(FALL0).filter(g => g.n < D.LINE - INFLIGHT);
        for (const g of gs) {
          const aim = Math.floor((g.x + D.BELT_V * FALL0) / C);
          if (aim < 1 || aim > GW - 2) continue;
          const span = Math.floor((D.MOUTH_HW - 6) / C);
          const cols = [];
          for (let c = aim - span; c <= aim + span; c++) if (clear(c, 0)) cols.push(c);
          if (cols.length) { pourAt = cols.sort((a, b) => Math.abs(a - aim) - Math.abs(b - aim))[0] * C + C / 2; break; }
          // No clear drop anywhere along its path: pour on it anyway and let the ledges overflow.
          let any = false;
          for (let c = aim; c < GW - 2 && !any; c++) if (clear(c, 0)) any = true;
          if (!any && !bot.stock) { pourAt = aim * C + C / 2; break; }
        }
      }
      // Restock: fill the ledge with a clear drop off one end and the smallest pile, from a clear column above it.
      if (bot.stock && pourAt === null && D.hopper > 0) {
        let best = null;
        for (const l of D.ledges) {
          if (!clear(l.x0 - 2, l.y) && !clear(l.x1 + 2, l.y)) continue;
          const w = l.x1 - l.x0 + 1, p = pile(l);
          if (p.n > w * w / 4 * 0.8) continue;
          const mid = Math.round((l.x0 + l.x1) / 2);
          let ok = false;
          for (let x = mid - 1; x <= mid + 1 && !ok; x++) {
            ok = true;
            for (let y = 0; y < l.y - 1 && ok; y++) { const s = G[y * GW + x]; if (s === WALL || (s === PACKED && y < l.y - 14)) ok = false; }
          }
          if (ok && (!best || p.n < best.n)) best = { n: p.n, x: mid * C + C / 2 };
        }
        if (best) pourAt = best.x;
      }
      if (pourAt !== null && bot.aimNoise) pourAt += gauss() * bot.aimNoise;
      D.setPour(pourAt !== null, pourAt === null ? undefined : pourAt);
    }
    D.step(dt);
  }
  D.setPour(false);
  return { won: D.state === 'won', order: D.order, filled: D.filled, missed: D.missed, t: D.elapsed, poured: D.poured,
    spilled: D.spilled, knocks: D.knocks, earned: [...D.earned] };
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
  console.log(`${name.padEnd(6)} win ${pct(wins.length).padStart(4)} | all ${pct(rs.filter(r => r.filled === 6).length).padStart(4)}` +
    ` | filled ${med(rs.map(r => r.filled))} | poured ${med(rs.map(r => r.poured))} spilled ${med(rs.map(r => r.spilled))}` +
    ` | knocks ${med(rs.map(r => r.knocks))} | ${achs}`);
}

// RUN=1: whole runs. Each order is one playInPage call on the same page;
// after a win the next order starts on the same sand, after a loss the bot
// retries on a fresh layout (up to RETRIES losses per order, then it gives
// up), at most MAXORDER orders. ORDER=k: single rounds at order k instead.
const RETRIES = +(process.env.RETRIES || 3), MAXORDER = +(process.env.MAXORDER || 15);
async function runRuns(bot, runs, file, browser, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) {
      const i = next++;
      let total = 0, losses = 0, k = 0, step = 'first', lossAt = {}, done = 0, t5 = null;
      for (;;) {
        const r = await page.evaluate(playInPage, { seed: 1000 + i * 100 + k++, bot: { ...bot, runStep: step, order: 1 } });
        total += r.t;
        if (r.won) { losses = 0; done = r.order; if (r.order === 5) t5 = total; step = 'next'; if (r.order >= MAXORDER) break; }
        else { lossAt[r.order] = (lossAt[r.order] || 0) + 1; if (++losses >= RETRIES) break; step = 'retry'; }
      }
      const filled = await page.evaluate(() => window.__dbg.runFilled);
      results[i] = { done, filled, total, t5, lossAt };
    }
    await page.close();
  }));
  return results;
}
function reportRuns(name, rs) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const pct = n => `${Math.round(100 * n / rs.length)}%`;
  const losses = {};
  for (const r of rs) for (const [j, n] of Object.entries(r.lossAt)) losses[j] = (losses[j] || 0) + n;
  const r5 = rs.filter(r => r.t5 !== null);
  console.log(`${name.padEnd(11)} orders median ${med(rs.map(r => r.done))} | glasses ${med(rs.map(r => r.filled))}` +
    ` | play ${Math.round(med(rs.map(r => r.total)) / 6) / 10} min | done 5: ${pct(r5.length)} in ${Math.round(med(r5.map(r => r.t5)) / 6) / 10} min` +
    ` | losses by order ${Object.entries(losses).map(([j, n]) => `${j}:${n}`).join(' ')}`);
}

const runs = +process.argv[2] || 200;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
for (const kv of (process.argv[4] || '').split(/,(?![^\[]*\])/).filter(Boolean)) { const [k, v] = kv.split('='); overrides[k] = v; }
const file = buildDebug(overrides);
const browser = await chromium.launch();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  if (process.env.RUN) { reportRuns(n, await runRuns(BOTS[n], runs, file, browser)); continue; }
  const b = process.env.ORDER ? { ...BOTS[n], order: +process.env.ORDER } : BOTS[n];
  report(n, await run(b, runs, file, browser));
}
await browser.close();
