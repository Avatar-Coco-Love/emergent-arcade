// Headless balance bots for Loom.
//
// Usage: node scripts/balance-loom.mjs [runs=100] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-loom.mjs 100 reader,pinner SNAP=0.7,MAX_PINS=4
//
// Builds a debug copy of games/loom.html (state on window, seeded
// Math.random, no animation loop), then plays seeded runs (every shape, up
// to 3 tries each) in headless Chromium by calling step() directly. Prints
// one line per bot. Adapted from balance-hot-iron.mjs.
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/loom.html');

// Every bot works in human-like time: `gap` s of thinking between actions,
// `react` s late when easing off a pull, a finger that moves at `speed` px/s
// and lands within `aim` px (Gaussian) of where it means to. `rate` scales
// think time only.
//   pinner: pairs each dot with the nearest free knot, drags the finger
//     straight onto the dot and holds it there until the knot arrives, lets
//     go and taps the knot to pin it. Ignores tension (colours, pin rings).
//     Out of pins, it just pulls. Repeats for uncovered dots.
//   mapper: the pinner, but pairing dots with the reader's knots (knows the
//     plan, ignores tension).
//   straight: the pinner without pins (pulls knots onto dots and lets go).
//   novice: a first-time player. Its first `yanks` pulls are the pinner's
//     without the pin (drag it there, let go, watch it slide back), then it
//     plays as the mapper (Tablecloth shows corners go to corners).
//     novice-read plays as the reader instead.
//   reader: pairs each dot with the knot the design intends (the third
//     number of each dot: corners to corners), and plays by reading tension.
//     It keeps its finger `lead` px ahead of the knot (more, up to 3x, while
//     the knot won't move and nothing near it is hot), eases off when a strand
//     nears red (strain > `stopAt`) or any load ring (a pin's, or the pulled
//     knot's) turns red,
//     and after pinning, pulls any pin whose
//     ring is red back to the inner edge of its dot and re-pins it. Dots a taut edge already covers
//     are never pulled, so those need no pin.
//   no-rings / no-ease / yank: the reader without one of its tension reads
//     (ignores load rings / never eases off / finger far ahead).
//   inset-rule: no-rings, but always aims `inset` of DOT_R inside each dot
//     (a fixed rule instead of reading the rings).
//   idle: does nothing.
//   habit: the v1 trick played "blindfolded": the known plan on the first
//     four shapes, then greedy corners-first pairing, aiming inside each dot,
//     no rings, never easing off, blind to dyed knots. habit-dye sees dyes.
const HUMAN = { gap: 0.5, react: 0.25, speed: 350, aim: 3, lead: 6, stopAt: 0.45, inset: 0, rings: true, ring: true };
const BOTS = {
  reader: { ...HUMAN, policy: 'reader', rate: 1 },
  'reader-0.5x': { ...HUMAN, policy: 'reader', rate: 0.5 },
  'reader-2x': { ...HUMAN, policy: 'reader', rate: 2 },
  'slow-hands': { ...HUMAN, policy: 'reader', rate: 1, react: 0.5 },
  'no-rings': { ...HUMAN, policy: 'reader', rate: 1, rings: false, ring: false },
  'inset-rule': { ...HUMAN, policy: 'reader', rate: 1, rings: false, ring: false, inset: 0.5 },
  'no-ease': { ...HUMAN, policy: 'reader', rate: 1, stopAt: 9 },
  yank: { ...HUMAN, policy: 'reader', rate: 1, lead: 30 },
  pinner: { ...HUMAN, policy: 'pinner', rate: 1 },
  mapper: { ...HUMAN, policy: 'pinner', rate: 1, mapped: true },
  straight: { ...HUMAN, policy: 'pinner', rate: 1, nopins: true },
  novice: { ...HUMAN, policy: 'pinner', rate: 1, mapped: true, yanks: 3 },
  'novice-read': { ...HUMAN, policy: 'reader', rate: 1, yanks: 3 },
  idle: { ...HUMAN, policy: 'idle', rate: 1 },
  habit: { ...HUMAN, policy: 'pinner', rate: 1, corners: true, noDye: true, inset: 0.5, gentleHabit: true, habit: true, rings: false, ring: false, stopAt: 9 },
  'habit-dye': { ...HUMAN, policy: 'pinner', rate: 1, corners: true, inset: 0.5, gentleHabit: true, habit: true, rings: false, ring: false, stopAt: 9 },
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
    get state() { return state; }, get elapsed() { return elapsed; }, get knots() { return knots; },
    get level() { return level; }, get snaps() { return snaps; }, get pops() { return pops; },
    get pulls() { return pulls; }, get maxPins() { return maxPins; }, get runSnaps() { return runSnaps; },
    get grabbed() { return grabbed; }, get attempt() { return attempt; }, get shape() { return shape(); },
    strands, SHAPES, snapFrac, RING_RED, WARN, SNAP, PIN_HOLD, MAX_PINS, DOT_R, GRACE, REST,
    earned: unlocked, draw, get canvas() { return canvas; }, step, grab, setFinger, release, tapKnot, next, newRun, pinsIn, coveredBy,
  };
  newRun();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'loom-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot }) {
  const D = window.__dbg; // one run of every shape, up to 3 tries each
  window.__seed(seed);
  D.newRun();
  D.earned.clear();
  let s = seed * 7919;
  const rand = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const DT = 1 / 60, gap = bot.gap / bot.rate;
  const LEVEL_TIME = 240;
  const advance = t => { for (let k = 0; k < Math.round(t / DT) && D.state === 'playing'; k++) D.step(DT); };
  const K = () => D.knots;
  const dist = (k, d) => Math.hypot(k.x - d[0], k.y - d[1]);
  // Hottest strand near knot i (what a player watching the pull sees).
  const hottest = i => {
    let m = -1;
    const c = K()[i];
    for (const st of D.strands) {
      if (!st.alive) continue;
      const a = K()[st.a], b = K()[st.b];
      if (Math.hypot((a.x + b.x) / 2 - c.x, (a.y + b.y) / 2 - c.y) < 80) m = Math.max(m, D.snapFrac(st) * D.SNAP);
    }
    return m;
  };
  let yanks = bot.yanks || 0;

  // Drag knot i toward (tx, ty). gentle: keep the finger at most `lead` px
  // ahead of the knot and ease off (after react) once any strand is hot.
  function pull(i, tx, ty, gentle, exact) {
    D.grab(i);
    let aimX = tx + gauss() * bot.aim, aimY = ty + gauss() * bot.aim;
    if (gentle && !exact) {
      // Only as far as the near edge of the dot: less stretch, less load.
      const c = K().reduce((a, q) => [a[0] + q.x / K().length, a[1] + q.y / K().length], [0, 0]);
      const dx = c[0] - tx, dy = c[1] - ty, d = Math.hypot(dx, dy) || 1;
      aimX += dx / d * bot.inset * D.DOT_R; aimY += dy / d * bot.inset * D.DOT_R;
    }
    let fx = K()[i].x, fy = K()[i].y, t = 0, hotFor = 0, stuck = 0, lastX = fx, lastY = fy, lead = bot.lead;
    while (D.state === 'playing' && t < 6) {
      const k = K()[i];
      let gx = aimX, gy = aimY;
      if (gentle) {
        const red = q => q.load > D.RING_RED * D.PIN_HOLD;
        const hot = !exact && (hottest(i) > bot.stopAt || (bot.ring && (red(k) || K().some(q => q.pinned && red(q)))));
        hotFor = hot ? hotFor + DT : 0;
        if (hotFor > bot.react) break; // it's as far as it will go
        const dx = aimX - k.x, dy = aimY - k.y, d = Math.hypot(dx, dy);
        // Pull harder while the knot won't move and nothing looks hot.
        const moving = Math.hypot(k.x - lastX, k.y - lastY) > 0.3;
        lead = moving || hottest(i) > D.WARN ? Math.max(bot.lead, lead - 20 * DT) : Math.min(3 * bot.lead, lead + 20 * DT);
        if (d > lead) { gx = k.x + dx / d * lead; gy = k.y + dy / d * lead; }
      }
      const mx = gx - fx, my = gy - fy, md = Math.hypot(mx, my), stepLen = bot.speed * DT;
      if (md > stepLen) { fx += mx / md * stepLen; fy += my / md * stepLen; } else { fx = gx; fy = gy; }
      D.setFinger(fx, fy);
      D.step(DT); t += DT;
      if (Math.hypot(k.x - aimX, k.y - aimY) < 3) break;
      if (fx === gx && fy === gy && Math.hypot(k.x - gx, k.y - gy) > 0) {
        stuck = Math.hypot(k.x - lastX, k.y - lastY) < 0.02 ? stuck + DT : 0; // knot won't come any further
        if (stuck > 0.5) break;
      }
      lastX = k.x; lastY = k.y;
    }
    if (gentle && D.state === 'playing') advance(Math.min(bot.react, 0.1));
    D.release();
  }

  // Greedy pairing: closest dot-knot pairs first.
  function pairs(dots) {
    const ks = K(), out = new Map(), used = new Set(), cand = [];
    // Dyed dots take their own knot (unless the bot ignores dye); corners
    // first for the habit bot, which plays every shape like the first four.
    if (!bot.noDye) dots.forEach((d, j) => { if (d[3] === 'dye') { out.set(j, d[2]); used.add(d[2]); } });
    const corners = [0, 5, 30, 35];
    dots.forEach((d, j) => ks.forEach((k, i) => cand.push([dist(k, d) - (bot.corners && corners.includes(i) ? 1000 : 0), j, i])));
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, j, i] of cand) if (!out.has(j) && !used.has(i)) { out.set(j, i); used.add(i); }
    return out;
  }

  function playShape() {
    const dots = D.shape.dots;
    const known = bot.policy === 'reader' || bot.mapped || (bot.habit && D.level < 4);
    const plan = known ? new Map(dots.map((d, j) => [j, d[2]])) : pairs(dots);
    advance(gap);
    while (D.state === 'playing' && D.elapsed < LEVEL_TIME) {
      if (bot.policy === 'idle') { advance(1); continue; }
      // Next uncovered dot, in order.
      let j = -1;
      for (let q = 0; q < dots.length; q++) if (!D.coveredBy(dots[q])) { j = q; break; }
      if (j < 0) { advance(0.25); continue; }
      const i = plan.get(j);
      const k = K()[i];
      pull(i, dots[j][0], dots[j][1], bot.policy === 'reader' || bot.gentleHabit);
      if (yanks > 0) { yanks--; advance(D.GRACE + 1 + gap); continue; }
      advance(gap * 0.4);
      if (!bot.nopins && !K()[i].pinned && D.pinsIn() < D.MAX_PINS) D.tapKnot(i);
      advance(gap);
      if (bot.policy === 'reader' && bot.rings) {
        // A red ring: pull that pin back to the inner edge of its dot (toward
        // the middle of the net) and pin it again.
        for (let n = 0; n < 4 && D.state === 'playing'; n++) {
          const q = K().findIndex(p => p.pinned && p.load > 0.8 * D.PIN_HOLD);
          if (q < 0) break;
          const dj = [...plan].find(([, v]) => v === q);
          if (!dj) break;
          const d = dots[dj[0]];
          const c = K().reduce((a, p) => [a[0] + p.x / K().length, a[1] + p.y / K().length], [0, 0]);
          const dx = c[0] - d[0], dy = c[1] - d[1], m = Math.hypot(dx, dy) || 1;
          pull(q, d[0] + dx / m * 0.7 * D.DOT_R, d[1] + dy / m * 0.7 * D.DOT_R, true, true);
          advance(gap * 0.4);
          D.tapKnot(q);
          advance(gap);
        }
      }
    }
  }

  const shapes = [];
  const NS = D.SHAPES.length;
  for (let lv = 0; lv < NS; lv++) {
    let won = false, tries = 0, time = 0, snaps = 0, pops = 0, pins = 0, pulls = 0;
    while (!won && tries < 3) {
      tries++;
      playShape();
      won = D.state === 'won';
      time += D.elapsed; snaps += D.snaps; pops += D.pops; pulls += D.pulls; pins = D.maxPins;
      if (!won && D.state === 'playing') { tries = 99; break; } // timed out
      if (!won && tries < 3) D.next();
    }
    shapes.push({ won, first: won && tries === 1, tries, time, snaps, pops, pins, pulls });
    if (!won) break;
    D.next();
  }
  return { shapes, run: shapes.length === NS && shapes[NS - 1].won, earned: [...D.earned] };
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
  const per = [...Array(NSHAPES).keys()].map(lv => {
    const g = rs.map(r => r.shapes[lv]).filter(Boolean);
    const w = g.filter(x => x.won);
    const first = g.length ? Math.round(100 * g.filter(x => x.first).length / g.length) : '-';
    return `${first}%/${g.length ? Math.round(100 * w.length / g.length) : '-'}% ${Math.round(med(w.map(x => x.time)))}s` +
      ` s${med(g.map(x => x.snaps))} p${med(g.map(x => x.pops))} pin${med(w.map(x => x.pins))}`;
  }).join(' | ');
  console.log(`${name.padEnd(11)} run ${pct(rs.filter(r => r.run).length).padStart(4)} | shape 1st/any: ${per} | ${achs}`);
}

const runs = +process.argv[2] || 100;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
for (const kv of (process.argv[4] || '').split(/,(?![^\[]*\])/).filter(Boolean)) { const [k, v] = kv.split('='); overrides[k] = v; }
const file = buildDebug(overrides);
const browser = await chromium.launch();
const NSHAPES = await (async () => { const pg = await browser.newPage(); await pg.goto(pathToFileURL(file).href);
  const n = await pg.evaluate(() => window.__dbg.SHAPES.length); await pg.close(); return n; })();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS[n], runs, file, browser));
}
await browser.close();
