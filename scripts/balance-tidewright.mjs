// Headless balance bots for Tidewright.
//
// Usage: node scripts/balance-tidewright.mjs [runs=200] [bot,bot,...] [CONST=value,...] [lag=s] [think=s]
//   e.g. node scripts/balance-tidewright.mjs 300 skilled,habit LEAK=0.012
//        node scripts/balance-tidewright.mjs 200 skilled lag=0.8        (sweep reaction lag)
//        node scripts/balance-tidewright.mjs 200 skilled think=1.5      (sweep think time / action rate)
//        node scripts/balance-tidewright.mjs 1 skilled trace=1000        (one line per wave, one seed)
//
// Builds a debug copy of games/tidewright.html (state on window, seeded
// Math.random, no animation loop), then plays seeded runs in headless Chromium
// by calling step() directly. A run goes on season after season until the
// village floods (or MAX_WAVES). Prints one line per bot.
// Bots act on what the player sees (wall, water, crest marker, countdown,
// gate states), `think` s apart, and each action lands `lag` s after the
// bot decided it (reaction time).
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/tidewright.html');
const MAX_WAVES = 60;

const BOTS = {
  // First-timer: builds where the wall looks low but aims ±1-2 columns and throws random sizes,
  // ignores water when building, finds the gates only after the hint, makes 2-3 wrong gate taps,
  // sometimes forgets to shut before a wave, half the time opens gates on a spring tide.
  // Builds where the wall looks lowest, and reads the crest marker only once it turns orange.
  novice: { flick: 'novice', aim: 1.3, sizes: 'random', wetAware: false, gates: 'novice', lag: 0.8, think: 1.5 },
  // The one-line rule after wave 1: throw full pellets on the lowest column, never touch a gate.
  habit: { flick: 'lowest', gates: 'none', lag: 0.4, think: 0.6 },
  // Skilled builder that never opens a gate.
  allShut: { flick: 'need', wetAware: true, gates: 'none', lag: 0.3, think: 0.4 },
  // Skilled builder with every gate left open.
  allOpen: { flick: 'need', wetAware: true, gates: 'open', lag: 0.3, think: 0.4 },
  // Opens every gate in each calm and shuts them before each crest, never reading water or tide.
  timer: { flick: 'need', wetAware: true, gates: 'timer', lag: 0.3, think: 0.4 },
  // Reads both wall and water: drains when water stands and the sea is below the sills, shuts
  // before crests, builds dry columns up to the crest marker, stores extra sand in the wall.
  skilled: { flick: 'need', wetAware: true, gates: 'skilled', lag: 0.3, think: 0.4 },
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
    get state() { return state; }, get spec() { return spec; }, get phase() { return phase; }, get pt() { return pt; },
    get wave() { return wave; }, get waves() { return waves; }, get ammo() { return ammo; }, get meanW() { return meanW; },
    get hinted() { return hinted; }, get reason() { return lastReason; }, get flicks() { return flicks; },
    get whiffs() { return whiffs; }, get gateOpenS() { return gateOpenS; }, get peakW() { return peakW; },
    get drained() { return drained; },
    Hh, Wd, gateOpen, GATE_COLS, NC, SILL, WET_D, AMMO_MAX, S_MIN, S_MAX, SLUMP, CG, FLOOD_D,
    crestAt, timeToWave, baseSea, earned: runEarned,
    step, throwSand, toggleGate, newRun, nextSeason,
  };
  newRun();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tidewright-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot, maxWaves, trace }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newRun();
  // The bot's own dice, apart from the game's.
  let bs = seed * 7919 + 13;
  const rnd = () => { bs = (bs * 16807) % 2147483647; return bs / 2147483647; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const dt = 1 / 60, NC = D.NC, G = D.GATE_COLS;
  let lastWave = 0; const rows = [];
  let t = 0, nextAct = 0, wrongTaps = 0, forgetWave = -1, springIgnore = -1, seasons = 0, wave1 = null;
  const queue = [];
  const later = fn => queue.push({ at: t + bot.lag, fn });
  const setGates = open => G.forEach((_, g) => { if (D.gateOpen[g] !== open(g)) later(() => { if (D.gateOpen[g] !== open(g)) D.toggleGate(g); }); });

  function gatesDecide() {
    const s = D.spec, ttw = D.timeToWave(), calm = D.phase === 'calm';
    const lead = bot.lag + 2;
    if (bot.gates === 'open') return setGates(() => true);
    if (bot.gates === 'timer') return setGates(() => calm && ttw > lead);
    if (bot.gates === 'skilled') {
      const spring = D.baseSea() >= D.SILL - 1;
      return setGates(g => calm && ttw > lead && !spring && D.Wd[G[g]] > D.SILL + 0.15);
    }
    if (bot.gates === 'novice') {
      if (!D.hinted.gate) return;
      if (wrongTaps < 3 && rnd() < 0.3) { wrongTaps++; const g = Math.floor(rnd() * G.length); later(() => D.toggleGate(g)); return; }
      if (forgetWave !== D.wave) { forgetWave = D.wave; springIgnore = rnd() < 0.5; bot._forget = rnd() < 0.25; }
      const spring = D.baseSea() >= D.SILL && !springIgnore;
      // Forgetful waves: shuts only once it sees the sea pouring in.
      const anyOpen = D.gateOpen.some(o => o);
      if (bot._forget ? !calm && D.pt > 1.5 : !calm || ttw < 3) return setGates(() => false);
      if (spring) return setGates(() => false);
      if (!calm) return;
      // Opened them and the flood meter keeps climbing: shut them again.
      if (bot._burnt === D.wave) return;
      if (anyOpen && bot._openW !== undefined && D.meanW > bot._openW + 1.5) { bot._openW = undefined; bot._burnt = D.wave; return setGates(() => false); }
      if (!anyOpen) bot._openW = undefined; else if (bot._openW === undefined) bot._openW = D.meanW;
      if (D.meanW > 3 || (anyOpen && D.meanW > 0.8)) return setGates(() => true);
      if (anyOpen && D.meanW <= 0.8) return setGates(() => false);
    }
  }

  function flickDecide() {
    const ttw = D.timeToWave(), H = D.Hh, Wd = D.Wd;
    if (D.ammo < D.S_MIN) return;
    if (bot.flick === 'lowest') {
      let c = 0;
      for (let i = 1; i < NC; i++) if (H[i] < H[c]) c = i;
      if (D.ammo >= D.S_MAX) later(() => D.throwSand(c, D.S_MAX, 0));
      return;
    }
    if (bot.flick === 'novice' && D.phase === 'calm' && ttw >= 5) {
      if (D.ammo < D.AMMO_MAX * 0.8) return;
      let c = 0;
      for (let i = 1; i < NC; i++) if (H[i] < H[c]) c = i;
      const size = D.S_MIN + rnd() * (D.S_MAX - D.S_MIN), a = c + Math.round(gauss() * bot.aim);
      later(() => D.throwSand(a, size, 0));
      return;
    }
    // Need = how far each column is below the marked crest (plus a margin for the slump).
    const urgent = D.phase === 'wave' || ttw < 4;
    let best = -1, bn = 0;
    for (let i = 0; i < NC; i++) {
      if (bot.wetAware && Wd[i] > D.WET_D && !urgent) continue;
      const n = D.crestAt(i) + 2.5 - H[i];
      if (n > bn) { bn = n; best = i; }
    }
    // Spare sand: store it in the wall's lowest dry column, aiming a couple of waves ahead.
    if (best < 0 && D.ammo > D.AMMO_MAX - D.S_MAX) {
      bn = -1e9;
      for (let i = 0; i < NC; i++) {
        if (bot.wetAware && Wd[i] > D.WET_D) continue;
        const n = D.crestAt(i) - H[i];
        if (n > bn) { bn = n; best = i; }
      }
      bn = D.S_MAX;
    }
    if (best < 0) return;
    let size = bot.sizes === 'random' ? D.S_MIN + rnd() * (D.S_MAX - D.S_MIN) : Math.max(D.S_MIN, Math.min(D.S_MAX, bn * 2));
    if (D.ammo < size) { if (!urgent) return; size = D.ammo; }
    const c = best + (bot.aim ? Math.round(gauss() * bot.aim) : 0);
    later(() => D.throwSand(c, size, 0));
  }

  while (D.waves < maxWaves) {
    if (D.state === 'season') { seasons++; D.nextSeason(); }
    if (D.state === 'lost') break;
    if (t >= nextAct) {
      gatesDecide();
      flickDecide();
      nextAct = t + bot.think * (0.7 + 0.6 * rnd());
    }
    for (let j = queue.length - 1; j >= 0; j--) if (queue[j].at <= t) { const q = queue.splice(j, 1)[0]; q.fn(); }
    D.step(dt);
    t += dt;
    if (wave1 === null && D.wave >= 2) wave1 = t;
    if (trace && D.wave !== lastWave) {
      lastWave = D.wave;
      const H = [...D.Hh], lo = Math.min(...H.map((h, i) => h - D.crestAt(i)));
      rows.push(`wave ${D.wave} ${D.spec.ev.join('+') || '-'} crest ${D.spec.crest.toFixed(1)} | wall mean ${(H.reduce((a, b) => a + b) / NC).toFixed(1)} min-crest ${lo.toFixed(1)} | water ${D.meanW.toFixed(1)} peak ${D.peakW.toFixed(1)} | sand ${D.ammo.toFixed(0)} | t ${t.toFixed(0)}`);
    }
  }
  if (trace) rows.push(`end: ${D.state} ${D.reason} waves ${D.waves}`);
  return { waves: D.waves, reason: D.state === 'lost' ? D.reason : 'cap', t, seasons, wave1,
    flicks: D.flicks, whiffs: D.whiffs, earned: [...D.earned], rows };
}

