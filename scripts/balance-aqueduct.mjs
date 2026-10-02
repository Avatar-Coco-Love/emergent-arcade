// Headless bots for the Aqueduct prototype (prototypes/aqueduct.html).
//
// Usage: LEVEL=1 node scripts/balance-aqueduct.mjs [runs=10] [bot,bot,...] [DEPTH=14,BEAM=10]
//   LEVEL picks the level (index into LEVELS, default 1). TRACE=1 prints the planner's chosen
//   actions [angle, valve bits]. PLAN_RUNS caps planner runs (default 5). Score = degrees + 30 per tap.
//
// The prototype exposes window.__dbg (seeded rng, step(dt), snapshot/restore),
// so no source patching is needed. Each run is one seeded vessel (seed only
// jitters the particle lattice); a run is lost after LIMIT seconds. One line
// per bot. Needs Playwright (installed globally in Claude Code cloud sessions).
//   idle: never turns.
//   sweeper: rotates at a constant 90°/s.
//   novice: every 0.7 s picks a random angle within ±120° of upright.
//   greedy: points gravity from the bead toward the exit, ignores the vial.
//   keys: PC player model: holds ← or → for 1.2 s, then switches, fixed pattern
//     (no look-ahead). Shows what quantized/ramped turning alone achieves.
//   planner: beam search over (turn to ±k·30°, hold 1 s) actions by rolling the
//     sim forward from snapshots, scoring the bead's path distance to the exit
//     (BFS over the vessel's free space). Open-loop; the plan is then replayed.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  const root = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(pathToFileURL(path.join(root, 'playwright/index.mjs'))));
}
const SRC = process.env.SRC || path.join(path.dirname(fileURLToPath(import.meta.url)), '../prototypes/aqueduct.html');   // SRC: try a scratch copy
const LIMIT = 45;

function playInPage({ seed, bot, search, lv }) {
  const D = window.__dbg;
  window.__start(seed, lv);
  const NV = D.cups.length, bits = () => D.valves.reduce((t, v, k) => t | (v ? 1 << k : 0), 0);
  const setBits = b => { for (let k = 0; k < NV; k++) D.setValve(b >> k & 1, k); };
  const dt = 1 / 60;
  const finish = (extra = {}) => ({ won: D.state === 'won', t: D.elapsed, score: D.score, ...extra });
  let turned = 0;
  const turnTo = a => { D.setTarget(a); };
  function drive(fn) {
    let prev = D.angle, tick = 0;
    while (D.state === 'playing' && D.elapsed < LIMIT_) {
      fn(tick++);
      D.step(dt);
      turned += Math.abs(D.angle - prev); prev = D.angle;
    }
    return finish({ turned: Math.round(turned) });
  }
  const LIMIT_ = window.__LIMIT;
  if (bot === 'idle') return drive(() => {});
  if (bot === 'sweeper') return drive(() => D.setAngle(D.angle + 90 * dt));
  if (bot === 'novice') {
    let s = seed * 7919 + 13;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    return drive(k => { if (k % 42 === 0) { turnTo((r() * 2 - 1) * 120); const u = r(); if (u < 0.3 && NV) { const j = Math.floor(u / 0.3 * NV); D.setValve(!D.valves[j], j); } } });
  }
  if (bot === 'timer') {   // toggles the valve every 2 s, turns at random: shows the valve must be read, not run on a clock
    let s = seed * 104729 + 7; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    return drive(k => { if (k % 42 === 0) turnTo((r() * 2 - 1) * 120); if (k % 120 === 0 && NV) { const j = (k / 120) % NV; D.setValve(!D.valves[j], j); } });
  }
  if (bot === 'greedy') return drive(k => {   // turns so gravity points from the bead toward the exit; never looks at the vial
    if (k % 12 === 0) { const dx = D.EXIT.x - D.bead.x, dy = D.EXIT.y - D.bead.y; D.setTarget(Math.atan2(dx, dy) * 180 / Math.PI); } });
  if (bot === 'keys') return drive(k => { const ph = Math.floor(k / 72) % 4; D.setKey(ph === 0 ? 1 : ph === 2 ? -1 : 0); });
  // planner
  const SH = D.SHAPES, CELL = 4, X0 = -200, Y0 = -100, GW = 100, GH = 80;
  const dist = new Float32Array(GW * GH).fill(1e9);
  const free = (cx, cy) => D.sdf(X0 + cx * CELL, Y0 + cy * CELL) < -D.BEAD_R;
  const q = [];
  const ex = Math.round((D.EXIT.x - X0) / CELL), ey = Math.round((D.EXIT.y - Y0) / CELL);
  dist[ey * GW + ex] = 0; q.push(ex, ey);
  for (let h = 0; h < q.length; h += 2) {
    const cx = q[h], cy = q[h + 1], d = dist[cy * GW + cx];
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + ox, ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || dist[ny * GW + nx] < 1e8 || !free(nx, ny)) continue;
      dist[ny * GW + nx] = d + 1; q.push(nx, ny);
    }
  }
  const geo = () => {
    const cx = Math.round((D.bead.x - X0) / CELL), cy = Math.round((D.bead.y - Y0) / CELL);
    return dist[cy * GW + cx] < 1e8 ? dist[cy * GW + cx] : 200;
  };
  const HOLD = 60, useValve = bot === 'planner';   // planner-nv: same search, valve never touched
  const OPTS = [0]; for (let k = 1; k <= 6; k++) OPTS.push(30 * k, -30 * k);
  function roll(s, a, v) {        // apply one action from snapshot s; returns {snap, score, won}
    D.restore(s);
    D.setTarget(a); setBits(v);
    let best = 1e9;
    for (let k = 0; k < HOLD && D.state === 'playing'; k++) { D.step(dt); if (k % 10 === 9) best = Math.min(best, geo()); }
    const g = geo(); best = Math.min(best, g);
    let vs = 0;
    D.cups.forEach((c, k) => { const f = D.fill[k], e = f < c.band[0] ? c.band[0] - f : f > c.band[1] ? f - c.band[1] : 0;
      vs += 80 * e - (D.valves[k] && e === 0 ? 25 : 0); });
    return { snap: D.snap(), score: g + 0.5 * best + vs - (D.doorOpen && NV ? 20 : 0) + (D.state === 'won' ? -1000 : 0), won: D.state === 'won', a, v };
  }
  let beam = [{ snap: D.snap(), score: geo(), plan: [] }], found = null, expanded = 0;
  for (let depth = 0; depth < search.DEPTH && !found; depth++) {
    const next = [], seen = new Set();
    for (const node of beam) {
      const base = node.snap.angle, cur = node.plan.length ? node.plan[node.plan.length - 1][1] : 0;
      const VOPTS = useValve ? [cur, ...Array.from({ length: NV }, (_, k) => cur ^ 1 << k)] : [0];   // keep, or flip one valve
      for (const v of VOPTS) for (const o of OPTS) {
        const a = base + o; if (Math.abs(a) > 540) continue;
        const r = roll(node.snap, a, v); expanded++;
        const key = `${Math.round(r.snap.angle / 30)}|${Math.round(r.snap.b.x / 8)}|${Math.round(r.snap.b.y / 8)}|${v}|${D.fill.map(f => Math.round(f * 20)).join(',')}`;
        if (seen.has(key)) continue; seen.add(key);
        const n = { snap: r.snap, score: r.score, plan: [...node.plan, [a, v]] };
        if (r.won) { found = n; break; }
        next.push(n);
      }
      if (found) break;
    }
    next.sort((x, y) => x.score - y.score);
    beam = next.slice(0, search.BEAM);
  }
  const plan = found ? found.plan : beam.length ? beam[0].plan : [];
  // replay open-loop from the start state to confirm it wins for real
  window.__start(seed, lv); turned = 0;
  const res = drive(t => { if (t % HOLD === 0) { const m = plan[(t / HOLD) | 0]; if (m !== undefined) { D.setTarget(m[0]); setBits(m[1]); } } });
  return { ...res, plan, expanded, found: !!found };
}

