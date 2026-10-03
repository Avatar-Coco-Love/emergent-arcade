// Headless balance bots for Mycelium.
//
// Usage: node scripts/balance-mycelium.mjs [runs=100] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-mycelium.mjs 100 skilled,timer UPKEEP=0.06,PULSE=12
//   RETRIES=n: tries per season after the first (default 2); ACT=s: planning bots'
//   seconds between actions (default 0.5, sweep it to check speed doesn't win).
//   dbg:<bot> prints one line per season played by that bot.
//
// Builds a debug copy of games/mycelium.html (state on window, seeded
// Math.random, no animation loop), then plays seeded runs in headless
// Chromium by calling step() directly. A run goes season after season
// (campaign of 8, then endless) until a season is lost RETRIES + 1 times,
// or 30 seasons. Needs Playwright (installed globally in Claude Code cloud sessions).
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/mycelium.html');

// Bots:
//   idle: no input.
//   greedy: grow-first. Grows to the nearest patch whenever the pool pays for a
//     knot, then explores 2-3 knots out whenever it pays for two; pulses to fruit
//     only from a pool of 20+. Never cuts, never rescues. Should starve.
//   timer: skilled growth and cutting, but pulses on a clock (every 1.5 s,
//     round robin over patches and tips) without reading the pool or the sap.
//   skilled: reads the pool and the sap: keeps a reserve worth 8 s of upkeep,
//     pulses a fading branch through the patch beyond it, cuts branches with
//     nothing left to feed on and rivals near food, fruits from the surplus.
//   noprune: skilled that never cuts (its own threads or rivals).
//   novice: a first-time player. Reads for 4 s, then acts every 1.5-3 s:
//     drags toward patches (15% end next to one), pulses joined patches (1 in 5
//     pulses a random knot instead), 1 in 10
//     taps held too long (cuts that knot). Cuts dead branches and rivals only
//     from season 4, and only now and then.
const BOTS = {
  idle: {},
  greedy: { greedy: true },
  timer: { plan: true, prune: true, timer: true },
  skilled: { plan: true, prune: true, read: true },
  noprune: { plan: true, read: true },
  novice: { novice: true },
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
  const tail = '  newRun();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get P() { return P; }, get N() { return N; }, get core() { return core; }, get own() { return own; },
    get par() { return par; }, get sap() { return sap; }, get rot() { return rot; }, get conn() { return conn; }, get dc() { return dc; },
    get dh() { return dh; }, get dry() { return dry; }, get patchAt() { return patchAt; }, get rpar() { return rpar; },
    get rown() { return rown; }, get fx() { return fx; }, get patches() { return patches; }, get rivals() { return rivals; }, get jobs() { return jobs; },
    get pool() { return pool; }, get t() { return t; }, get spec() { return spec; }, get endT() { return endT; }, get season() { return season; },
    get state() { return state; }, get mushrooms() { return mushrooms; }, get total() { return total; }, get st() { return st; },
    earned: runEarned, K, PULSE, FRUIT, GROW_C, GROW_V, INCOME, SAPN,
    upkeepRate, route, grow, pulse, prune, step, setPool: v => { pool = v; }, newRun, nextSeason, retrySeason, topo, subtree, pathToCore,
  };
  newRun();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'myc-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page once: regression checks. Returns a list of failures.