async function run(bot, runs, file, browser, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot, maxWaves: MAX_WAVES }); }
    await page.close();
  }));
  return results;
}

function report(name, rs) {
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * f))] : NaN; };
  const pct = n => `${Math.round(100 * n / rs.length)}%`;
  const w = rs.map(r => r.waves);
  const reasons = {};
  for (const r of rs) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  console.log(`${name.padEnd(8)} waves p10/med/p90 ${q(w, 0.1)}/${q(w, 0.5)}/${q(w, 0.9)}` +
    ` | >=2 ${pct(rs.filter(r => r.waves >= 2).length)} >=10 ${pct(rs.filter(r => r.waves >= 10).length)}` +
    ` >=15 ${pct(rs.filter(r => r.waves >= 15).length)} >=20 ${pct(rs.filter(r => r.waves >= 20).length)}` +
    ` | min ${(q(rs.map(r => r.t), 0.5) / 60).toFixed(1)} | wave1 ${q(rs.map(r => r.wave1 ?? r.t), 0.5).toFixed(0)}s` +
    ` | ${Object.entries(reasons).map(([k, v]) => `${k} ${pct(v)}`).join(' ')}` +
    ` | whiffs ${q(rs.map(r => r.whiffs), 0.5)}/${q(rs.map(r => r.flicks), 0.5)}` +
    ` | ${Object.entries(ach).map(([k, v]) => `${k} ${pct(v)}`).join(', ')}`);
}

const args = process.argv.slice(2);
const runs = +args[0] || 200;
const names = (args[1] || Object.keys(BOTS).join(',')).split(',');
const overrides = {}, botOver = {};
for (const a of args.slice(2)) for (const kv of a.split(/,(?![^\[]*\])/).filter(Boolean)) {
  const [k, v] = kv.split('=');
  if (k === 'lag' || k === 'think' || k === 'trace') botOver[k] = +v; else overrides[k] = v;
}
const file = buildDebug(overrides);
if (botOver.trace !== undefined) {
  // trace=<seed>: one line per wave for one run of each bot.
  const browser = await chromium.launch(), page = await browser.newPage();
  await page.goto(pathToFileURL(file).href);
  for (const n of names) {
    const r = await page.evaluate(playInPage, { seed: botOver.trace, bot: { ...BOTS[n], ...botOver }, maxWaves: MAX_WAVES, trace: true });
    console.log(`# ${n}`); for (const row of r.rows) console.log(row);
  }
  await browser.close();
  process.exit(0);
}
const browser = await chromium.launch();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run({ ...BOTS[n], ...botOver }, runs, file, browser));
}
await browser.close();
