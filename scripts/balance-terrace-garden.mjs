// Headless balance bots for Terrace Garden.
//
// Usage: node scripts/balance-terrace-garden.mjs [runs=100] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-terrace-garden.mjs 100 reader,novice GATE_K=4,SILL=6
//   TRACE=1 prints, for the first run of each bot, the state every 5 s
//   (tilt, open gates, water per terrace, each plant's depth/band/growth).
//
// Builds a debug copy of games/terrace-garden.html (state on window, seeded
// Math.random, no animation loop), then plays seeded runs (warm-up + three gardens, up
// to 3 tries each, spring water carrying over) in headless Chromium by
// calling step() directly. Prints one line per bot. Adapted from
// balance-loom.mjs. Needs Playwright (installed globally in Claude Code
// cloud sessions).
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/terrace-garden.html');

// Every bot decides every `gap` s (think time, scaled by `rate`), acts
// `react` s after it looks, and spends `tapT` s per gate tap.
//   reader: works down the hill. The topmost terrace with a thirsty plant is
//     the target: gates above it open, its own gate shut, the spring open
//     while the target and the terraces above hold less than the plant
//     still needs. While the plant is too dry and water sits on the
//     terraces above, it tilts toward the gates to bring it down (only as
//     far as the bottom terrace can take without spilling). Otherwise it
//     picks the tilt where the target's water would settle closest to every
//     thirsty plant's band there (and keeps the cactus dry), opening its own
//     gate if the focus plant is still too deep. Once only the cactus is
//     left, it tilts (or drains) the water away from it. Analog tilt (phone
//     tilt or the tilt bar), read from where the water would settle.
//   keys: the reader with PC keys: tilt is full left, level or full right.
//   keys-half: keys plus Shift for half tilt.
//   no-tilt: the reader that never tilts (gates only).
//   flood: opens the spring and every gate and waits. Never tilts.
//   novice: a first-time player. In its first garden it opens every gate
//     at once and holds full tilt toward the gates for `rush` s (the two
//     obvious first guesses), closes them again, then plays as the reader.
//   thrifty: goes for the Gatekeeper achievement (no gate opened twice)
//     with a plan: the spring runs once, until it has let out what the
//     plants drink plus `once` for standing water, and each gate opens for
//     good once the terrace above it has bloomed. Tilts like the reader.
//   idle: does nothing.
//   masher: the telemetry habit (v1 garden 1 losses: ~14 gate taps, ~6 s
//     of tilt, spring empty, 2 of 4 bloomed). Waters by gates: the spring
//     runs while any plant looks dry, a gate is open while a plant below it
//     looks dry, unless a plant right above it looks dry too (then it's
//     shut to fill that terrace). Thinks every `gap` 2.5 s and uses the
//     reader's tilt on only `tiltP` 10% of its decisions (level otherwise).
//   learner: the masher on its first try at a garden, the reader after
//     (the one v1 player who won did it this way, on the second try).
//   masher-0 / masher-.3: the masher tilting on 0% / 30% of its decisions
//     (masher-0 is the one that matched v1's human losses).
//   hinted / hinted-.5: masher-0, but does what the game's stuck hint says,
//     tilting at full / half strength (see followHint).
const HUMAN = { gap: 0.6, react: 0.3, tapT: 0.3, tilt: 'analog', rush: 0 };
const BOTS = {
  reader: { ...HUMAN, policy: 'reader', rate: 1 },
  'reader-0.5x': { ...HUMAN, policy: 'reader', rate: 0.5 },
  'reader-2x': { ...HUMAN, policy: 'reader', rate: 2 },
  'slow-hands': { ...HUMAN, policy: 'reader', rate: 1, react: 0.7 },
  keys: { ...HUMAN, policy: 'reader', rate: 1, tilt: 'keys' },
  'keys-half': { ...HUMAN, policy: 'reader', rate: 1, tilt: 'keys-half' },
  'no-tilt': { ...HUMAN, policy: 'reader', rate: 1, tilt: 'none' },
  flood: { ...HUMAN, policy: 'flood', rate: 1, tilt: 'none' },
  novice: { ...HUMAN, policy: 'reader', rate: 1, rush: 3 },
  thrifty: { ...HUMAN, policy: 'reader', rate: 1, once: 150 },
  idle: { ...HUMAN, policy: 'idle', rate: 1 },
  masher: { ...HUMAN, policy: 'masher', rate: 1, gap: 2.5, tiltP: 0.1 },
  learner: { ...HUMAN, policy: 'masher', rate: 1, gap: 2.5, tiltP: 0.1, learns: true },
  hinted: { ...HUMAN, policy: 'masher', rate: 1, gap: 2.5, tiltP: 0, hint: 1 },
  'hinted-.5': { ...HUMAN, policy: 'masher', rate: 1, gap: 2.5, tiltP: 0, hint: 0.5 },
  'masher-0': { ...HUMAN, policy: 'masher', rate: 1, gap: 2.5, tiltP: 0 },
  'masher-.3': { ...HUMAN, policy: 'masher', rate: 1, gap: 2.5, tiltP: 0.3 },
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
  const tail = '  fitStage();\n  showControls();\n  newRun();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  if (!html.includes('function endLevel(result, why) {')) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('function endLevel(result, why) {', 'function endLevel(result, why) { window.__why = why;');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get state() { return state; }, get elapsed() { return elapsed; }, get terraces() { return terraces; },
    get gates() { return gates; }, get plants() { return plants; }, get tank() { return tank; },
    get spilled() { return spilled; }, get leaked() { return leaked; }, get drunk() { return drunk; },
    get level() { return level; }, get attempt() { return attempt; }, get tilt() { return tilt; },
    get gateTaps() { return gateTaps; }, get reason() { return window.__why; }, get hint() { return hint; },
    get hints() { return hints; }, endLevel, get over() { return over; }, get bloomedRun() { return bloomedRun; },
    get spare() { return spare; }, get garden() { return cur; },
    setGarden(g) { cur = g; level = CAMP; carry = 0; spare = SPARE; over = false; bloomedRun = 0; startLevel(2); },
    NC, SLOPE, LIP, SILL, GARDENS, CAMP, summerGarden, earned: unlocked, step, setTilt, tapGate, next, newRun, minStand,
  };
  newRun();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'terrace-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newRun(bot.summerOnly ? D.CAMP : 0);

  D.earned.clear();
  const DT = 1 / 60;
  const LEVEL_TIME = 300;
  const SUMMER_CAP = 3600;
  let tiltS = 0;
  const advance = t => { for (let k = 0; k < Math.round(t / DT) && D.state === 'playing'; k++) { D.step(DT); if (Math.abs(D.tilt) > 0.05) tiltS += DT; } };
  const sum = a => a.reduce((s, v) => s + v, 0);
  let rush = bot.rush;
  const trace = [];
  let nextTrace = 0;
  const snap = () => {
    const T = D.terraces, g = D.gates.map(x => x.open ? 'o' : '.').join('');
    const w = T.map(t => Math.round(t.h.reduce((a, b) => a + b, 0))).join('/');
    const pl = D.plants.map(p => `${p.t}:${p.c}${p.dry ? 'D' : `[${p.lo}-${p.hi}]`}${Math.round(T[p.t].h[p.c])}${p.bloom ? '*' : Math.round(p.grow * 9)}`).join(' ');
    trace.push(`  g${D.level + 1} ${Math.round(D.elapsed)}s tilt ${D.tilt.toFixed(1)} gates ${g} tank ${Math.round(D.tank)} water ${w} | ${pl}`);
  };

  const rand = (() => { let r = seed * 7919; return () => { r = r + 0x6D2B79F5 | 0; let t = Math.imul(r ^ r >>> 15, 1 | r);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  // Where water settles on terrace i holding v at tilt t: a flat surface
  // sloping SLOPE*t per column, never below the floor, and never above the
  // downhill edge (edge px at the last column: the gate or the lip), since
  // anything above it runs out.
  function settle(v, t, edge) {
    const depth = (L, j) => Math.max(0, L + D.SLOPE * t * (j - (D.NC - 1) / 2));
    const fill = L => { let s = 0; for (let j = 0; j < D.NC; j++) s += depth(L, j); return s; };
    let lo = -200, hi = 200;
    for (let k = 0; k < 40; k++) { const L = (lo + hi) / 2; if (fill(L) > v) hi = L; else lo = L; }
    const cap = edge - D.SLOPE * t * (D.NC - 1 - (D.NC - 1) / 2);
    const L = Math.min(lo, cap);
    return j => depth(L, j);
  }
  const TILTS = bot.tilt === 'keys' ? [-1, 0, 1] : bot.tilt === 'keys-half' ? [-1, -0.5, 0, 0.5, 1] : bot.tilt === 'none' ? [0] : [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
  let seen = [];
  const edgeOf = (i, open) => i === D.terraces.length - 1 ? D.LIP : open || D.gates[i + 1].jam ? D.SILL : 40;
  // How far each thirsty plant on terrace i would sit outside its band (and
  // the cactus from dry) if the water settled at tilt t, extra water added.
  // The cactus only has to be dry at the end (it regrows in DRY_T), so it
  // counts for little while thirsty plants are left.
  let dryW = 2;
  function miss(i, t, open, extra = 0) {
    const at = settle(seen[i] + extra, t, edgeOf(i, open));
    let e = 0;
    for (const p of D.plants) {
      if (p.t !== i || p.bloom && !p.dry) continue;
      const d = at(p.c);
      if (p.dry) e += Math.max(0, d - 1) * dryW;
      else e += d < p.lo ? p.lo - d : d > p.hi ? (d - p.hi) * (p.tender ? 4 : 1) : 0;
    }
    return e;
  }
  // Tilts that don't spill the bottom terrace, unless it's too deep anyway.
  function safe(t) {
    const b = D.terraces.length - 1;
    if (D.plants.some(p => p.t === b && !p.bloom && D.terraces[b].h[p.c] > p.hi)) return true;
    return settle(seen[b], t, 999)(D.NC - 1) <= D.LIP - 2;
  }

  // The hinted bot does what the game's stuck hint says: taps the gate it
  // points at (and leaves it open), or tilts the arrow's way (at `hint`
  // strength) and holds that tilt until the hint changes. The spill warning
  // makes it level out.
  let held = 0, forced = [];
  function followHint(gates) {
    const h = D.hint;
    if (h && h.tilt) held = h.spill ? 0 : h.tilt * bot.hint;
    if (h && h.gate !== undefined) forced[h.gate] = true;
    if (h && h.restart) { D.endLevel('lost', 'restart'); return; }
    for (let k = 0; k < gates.length; k++) if (forced[k]) gates[k] = true;
    D.setTilt(held);
  }

  // The masher's gates: what a plant looks like (dry stem), not depths.
  function mashGates() {
    const P = D.plants, n = D.terraces.length;
    const thirsty = P.filter(p => !p.dry && !p.bloom && p.mood === 'dry');
    const gates = new Array(n).fill(false);
    gates[0] = thirsty.length > 0 && D.tank > 0;
    for (let k = 1; k < n; k++) {
      gates[k] = thirsty.some(p => p.t >= k) && !thirsty.some(p => p.t === k - 1);
    }
    return gates;
  }

  function decide() {
    const T = D.terraces, P = D.plants, n = T.length;
    // What the bot sees: each terrace's water, misjudged by ~8%.
    seen = T.map(x => Math.max(0, sum(x.h) * (1 + 0.08 * gauss())));
    const gates = new Array(n).fill(false);
    if (bot.policy === 'flood') return { gates: gates.map(() => true), tl: 0 };
    const wet = P.filter(p => !p.dry && !p.bloom);
    const cactus = P.find(p => p.dry);
    dryW = wet.length ? 0.05 : 2;
    const ok = TILTS.filter(safe);
    const opts = ok.length ? ok : [0];
    // Best (tilt, gate) for f; ties go to the gentler tilt and a shut gate.
    // If no tilt that keeps the bottom terrace from spilling works, it
    // accepts a spill.
    const pick = (f, gateOk) => {
      const scan = list => {
        let best = null;
        for (const open of gateOk ? [false, true] : [false]) for (const t of list) {
          const v = f(t, open) + Math.abs(t) * 1e-3 + (open ? 1e-2 : 0);
          if (!best || v < best.v) best = { t, open, v };
        }
        return best;
      };
      const a = scan(opts);
      if (a.v < 0.05) return a;
      const b = scan(TILTS);
      return b.v < a.v - 1 ? b : a;
    };
    let tl = 0;
    if (wet.length) {
      const tt = Math.min(...wet.map(p => p.t));
      const here = wet.filter(q => q.t === tt);
      for (let k = 1; k <= tt; k++) gates[k] = true;
      let up = 0;
      for (let i = 0; i < tt; i++) up += seen[i];
      const owed = sum(here.map(q => (1 - q.grow) * 28));
      const cz = cactus && cactus.t !== tt ? t => miss(cactus.t, t, true) : () => 0;
      const best = pick((t, open) => miss(tt, t, open) + cz(t), tt < n - 1);
      tl = best.t;
      if (tt < n - 1) gates[tt + 1] = best.open;
      // Short of water: no tilt fits the bands, but more water would (or
      // the plants will drink the terrace dry before they bloom).
      const short = best.v > 0.05 && miss(tt, tl, best.open, 60) < best.v - 0.05 || seen[tt] < owed;
      gates[0] = short && up < 30 && D.tank > 0;
      // Bring down what's still up the hill first (as far toward the gates
      // as the bottom terrace allows, and without pouring the target over
      // its own shut gate).
      // A jammed gate under the target: pour in level (tilting ▶ would
      // drain the target as fast), then tilt ◀ to catch it once it's there.
      const jam = tt < n - 1 && D.gates[tt + 1].jam;
      if (jam) {
        const want = owed + Math.max(...here.map(q => D.minStand(q.lo, q.c)));
        let free = 0; // water above the sills up the hill: what a level hill can still pour down
        for (let i = 0; i < tt; i++) free += Math.max(0, seen[i] - D.NC * D.SILL);
        if (seen[tt] < want && (free > 10 || D.tank > 0)) { tl = bot.jamPour ?? 0; gates[0] = D.tank > 0 && free < want; }
        else tl = Math.min(tl, -0.5);
      } else if (short && up > 10) {
        const hold = opts.filter(t => best.open || settle(seen[tt] + up, t, 999)(D.NC - 1) < 38);
        tl = Math.max(...(hold.length ? hold : [0]));
      }
      // Puddles below the sills only come down with a tilt: if it can't
      // tilt them down, use the spring.
      if (short && up >= 30 && tl <= 0 && !jam) gates[0] = D.tank > 0;
    } else if (cactus && !cactus.bloom) {
      const best = pick((t, open) => miss(cactus.t, t, open), cactus.t < n - 1);
      tl = best.t;
      if (cactus.t < n - 1) gates[cactus.t + 1] = best.open;
    }
    return { gates, tl };
  }

  let startTank = 0;
  function playGarden() {
    startTank = D.tank;
    tiltS = 0; held = 0; forced = [];
    if (rush > 0) {
      for (let k = 0; k < D.gates.length; k++) { D.tapGate(k); advance(bot.tapT); }
      D.setTilt(1);
      advance(rush);
      D.setTilt(0);
      advance(bot.gap / bot.rate);
      for (let k = D.gates.length - 1; k >= 1; k--) if (D.gates[k].open) { D.tapGate(k); advance(bot.tapT); }
      rush = 0;
    }
    while (D.state === 'playing' && D.elapsed < LEVEL_TIME) {
      if (bot.trace && D.elapsed >= nextTrace) { snap(); nextTrace = D.elapsed + 5; }
      if (bot.policy === 'idle') { advance(1); continue; }
      const think = bot.learns && D.attempt > 1 ? 0.6 : bot.gap;
      let { gates, tl } = decide();
      if (bot.policy === 'masher' && !(bot.learns && D.attempt > 1)) gates = mashGates();
      if (bot.once) {
        const P = D.plants;
        for (let k = 1; k < gates.length; k++) gates[k] = !P.some(p => p.t === k - 1 && !p.dry && !p.bloom);
        const budget = P.filter(p => !p.dry).length * 28 + bot.once;
        gates[0] = !D.gates[0].opened || D.gates[0].open && startTank - D.tank < budget;
      }
      advance(bot.react);
      const lazy = bot.tiltP !== undefined && !(bot.learns && D.attempt > 1) && rand() > bot.tiltP;
      D.setTilt(lazy ? 0 : tl);
      if (bot.hint) followHint(gates);
      for (let k = 0; k < gates.length && D.state === 'playing'; k++) {
        if (D.gates[k].jam) continue;
        if (D.gates[k].open !== gates[k]) { D.tapGate(k); advance(bot.tapT); }
      }
      advance(think / bot.rate * (0.6 + 0.8 * rand()));
    }
  }

  if (bot.garden) {
    D.setGarden(bot.garden);
    playGarden();
    return { won: D.state === 'won', t: D.elapsed, left: D.tank, why: D.state === 'playing' ? 'timeout' : D.reason || '' };
  }
  const gardens = [];
  const NG = D.CAMP;
  let total = 0;
  for (let lv = bot.summerOnly ? NG : 0; lv < NG; lv++) {
    nextTrace = 0;
    let won = false, tries = 0, time = 0, spilled = 0, leaked = 0, left = 0, first1 = null;
    while (!won && tries < 3) {
      tries++;
      playGarden();
      won = D.state === 'won';
      if (tries === 1) first1 = { won, t: D.elapsed, why: D.state === 'playing' ? 'timeout' : D.reason || '',
        bloomed: D.plants.filter(p => p.bloom).length, left: D.tank, drunk: D.drunk, taps: D.gateTaps, tilt: tiltS, hints: D.hints };
      time += D.elapsed; spilled += D.spilled; leaked += D.leaked; left = D.tank;
      if (!won && D.state === 'playing') D.endLevel('lost', 'restart'); // stuck: a player would restart
      if (!won && tries < 3) D.next();
    }
    gardens.push({ won, first: won && tries === 1, tries, time, spilled, leaked, left, first1 });
    total += time;
    if (!won) break;
    D.next();
  }
  // The Long Summer: the game's own spare tries end it (or SUMMER_CAP s).
  const camp = bot.summerOnly || gardens.length === NG && gardens[NG - 1].won;
  let summer = 0, summerT = 0, losses = {}, lostAt = [], info = [], starts = [];
  if (camp) {
    while (!D.over && summerT < SUMMER_CAP) {
      if (D.attempt === 1) starts.push(Math.round(D.tank));
      playGarden();
      summerT += D.elapsed;
      if (D.state === 'playing') { D.endLevel('lost', 'restart'); info.push(`s${D.level - D.CAMP + 1} timeout ${D.plants.filter(p => !p.bloom).map(p => `${p.t}:${p.c}[${p.lo}-${p.hi}]${p.tender ? 'T' : ''}${p.dry ? 'C' : ''}${Math.round(D.terraces[p.t].h[p.c])}`).join(' ')} tank${Math.round(D.tank)} jam${D.garden.jam} leak${D.garden.leak}`); losses.timeout = (losses.timeout || 0) + 1; lostAt.push(D.level - D.CAMP); if (D.over) break; D.next(); continue; } // stuck: a player would restart (a lost try)
      if (D.state === 'won') summer++;
      else { losses[D.reason] = (losses[D.reason] || 0) + 1; lostAt.push(D.level - D.CAMP); }
      if (D.state !== 'won') info.push(`s${D.level - D.CAMP + 1} ${D.state === 'playing' ? 'timeout' : D.reason} ${D.plants.filter(p => p.bloom).length}/${D.plants.length} tank${Math.round(D.tank)} ${D.garden.note.replace(/ (is|are|if|wash).*?\./g, '').replace(/\s+/g, ' ')} unbloomed ${D.plants.filter(p => !p.bloom).map(p => `${p.t}:${p.c}[${p.lo}-${p.hi}]${p.tender ? 'T' : ''}${Math.round(D.terraces[p.t].h[p.c])}`).join(' ')}`);
      if (D.over) break;
      D.next();
    }
  }
  return { gardens, run: camp, campT: total, summer, summerT, losses, lostAt, info, starts, earned: [...D.earned], trace };
}


// GEN=1: build the Long Summer's garden pool (SUMMER_POOL in the game).
// Candidates come from summerCandidate(); the reader plays each once with
// the spring at KEEP of the listed tank and no water carried in, and only
// wins are kept (and only if it doesn't need 240 s). Writes the pool into
// the game file between "§ pool" and the end of that line.
const NC = 12, SLOPE = 5.5, DRINK_ALL = 28;
function minStand(lo, c) {
  let best = Infinity;
  for (const dir of [-1, 1]) { let v = 0; for (let j = 0; j < NC; j++) v += Math.max(0, lo + SLOPE * dir * (j - c)); best = Math.min(best, v); }
  return best;
}
function rngOf(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Garden "k" sets the size: a plant on each of the 5 terraces plus k/2 more
// (up to 4), bands 12 px wide narrowing to 8, and the tier's twists.
function summerCandidate(seed, tier, k) {
  const r = rngOf(seed), n = 5;
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const pickOf = a => a[Math.floor(r() * a.length)];
  const tw = [];
  while (tw.length < tier + 1) { const t = pickOf(['leak', 'jam', 'cactus', 'tender']); if (!tw.includes(t)) tw.push(t); }
  let leak = -1, jam = 0;
  if (tw.includes('leak')) leak = ri(1, 3);
  if (tw.includes('jam')) { do jam = ri(1, 3); while (jam - 1 === leak); }
  const width = Math.max(8, 12 - Math.floor(k / 2));
  const used = Array.from({ length: n }, () => []), plants = [];
  const free = (t, c) => used[t].every(u => Math.abs(u - c) >= 3);
  if (tw.includes('cactus')) {
    const t = pickOf([0, 1, 2, 3].filter(t => t !== leak && t + 1 !== jam)), c = pickOf([0, 1, 2, 9]);
    used[t].push(c); plants.push([t, c, 0, 0, 1]);
  }
  // Left half on the jammed gate's terrace (only a tilt ◀ holds water
  // there), away from a cactus, shallow enough for the bottom lip; a tender
  // shoot never under the water falling from the gate above (column 10)
  // or the spring (column 0).
  const add = (t, tender) => {
    const jammed = t + 1 === jam, cact = plants.find(p => p[4] === 1 && p[0] === t);
    for (let tries = 0; tries < 40; tries++) {
      let c = jammed ? ri(0, 4) : ri(0, 11);
      if (cact) c = cact[1] < 6 ? ri(Math.max(5, c), 11) : ri(0, 6);
      if (jammed && cact) c = ri(3, 5);
      if (tender && (t ? c >= 8 : c <= 1)) continue;
      if (!free(t, c)) continue;
      const w = tender ? width + 2 : width, top = t === n - 1 ? 26 : jammed ? 24 : 32, lo = ri(3, top - w);
      used[t].push(c); plants.push(tender ? [t, c, lo, lo + w, 2] : [t, c, lo, lo + w]);
      return;
    }
  };
  const tenderT = [];
  while (tenderT.length < (tw.includes('tender') ? (tier ? 2 : 1) : 0)) { const t = ri(0, n - 1); if (!tenderT.includes(t)) tenderT.push(t); }
  for (let t = 0; t < n; t++) add(t, tenderT.includes(t));
  for (let e = Math.min(4, Math.floor(k / 2)); e > 0; e--) add(ri(0, n - 1), false);
  // The listed spring: what the plants drink, the standing water the
  // hungriest needs, the crack's and the jam's share, and a margin.
  const wet = plants.filter(p => p[4] !== 1);
  const need = wet.length * DRINK_ALL + Math.max(...wet.map(p => minStand(p[2], p[1]))) + (leak >= 0 ? 90 : 0) + (jam ? 100 : 0);
  return [Math.round((need * 1.3 + 100) / 10) * 10, leak, jam, plants.sort((a, b) => a[0] - b[0] || a[1] - b[1])];
}
function asGarden([tank, leak, jam, ps], share) {
  return { name: 'pool', n: 5, leak, jam, tank: Math.round(tank * share), note: '',
    plants: ps.map(([t, c, lo, hi, kind]) => kind === 1 ? [t, c, 0, 0, true] : kind === 2 ? [t, c, lo, hi, 'tender'] : [t, c, lo, hi]) };
}
async function genPool(browser, file) {
  const KEEP = 0.85, WANT = [24, 30, 30], KS = [[0, 1], [2, 3, 4], [5, 6, 7, 8, 9]];
  const pages = await Promise.all(Array.from({ length: 8 }, async () => { const p = await browser.newPage(); await p.goto(pathToFileURL(file).href); return p; }));
  const pool = [];
  for (let tier = 0; tier < 3; tier++) {
    const kept = [];
    let seed = 50000 * (tier + 1), tried = 0;
    await Promise.all(pages.map(async page => {
      while (kept.length < WANT[tier] && tried < 1500) {
        const sd = seed++; tried++;
        const k = KS[tier][sd % KS[tier].length];
        const row = summerCandidate(sd, tier, k);
        // Kept if the reader wins it twice (its misjudging differs by seed)
        // and slow-hands once; tier 1 (the summer's first two gardens, where
        // the Daily starts) also needs the keys bot.
        let ok = true;
        for (const [b, s2] of [['reader', sd], ['reader', sd + 7], ['slow-hands', sd], ...(tier ? [] : [['keys', sd]])]) {
          const res = await page.evaluate(playInPage, { seed: s2, bot: { ...BOTS[b], garden: asGarden(row, KEEP) } });
          if (!res.won || res.t > 240) { ok = false; break; }
        }
        if (ok && kept.length < WANT[tier]) kept.push(row);
      }
    }));
    console.log(`tier ${tier + 1}: kept ${kept.length} of ${tried}`);
    pool.push(kept);
  }
  let html = fs.readFileSync(SRC, 'utf8');
  const re = /const SUMMER_POOL = .*; \/\/ § pool \(generated\)/;
  if (!re.test(html)) throw new Error('no SUMMER_POOL line');
  html = html.replace(re, `const SUMMER_POOL = ${JSON.stringify(pool)}; // § pool (generated)`);
  fs.writeFileSync(SRC, html);
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
  const per = [0, 1, 2, 3, 4, 5].map(lv => {
    const g = rs.map(r => r.gardens[lv]).filter(Boolean);
    if (!g.length) return '-';
    const w = g.filter(x => x.won);
    return `${Math.round(100 * g.filter(x => x.first).length / g.length)}%/${Math.round(100 * w.length / g.length)}%` +
      ` ${Math.round(med(w.map(x => x.time)))}s sp${Math.round(med(g.map(x => x.spilled)))}` +
      ` lk${Math.round(med(g.map(x => x.leaked)))} left${Math.round(med(w.map(x => x.left)))}`;
  }).join(' | ');
  // First try at garden 1, in the telemetry's terms (compare with
  // fetch-telemetry's median stats): outcome, time, bloomed, spring left,
  // gate taps, seconds tilted.
  const tryOne = lv => {
    const f = rs.map(r => r.gardens[lv] && r.gardens[lv].first1).filter(Boolean), fl = f.filter(x => !x.won);
    if (!f.length) return '';
    const why = {};
    for (const x of fl) why[x.why] = (why[x.why] || 0) + 1;
    return `${lv ? 'g' + lv : 'warm-up'} try 1: ${Math.round(med(f.map(x => x.t)))}s bloom ${med(f.map(x => x.bloomed))} left ${Math.round(med(f.map(x => x.left)))}` +
      ` taps ${med(f.map(x => x.taps))} tilt ${med(f.map(x => x.tilt)).toFixed(1)}s hints ${med(f.map(x => x.hints))}` +
      (fl.length ? ` (lost ${Object.entries(why).map(([k, v]) => k + ' ' + v).join(' ')} at ${Math.round(med(fl.map(x => x.t)))}s bloom ${med(fl.map(x => x.bloomed))})` : '');
  };
  const g1 = [tryOne(0), tryOne(1)].filter(Boolean).join(' | ');
  if (rs[0].trace.length) console.log(rs[0].trace.join('\n'));
  const sm = rs.filter(r => r.run), why = {};
  for (const r of sm) for (const [k, v] of Object.entries(r.losses)) why[k] = (why[k] || 0) + v;
  const summer = sm.length ? ` | summer: median ${med(sm.map(r => r.summer))} (p25 ${[...sm.map(r => r.summer)].sort((a, b) => a - b)[sm.length >> 2]}), ` +
    `${Math.round(med(sm.map(r => r.summerT)) / 6) / 10} min, lost at ${med(sm.flatMap(r => r.lostAt))}, losses ${Object.entries(why).map(([k, v]) => k + ' ' + v).join(' ')}; campaign ${Math.round(med(sm.map(r => r.campT)) / 6) / 10} min` : '';
  if (sm.length) console.log(`  spring at summer garden 1/3/6/10/15/20: ${[0, 2, 5, 9, 14, 19].map(i => { const v = sm.map(r => r.starts[i]).filter(x => x !== undefined); return v.length ? `${med(v)}(${v.length})` : '-'; }).join(' ')}`);
  if (process.env.LOSSES) for (const r of rs) for (const l of r.info) console.log('  ' + l);
  if (process.env.BRIEF) console.log(`${name.padEnd(11)} camp ${pct(sm.length).padStart(4)}${summer} | ${achs}`);
  else console.log(`${name.padEnd(11)} run ${pct(rs.filter(r => r.run).length).padStart(4)} | warm-up, g1–5 1st/any: ${per}${summer} | ${achs} || ${g1}`);
}

const runs = +process.argv[2] || 100;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
for (const kv of (process.argv[4] || '').split(/,(?![^\[]*\])/).filter(Boolean)) { const [k, v] = kv.split('='); overrides[k] = v; }
const file = buildDebug(overrides);
const browser = await chromium.launch();
if (process.env.GEN) { await genPool(browser, file); await browser.close(); process.exit(0); }
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run({ ...BOTS[n], trace: !!process.env.TRACE, summerOnly: !!process.env.SUMMER }, runs, file, browser));
}
await browser.close();