function selfTest() {
  const D = window.__dbg, bad = [];
  const state = () => JSON.stringify([...D.own, ...D.par, ...D.rot, ...D.dry, ...D.patchAt, ...D.rown, ...D.rpar, ...Array.from(D.sap, x => x.toFixed(3))]) +
    JSON.stringify(D.patches) + JSON.stringify(D.rivals);
  // 1. A retry restores the season-start state (rivals, rot, dry soil, late patches) and leaves nothing over.
  for (const target of [5, 6, 7, 8, 11]) {
    window.__seed(7 + target); D.newRun();
    while (D.season < target) D.nextSeason();
    const s0 = state(), pool0 = D.pool;
    let n = 0;
    while (D.state === 'playing') {
      if (n++ % 30 === 0) {
        const mine = []; for (let i = 0; i < D.N; i++) if (D.own[i] === 1 && D.conn[i]) mine.push(i);
        const a = mine[Math.floor(Math.random() * mine.length)], b = Math.floor(Math.random() * D.N);
        if (Math.random() < 0.6) D.grow(a, b); else if (Math.random() < 0.5) D.pulse(a); else D.prune(a);
        for (let i = 0; i < D.N; i++) if (D.own[i] === 2 && D.rpar[i] >= 0 && Math.random() < 0.1) { D.prune(i); break; }
      }
      D.step(1 / 60);
    }
    if (D.state !== 'lost') { bad.push(`retry s${target}: season not lost`); continue; }
    D.retrySeason();
    if (state() !== s0) bad.push(`retry s${target}: state differs from season start`);
    if (Math.abs(D.pool - Math.min(150, pool0 + 15)) > 1e-6) bad.push(`retry s${target}: pool ${D.pool} vs ${pool0}+15`);
    if (D.jobs.length || D.fx.length || D.t !== 0 || D.mushrooms !== 0) bad.push(`retry s${target}: leftovers`);
  }
  // 2. Growing into a stranded knot reverses its branch, side branches included.
  window.__seed(3); D.newRun(); D.setPool(150);
  const far = []; for (let i = 0; i < D.N; i++) { const r = D.route(D.core, i); if (r && r.length === 5) far.push(r); }
  const r0 = far[0];
  D.grow(D.core, r0[4]);
  for (let k = 0; k < 300 && D.jobs.length; k++) D.step(1 / 60);
  const side = D.P[r0[2]].nb.find(v => D.own[v] === 0 && D.route(r0[2], v));
  D.grow(r0[2], side);
  for (let k = 0; k < 300 && D.jobs.length; k++) D.step(1 / 60);
  D.prune(r0[1]);
  const before = D.own.filter(x => x === 1).length;
  // Re-enter at the tip from another knot (the spore's other side).
  let re = null;
  for (let i = 0; i < D.N; i++) if (D.own[i] === 1 && D.conn[i]) { const r = D.route(i, r0[4]); if (r && (!re || r.length < re.length)) re = r; }
  D.setPool(150); D.grow(re[0], r0[4]);
  for (let k = 0; k < 600 && D.jobs.length; k++) D.step(1 / 60);
  D.topo();
  for (let i = 0; i < D.N; i++) if (D.own[i] === 1) {
    if (!D.conn[i]) bad.push(`reconnect: knot ${i} still stranded`);
    let a = i, n = 0; while (a >= 0 && n++ < 400) a = D.par[a];
    if (n >= 400) bad.push(`reconnect: cycle at ${i}`);
  }
  if (D.own[side] !== 1 || D.par[side] !== r0[2]) bad.push('reconnect: side branch lost');
  if (D.own.filter(x => x === 1).length !== before + re.length - 2) bad.push('reconnect: knot count');
  return bad;
}