const LV = process.env.LEVEL === undefined ? 1 : +process.env.LEVEL;
async function run(bot, runs, browser, search) {
  const page = await browser.newPage({ viewport: { width: 390, height: 740 } });
  await page.addInitScript(l => { window.__LIMIT = l; }, LIMIT);
  if (process.env.EXIT) { const [x, y] = process.env.EXIT.split(',').map(Number); await page.addInitScript(e => { window.__EXIT = e; }, { x, y }); }
  await page.goto(pathToFileURL(SRC).href + '?nostart');
  const out = [];
  for (let i = 0; i < runs; i++) out.push(await page.evaluate(playInPage, { seed: 1000 + i, bot, search, lv: LV }));
  await page.close();
  return out;
}

const BOTS = (process.argv[3] || 'idle,sweeper,greedy,novice,timer,keys,planner,planner-nv').split(',');
const runsArg = +process.argv[2] || 10;
const search = { DEPTH: 14, BEAM: 10 };
for (const kv of (process.argv[4] || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); search[k] = +v; }
const browser = await chromium.launch();
for (const bot of BOTS) {
  const runs = bot.startsWith('planner') ? Math.min(runsArg, +process.env.PLAN_RUNS || 5) : runsArg;
  const t0 = Date.now();
  const rs = await run(bot, runs, browser, search);
  const wins = rs.filter(r => r.won), med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  console.log(`${bot.padEnd(8)} win ${String(Math.round(100 * wins.length / rs.length)).padStart(3)}% (${wins.length}/${rs.length})` +
    ` | median win ${wins.length ? med(wins.map(r => r.t)).toFixed(1) + 's, score ' + med(wins.map(r => r.score)) : '-'} | turned ${med(rs.map(r => r.turned))}°` +
    (bot.startsWith('planner') ? ` | plan ${med(rs.map(r => r.plan.length))} moves, ${med(rs.map(r => r.expanded))} rollouts` : '') + ` | ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (process.env.TRACE && bot.startsWith('planner')) console.log('  plan', rs[0].plan.join(' '));
}
await browser.close();