// Runs inside the page: one whole run.
function playInPage({ seed, bot, retries, act }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newRun();
  const rnd = Math.random, dt = 1 / 60;
  const seasons = [];
  let runT = 0, firstLossT = -1, firstLossS = 0, sawAll = -1;

  // Multi-source BFS from my connected knots through open soil: distance and parent.
  function reach() {
    const N = D.N, P = D.P, own = D.own, conn = D.conn;
    const d = new Int16Array(N).fill(99), from = new Int16Array(N).fill(-1), q = [];
    for (let i = 0; i < N; i++) if (own[i] === 1 && conn[i]) { d[i] = 0; from[i] = i; q.push(i); }
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      for (const v of P[u].nb) if (d[v] === 99 && own[v] === 0) { d[v] = d[u] + 1; from[v] = from[u]; q.push(v); }
    }
    return { d, from };
  }
  const hasFood = p => p.on && p.food > 0;
  function valueIn(sub) {
    const set = new Set(sub);
    for (const p of D.patches) if (set.has(p.i) && p.on && (p.food > 0 || D.dc[p.i] <= D.K + 1)) return true;
    for (const j of D.jobs) if (set.has(j.path[j.k - 1])) return true;
    return false;
  }
  function fruitSite() {
    let b = -1, bc = 1e9;
    for (const p of D.patches) {
      if (!p.on || D.own[p.i] !== 1 || !D.conn[p.i]) continue;
      let cost = 0;
      for (const a of D.pathToCore(p.i)) if (a !== D.core) cost += (1 - D.sap[a]) * D.SAPN;
      cost += D.dc[p.i] * 0.05;
      if (cost < bc) { bc = cost; b = p.i; }
    }
    return b;
  }
  function cutRivals() {
    const own = D.own, rpar = D.rpar, rown = D.rown;
    for (let r = 0; r < D.rivals.length; r++) {
      let threat = false;
      const R = new Set();
      for (let i = 0; i < D.N; i++) if (own[i] === 2 && rown[i] === r) R.add(i);
      for (const p of D.patches) {
        if (!hasFood(p)) continue;
        if (R.has(p.i)) threat = true;
        else if (own[p.i] === 0) for (const v of D.P[p.i].nb) { if (R.has(v)) threat = true; for (const w of D.P[v].nb) if (R.has(w)) threat = true; }
      }
      if (!threat) continue;
      const root = D.rivals[r].root;
      for (let i = 0; i < D.N; i++) if (own[i] === 2 && rpar[i] === root) { D.prune(i); return true; }
    }
    return false;
  }
  function cutRot() {
    for (let i = 0; i < D.N; i++) if (D.own[i] === 1 && D.rot[i] && D.conn[i]) { D.prune(i); return true; }
    return false;
  }
  function pruneDead() {
    D.topo();
    const own = D.own, conn = D.conn, par = D.par;
    for (let i = 0; i < D.N; i++) {
      if (own[i] !== 1 || !conn[i] || i === D.core) continue;
      if (valueIn(D.subtree(i))) continue;
      const p = par[i];
      if (p === D.core || valueIn(D.subtree(p))) { D.prune(i); return true; }
    }
    return false;
  }
  function rescue() {
    D.topo();
    const own = D.own, conn = D.conn, sap = D.sap;
    let worst = -1, ws = 0.45;
    for (let i = 0; i < D.N; i++) if (own[i] === 1 && conn[i] && i !== D.core && sap[i] < ws && D.dh[i] > D.K) {
      if (!valueIn(D.subtree(i))) continue;
      ws = sap[i]; worst = i;
    }
    if (worst < 0) return false;
    const sub = D.subtree(worst);
    // Pulse through the branch to a patch beyond the fading knot (what's left fruits there), else to the growing tip.
    let tgt = -1;
    for (const p of D.patches) if (p.on && sub.includes(p.i)) { tgt = p.i; if (p.food > 0) break; }
    if (tgt < 0) tgt = sub[sub.length - 1];
    return D.pulse(tgt);
  }
  function planGrow(minPool) {
    if (D.jobs.length > 1) return false;
    const { d, from } = reach();
    let best = null, bs = 0;
    const left = D.endT - D.t;
    for (const p of D.patches) {
      if (!hasFood(p) || D.own[p.i] !== 0 || d[p.i] === 99 || D.jobs.some(j => j.path[j.path.length - 1] === p.i)) continue;
      const len = d[p.i], cost = len * D.GROW_C;
      const gain = Math.min(p.food, p.inc * (left - len / D.GROW_V - 2));
      if (gain < cost + 8) continue;
      const s = (gain - cost) / (len + 2);
      if (s > bs) { bs = s; best = { p, len, cost }; }
    }
    if (!best || D.pool < best.cost + minPool) return false;
    return D.grow(from[best.p.i], best.p.i);
  }

  for (let s = 0; s < 30; s++) {
    let tries = 0;
    for (;;) {
      let nextAct = 0, nextTimer = 0, rr = 0, tick = 0;
      let novNext = D.season === 1 && tries === 0 ? 4 : 2;
      while (D.state === 'playing') {
        if (tick++ % 6 === 0 && D.t >= nextAct) {
          let did = false;
          const reserve = D.upkeepRate() * 6 + 3;
          const endgame = D.t > D.endT - 7 && D.mushrooms < D.spec.goal;
          if (bot.plan) {
            if (bot.prune && !did) did = cutRot();
            if (bot.prune && !did) did = cutRivals();
            if (bot.read && !did && D.pool >= 3) did = rescue();
            if (bot.prune && !did) did = pruneDead();
            if (!did) did = planGrow(2);
            if (bot.read && !did && D.pool >= (endgame ? 1 : reserve + D.PULSE)) {
              const f = fruitSite();
              if (f >= 0) did = D.pulse(f);
            }
            if (bot.timer && D.t >= nextTimer) {
              nextTimer = D.t + 1.5;
              const tg = [];
              for (const p of D.patches) if (p.on && D.own[p.i] === 1 && D.conn[p.i]) tg.push(p.i);
              for (let i = 0; i < D.N; i++) if (D.own[i] === 1 && D.conn[i] && i !== D.core && !D.par.some((q, j) => q === i && D.own[j] === 1)) tg.push(i);
              if (tg.length) { D.pulse(tg[rr++ % tg.length]); did = true; }
            }
            if (did) nextAct = D.t + act;
          } else if (bot.greedy) {
            if (!D.jobs.length) {
              const { d, from } = reach();
              let b = -1, bd = 99;
              for (const p of D.patches) if (hasFood(p) && D.own[p.i] === 0 && d[p.i] < bd) { bd = d[p.i]; b = p.i; }
              if (b >= 0 && D.pool >= D.GROW_C) did = D.grow(from[b], b);
              else if (D.pool >= 20 && fruitSite() >= 0) did = D.pulse(fruitSite());
              else if (b < 0 && D.pool >= 2 * D.GROW_C) {
                const c = []; for (let i = 0; i < D.N; i++) if (d[i] >= 2 && d[i] <= 3) c.push(i);
                if (c.length) { const i = c[Math.floor(rnd() * c.length)]; did = D.grow(from[i], i); }
              }
            }
            if (did) nextAct = D.t + act;
          } else if (bot.novice && D.t >= novNext) {
            novNext = D.t + 1.5 + 1.5 * rnd();
            const late = D.season >= 4;
            const targets = D.patches.filter(p => hasFood(p) && D.own[p.i] === 0);
            if (late && rnd() < 0.5 && D.rivals.length && cutRivals()) { /* reacted to a rival */ }
            else if (rnd() < (late ? 0.6 : 0.3) && cutRot()) { /* saw the rot, late */ }
            else if (late && rnd() < 0.3 && pruneDead()) { /* cut a dead branch */ }
            else if (targets.length && !D.jobs.length && rnd() < 0.55) {
              const p = targets[Math.floor(rnd() * targets.length)];
              let to = p.i;
              if (rnd() < 0.15) { const nb = D.P[p.i].nb.filter(v => D.own[v] === 0); if (nb.length) to = nb[Math.floor(rnd() * nb.length)]; }
              const mine = [];
              for (let i = 0; i < D.N; i++) if (D.own[i] === 1 && D.conn[i]) mine.push(i);
              mine.sort((a, b) => Math.hypot(D.P[a].x - D.P[to].x, D.P[a].y - D.P[to].y) - Math.hypot(D.P[b].x - D.P[to].x, D.P[b].y - D.P[to].y));
              D.grow(mine[Math.floor(rnd() * Math.min(3, mine.length))], to);
            } else if (D.pool >= 3) {
              const sites = D.patches.filter(p => p.on && D.own[p.i] === 1 && D.conn[p.i]).map(p => p.i);
              const mine = [];
              for (let i = 0; i < D.N; i++) if (D.own[i] === 1 && D.conn[i] && i !== D.core) mine.push(i);
              // Pulses a patch it's joined to; with none joined, now and then a knot just to see.
              const pick = sites.length && rnd() < 0.8 ? sites[Math.floor(rnd() * sites.length)] : rnd() < (sites.length ? 1 : 0.3) ? mine[Math.floor(rnd() * mine.length)] : null;
              if (pick != null) { if (rnd() < 0.1) D.prune(pick); else D.pulse(pick); }
            }
          }
        }
        D.step(dt);
        runT += dt;
      }
      if (bot.dbg) console.log(seed, D.season, D.mushrooms + "/" + D.spec.goal, "pool", Math.round(D.pool), "grown", D.st.grown, "pulses", D.st.pulses, "starved", D.st.starved, "hungry", Math.round(D.st.hungryS), "cuts", D.st.pruned, "spill", Math.round(D.st.spilled), "t", Math.round(D.t), "knots", D.own.filter(x => x === 1).length, "upk", D.upkeepRate().toFixed(2), "p", D.patches.map(p => [D.own[p.i], Math.round(p.food), p.caps].join(":")).join(" "));
      const won = D.state === 'season';
      seasons.push({ s: D.season, won, fruit: D.mushrooms, goal: D.spec.goal, starved: D.st.starved, rotted: D.st.rotted, withered: D.st.withered, hungry: D.st.hungryS,
        pulses: D.st.pulses, spilled: D.st.spilled, pruned: D.st.pruned, try: tries });
      if (!won && firstLossT < 0) { firstLossT = runT; firstLossS = D.season; }
      if (won) break;
      if (++tries > retries) return { seasons, runT, firstLossT, firstLossS, last: D.season, score: D.total, sawAll, earned: [...D.earned] };
      D.retrySeason();
    }
    if (D.season === 8 && sawAll < 0) sawAll = runT;
    D.nextSeason();
  }
  return { seasons, runT, firstLossT: firstLossT < 0 ? runT : firstLossT, firstLossS, last: D.season, score: D.total, sawAll, earned: [...D.earned], capped: true };
}

async function run(bot, runs, file, browser, opts, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    page.on('console', m => console.log(m.text())); page.on('pageerror', e => console.log('ERR', e.message));
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot, ...opts }); }
    await page.close();
  }));
  return results;
}

// One line per bot: % of runs that won each of seasons 1-8 (first try or after
// retries), median seasons won, median minutes per run (to the last loss) and to
// the first loss, % that won season 8 and the median minutes to get there, median
// score, then per-season-won medians (starved knots, s hungry, pulses, spilled,
// cuts) and achievements.
function report(name, rs) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const pct = (n, d) => d ? Math.round(100 * n / d) : 0;
  const won = s => pct(rs.filter(r => r.seasons.some(x => x.s === s && x.won)).length, rs.length);
  const all = rs.flatMap(r => r.seasons);
  const m = k => Math.round(med(all.map(x => x[k])) * 10) / 10;
  const saw = rs.filter(r => r.sawAll >= 0);
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  const achs = Object.entries(ach).sort().map(([k, v]) => `${k} ${pct(v, rs.length)}%`).join(', ');
  const mins = x => (x / 60).toFixed(1);
  console.log(`${name.padEnd(8)} won s1-8 ${[1, 2, 3, 4, 5, 6, 7, 8].map(won).join('/')}% | seasons ${med(rs.map(r => r.last - 1))}` +
    ` | run ${mins(med(rs.map(r => r.runT)))} min, 1st loss ${mins(med(rs.map(r => r.firstLossT)))} min (s${med(rs.map(r => r.firstLossS))})` +
    ` | s8 by ${saw.length ? mins(med(saw.map(r => r.sawAll))) : '-'} min | score ${med(rs.map(r => r.score))} max ${Math.max(...rs.map(r => r.score))}` +
    ` | per season: starved ${m('starved')} rot ${m('rotted')} wither ${m('withered')} hungry ${m('hungry')}s pulses ${m('pulses')} spilled ${m('spilled')} cuts ${m('pruned')}` +
    `${rs.some(r => r.capped) ? ' | CAPPED ' + pct(rs.filter(r => r.capped).length, rs.length) + '%' : ''} || ${achs}`);
}

const runs = +process.argv[2] || 100;
const BOTS_ALL = { ...BOTS, dbg: { plan: true, prune: true, read: true, dbg: true } };
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
const opts = { retries: 2, act: 0.5 };
for (const kv of (process.argv[4] || '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  if (k === 'RETRIES') opts.retries = +v; else if (k === 'ACT') opts.act = +v; else overrides[k] = v;
}
const file = buildDebug(overrides);
const browser = await chromium.launch();
{
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto(pathToFileURL(file).href);
  const bad = await page.evaluate(selfTest);
  console.log(bad.length ? 'SELFTEST FAIL ' + bad.join('; ') : 'selftest ok (retry restores seasons 5-8, 11; reconnect reverses a branch)');
  await page.close();
}
for (const n of names) {
  if (n.startsWith('dbg:')) { report(n, await run({ ...BOTS[n.slice(4)], dbg: true }, runs, file, browser, opts)); continue; }
  if (!BOTS_ALL[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS_ALL[n], runs, file, browser, opts));
}
await browser.close();
