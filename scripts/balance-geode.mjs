// Headless balance bots for Geode.
//
// Usage: node scripts/balance-geode.mjs [runs=200] [bot,bot,...] [CONST=value,...] [lag=s] [think=s]
//   e.g. node scripts/balance-geode.mjs 200 skilled,noCleave IMP_RISE=0.015
//        node scripts/balance-geode.mjs 200 skilled think=1.5     (sweep think time / action rate)
//        node scripts/balance-geode.mjs 200 skilled lag=0.8       (sweep reaction lag)
//        node scripts/balance-geode.mjs 1 skilled trace=1000      (one line per geode, one seed)
//        node scripts/balance-geode.mjs 1 skilled trace=1000 every=10   (plus a line every 10 s)
//        node scripts/balance-geode.mjs 1 probe                   (still-screen probe, see below)
//
// Builds a debug copy of games/geode.html (state on window, seeded Math.random,
// no animation loop), then plays seeded runs in headless Chromium by calling
// step() directly. A run goes geode after geode until 3 shatters, a stall
// (one geode over MAX_GEODE_S) or MAX_MIN. Prints one line per bot.
// Bots act on what the player sees (each site's strain, the dark impurities,
// the pool's motes, the thermostat ring, the event warning), `think` s apart,
// and each action lands `lag` s after the bot decided it.
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/geode.html');
const MAX_MIN = 40, MAX_GEODE_S = 1e9;

const BOTS = {
  // Never touches anything; harvests the moment the quota is reached.
  idle: { thermo: 'none', seed: 'none', cleave: 'none', bank: 0, lag: 0.4, think: 0.6 },
  // Seeds anywhere on the frontier as fast as the pool allows; thermostat and cleave untouched.
  spam: { thermo: 'none', seed: 'spam', cleave: 'none', bank: 0, lag: 0.3, think: 0.3 },
  // Thermostat at full cold, auto growth only.
  cold: { thermo: 'park', park: 0, seed: 'none', cleave: 'none', bank: 0, lag: 0.4, think: 0.6 },
  // Thermostat parked in the anneal glow; seeds and cleaves like skilled.
  annealPark: { thermo: 'park', park: 0.6, seed: 'skilled', cleave: 'skilled', bank: 0.1, lag: 0.3, think: 0.4 },
  // Thermostat parked hot (melt zone).
  meltPark: { thermo: 'park', park: 0.9, seed: 'skilled', cleave: 'skilled', bank: 0.1, lag: 0.3, think: 0.4 },
  // Skilled seeding and cleaving; thermostat cycles cold/anneal on a clock, never reading strain.
  timer: { thermo: 'timer', cold: 0.15, seed: 'skilled', cleave: 'skilled', bank: 0.1, lag: 0.3, think: 0.4 },
  // Skilled, never cleaves.
  noCleave: { thermo: 'skilled', hi: 0.5, lo: 0.3, cold: 0.15, push: 0.2, seed: 'skilled', cleave: 'none', bank: 0.1, lag: 0.3, think: 0.4 },
  // Skilled, never seeds.
  noSeed: { thermo: 'skilled', hi: 0.5, lo: 0.3, cold: 0.15, push: 0.2, seed: 'none', cleave: 'skilled', bank: 0.1, lag: 0.3, think: 0.4 },
  // Skilled, but cleaves anything strained.
  cleaveSpam: { thermo: 'skilled', hi: 0.5, lo: 0.3, cold: 0.15, push: 0.2, seed: 'skilled', cleave: 'spam', bank: 0.1, lag: 0.3, think: 0.4 },
  // First-timer: seeds mostly kinks, ignores strain until a site turns red, nudges the thermostat,
  // cleaves impurities late with shaky aim, 2-3 wrong holds, slow.
  novice: { thermo: 'novice', seed: 'novice', cleave: 'novice', bank: 0, lag: 0.8, think: 1.5 },
  // Reads strain: seeds kinks, anneals when max strain > 0.35 and grows cold again below 0.2,
  // compensates events, cleaves impurities and near-cracks by priority, banks at quota + 10%.
  skilled: { thermo: 'skilled', hi: 0.5, lo: 0.3, cold: 0.15, push: 0.2, seed: 'skilled', cleave: 'skilled', bank: 0.1, lag: 0.3, think: 0.4 },
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
    get state() { return state; }, get g() { return g; }, get attempt() { return attempt; }, get chambers() { return chambers; },
    get banked() { return banked; }, get t() { return t; }, get sigma() { return sigma; }, get T() { return T; },
    get Ts() { return Ts; }, get mass() { return mass; }, get quota() { return quota; }, get ev() { return ev; },
    get cdUntil() { return cdUntil; }, get cracks() { return cracks; }, get cleaves() { return cleaves; },
    get seeds() { return seeds; }, get autoN() { return autoN; }, get annealS() { return annealS; },
    get lastCarats() { return lastCarats; }, get reason() { return lastReason; },
    occ, s, imp, kk, N, NB, CORE, RING, SEED_ION, POOL_LIFE, SIG_CAP, ION, EV_OFF, MELT, earned: runEarned,
    step, setThermo, seedAt, cleaveAt, harvest, nextGeode, retryGeode, newRun, clarity, meanS, isFrontier, evOffset,
    draw: () => { consumeFx(); born.fill(-9); hud(); draw(); }, hints, fitPool,
  };
  newRun();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'geode-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot, maxMin, maxGeodeS, trace, every }) {
  const D = window.__dbg, N = D.N;
  window.__seed(seed);
  D.newRun();
  let bs = seed * 7919 + 13;
  const rnd = () => { bs = (bs * 16807) % 2147483647; return bs / 2147483647; };
  const dt = 0.1;
  let t = 0, nextAct = 0, wrongHolds = 0, annealing = false, novTarget = 0.35, end = 'cap';
  const rows = [], geodes = [], queue = [];
  let firstHarvest = null, g1Won = null, cleaveDrop = 0, pending = false;
  const later = (fn, extra = 0) => queue.push({ at: t + bot.lag + extra, fn });
  const HOLD = 0.45;

  function scan() {
    let maxS = 0, nImp = 0;
    const imps = [], hot = [];
    for (let i = 0; i < N; i++) {
      if (!D.occ[i]) continue;
      if (D.imp[i]) { imps.push(i); nImp++; continue; }
      if (D.s[i] > maxS) maxS = D.s[i];
      if (!D.CORE[i] && D.s[i] > 0.85 && D.RING[i] <= 3) hot.push(i);
    }
    return { maxS, imps, hot };
  }
  function frontier() { const f = []; for (let i = 0; i < N; i++) if (D.isFrontier(i)) f.push(i); return f; }
  function nbAvg(i) { let a = 0, n = 0; for (const j of D.NB[i]) if (D.occ[j]) { a += D.s[j]; n++; } return n ? a / n : 0; }

  function thermo(v) { if (Math.abs(v - D.Ts) > 0.01) later(() => D.setThermo(v)); }

  function decide() {
    const sc = scan();
    // Harvest
    // Bank at quota + margin; the margin shrinks as the pool ages (more impurities, less income).
    if (D.mass >= D.quota * (1 + bot.bank * Math.max(0, 1 - D.t / (bot.decay || 150)))) { later(() => D.harvest()); return; }
    // Behind schedule (pool half spent, far from quota): accept more strain before annealing.
    const behind = bot.thermo === 'skilled' && D.t > 0.4 * D.POOL_LIFE && D.mass < D.quota * Math.min(1, D.t / (0.6 * D.POOL_LIFE));
    // Thermostat
    const off = D.ev && D.t >= D.ev.at - 1 ? D.evOffset() || (D.ev.kind === 'snap' || D.ev.kind === 'double' ? -D.EV_OFF : D.ev.kind === 'heat' ? D.EV_OFF : 0) : 0;
    if (bot.thermo === 'park') thermo(bot.park);
    else if (bot.thermo === 'timer') thermo((t % 30) < 15 ? bot.cold : 0.6);
    else if (bot.thermo === 'skilled') {
      if (sc.maxS > (behind ? bot.hi + bot.push : bot.hi)) annealing = true; else if (sc.maxS < (behind ? bot.lo + bot.push : bot.lo)) annealing = false;
      thermo(Math.max(0, Math.min(1, (annealing ? 0.6 : bot.cold) - off)));
    } else if (bot.thermo === 'novice') {
      // Nudges toward the glow once something looks red, back toward cold when it looks calm.
      if (sc.maxS > 0.7) novTarget = Math.min(0.65, novTarget + 0.1);
      else if (sc.maxS < 0.3) novTarget = Math.max(0.2, novTarget - 0.05);
      thermo(novTarget);
    }
    // Cleave
    if (D.t >= D.cdUntil && !pending && bot.cleave !== 'none') {
      let pick = -1;
      if (bot.cleave === 'skilled' || bot.cleave === 'spam') {
        let best = -1e9;
        for (const i of sc.imps) { const p = D.s[i] + (4 - D.RING[i]) * 0.1; if (p > best) { best = p; pick = i; } }
        if (pick < 0 && sc.hot.length) pick = sc.hot.sort((a, b) => D.s[b] - D.s[a])[0];
        if (pick < 0 && bot.cleave === 'spam') {
          for (let i = 0; i < N; i++) if (D.occ[i] && !D.CORE[i] && D.s[i] > 0.4) { pick = i; break; }
        }
      } else if (bot.cleave === 'novice') {
        if (D.t > 15 && wrongHolds < 3 && rnd() < 0.05) {
          wrongHolds++;
          const o = []; for (let i = 0; i < N; i++) if (D.occ[i] && !D.CORE[i]) o.push(i);
          if (o.length) pick = o[Math.floor(rnd() * o.length)];
        } else {
          const late = sc.imps.filter(i => D.s[i] > 0.8);
          if (late.length) {
            pick = late[0];
            if (rnd() < 0.3) { const nb = D.NB[pick].filter(j => D.occ[j] && !D.CORE[j]); if (nb.length) pick = nb[Math.floor(rnd() * nb.length)]; }
          }
        }
      }
      if (pick >= 0) {
        // The hold lands lag + HOLD later, on whatever the site is then (a player sees a healed site and lets go).
        const wasImp = D.imp[pick];
        pending = true;
        later(() => { pending = false; if (bot.cleave !== 'novice' && wasImp && !D.imp[pick]) return; const n = D.cleaveAt(pick); if (n > 1) cleaveDrop += n - 1; }, HOLD);
        return;
      }
    }
    // Seed
    if (bot.seed !== 'none' && D.sigma >= D.SEED_ION) {
      const f = frontier();
      if (!f.length) return;
      let pick = -1;
      if (bot.seed === 'spam') pick = f[Math.floor(rnd() * f.length)];
      else if (bot.seed === 'skilled') {
        let best = -1e9;
        for (const i of f) { if (D.kk[i] < 2) continue; const v = D.kk[i] - 3 * nbAvg(i); if (v > best) { best = v; pick = i; } }
        // Seeds cost more than auto growth: spend only what would overflow the pool (it fills while annealing).
        if (D.sigma < D.SIG_CAP - 0.15) pick = -1;
      } else if (bot.seed === 'novice') {
        if (rnd() < 0.5) return;
        const kinks = f.filter(i => D.kk[i] >= 2);
        const pool = kinks.length && rnd() < 0.7 ? kinks : f;
        pick = pool[Math.floor(rnd() * pool.length)];
      }
      if (pick >= 0) later(() => D.seedAt(pick));
    }
  }

  let geodeT0 = 0;
  while (t < maxMin * 60) {
    const st = D.state;
    if (st !== 'playing') {
      geodes.push({ reason: D.reason, g: D.g, won: st === 'banked', t: D.t, mass: D.mass, cl: D.clarity(), carats: st === 'banked' ? D.lastCarats : 0, cracks: D.cracks, cleaves: D.cleaves, seeds: D.seeds, anneal: D.annealS });
      if (trace) rows.push(`g${D.g}.${D.attempt} ${st} t ${D.t.toFixed(0)}s mass ${D.mass}/${D.quota} clarity ${(100 * D.clarity()).toFixed(0)}% carats ${geodes.at(-1).carats} | cracks ${D.cracks} cleaves ${D.cleaves} seeds ${D.seeds} auto ${D.autoN} anneal ${D.annealS.toFixed(0)}s | banked ${D.banked}`);
      if (st === 'banked' && firstHarvest === null) firstHarvest = D.t;
      if (D.g === 1 && g1Won === null) g1Won = st === 'banked';
      if (st === 'over') { end = D.reason; break; }
      if (st === 'banked') D.nextGeode(); else D.retryGeode();
      queue.length = 0; pending = false; annealing = false; novTarget = 0.35; geodeT0 = t;
    }
    if (D.t > maxGeodeS) { end = 'stall'; if (trace) rows.push(`g${D.g} stall mass ${D.mass}/${D.quota}`); break; }
    if (trace && every && Math.abs(D.t / every - Math.round(D.t / every)) < 0.05 / every) {
      const sc = scan();
      rows.push(`  t ${D.t.toFixed(0)} mass ${D.mass} sig ${D.sigma.toFixed(2)} T ${D.T.toFixed(2)}/${D.Ts.toFixed(2)} maxS ${sc.maxS.toFixed(2)} mean ${D.meanS().toFixed(2)} imps ${sc.imps.length} | cleaves ${D.cleaves} seeds ${D.seeds} auto ${D.autoN} cracks ${D.cracks} cleaveDrop ${cleaveDrop}`);
    }
    if (t >= nextAct) { decide(); nextAct = t + bot.think * (0.7 + 0.6 * rnd()); }
    for (let j = queue.length - 1; j >= 0; j--) if (queue[j].at <= t) { const q = queue.splice(j, 1)[0]; q.fn(); }
    D.step(dt);
    t += dt;
  }
  const won = geodes.filter(x => x.won);
  const losses = geodes.filter(x => !x.won).map(x => x.reason);
  return { geode: D.g, banked: D.banked, t, end, firstHarvest, g1Won, shatters: geodes.filter(x => !x.won).length,
    wins: won.length, losses, roundT: won.map(x => x.t), clarity: won.map(x => x.cl), earned: [...D.earned], rows };
}

async function run(bot, runs, file, browser, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot, maxMin: MAX_MIN, maxGeodeS: MAX_GEODE_S }); }
    await page.close();
  }));
  return results;
}

function report(name, rs) {
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * f))] : NaN; };
  const pct = n => `${Math.round(100 * n / rs.length)}%`;
  const gd = rs.map(r => r.geode);
  const ends = {};
  for (const r of rs) ends[r.end] = (ends[r.end] || 0) + 1;
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  const all = (k) => rs.flatMap(r => r[k]);
  const lr = {}; for (const x of all('losses')) lr[x] = (lr[x] || 0) + 1;
  console.log(`${name.padEnd(10)} geode p10/med/p90 ${q(gd, 0.1)}/${q(gd, 0.5)}/${q(gd, 0.9)}` +
    ` | g1 won ${pct(rs.filter(r => r.g1Won).length)} >=3 ${pct(rs.filter(r => r.geode >= 3).length)} >=5 ${pct(rs.filter(r => r.geode >= 5).length)}` +
    ` | min p10/med ${(q(rs.map(r => r.t), 0.1) / 60).toFixed(1)}/${(q(rs.map(r => r.t), 0.5) / 60).toFixed(1)}` +
    ` | round ${q(all('roundT'), 0.5)?.toFixed?.(0)}s clar ${Math.round(100 * q(all('clarity'), 0.5))}% carats ${q(rs.map(r => r.banked), 0.5)}` +
    ` | end ${Object.entries(ends).map(([k, v]) => `${k} ${pct(v)}`).join(' ')} lost ${Object.entries(lr).map(([k, v]) => `${k} ${v}`).join(' ')}` +
    ` | ${Object.entries(ach).map(([k, v]) => `${k} ${pct(v)}`).join(', ')}`);
}

// Still-screen probe (findings: a budget at zero must not freeze the round): with nothing
// touched, after every 20 s window something must have changed (growth, strain, an impurity).
async function probe(file, browser) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(file).href);
  const r = await page.evaluate(() => {
    const D = window.__dbg; const still = {}, worst = {};
    for (const park of [0, 0.35, 0.6, 0.9]) { still[park] = 0; worst[park] = 0; } for (const park of [0, 0.35, 0.6, 0.9]) for (let seed = 1; seed <= 20; seed++) {
      window.__seed(seed); D.newRun(); D.setThermo(park);
      let sig = () => D.mass + ':' + Array.from(D.s).reduce((a, b) => a + b, 0).toFixed(3);
      let prev = sig(), quiet = 0;
      for (let k = 0; k < 4000 && D.state === 'playing'; k++) {
        D.step(0.1); const now = sig();
        if (now === prev) { quiet += 0.1; if (quiet > worst[park]) worst[park] = quiet; if (quiet >= 20) { still[park]++; break; } } else quiet = 0;
        prev = now;
      }
    }
    return { still, worst };
  });
  for (const k in r.still) console.log(`probe thermostat ${k}: still-screen runs ${r.still[k]}/20, longest quiet ${r.worst[k].toFixed(1)} s`);
}

const args = process.argv.slice(2);
const runs = +args[0] || 200;
const names = (args[1] || Object.keys(BOTS).join(',')).split(',');
const overrides = {}, botOver = {};
for (const a of args.slice(2)) for (const kv of a.split(/,(?![^\[]*\])/).filter(Boolean)) {
  const [k, v] = kv.split('=');
  if (['lag', 'think', 'trace', 'bank', 'every', 'hi', 'lo', 'cold', 'push', 'decay'].includes(k)) botOver[k] = +v; else overrides[k] = v;
}
const file = buildDebug(overrides);
const browser = await chromium.launch();
if (names[0] === 'probe') { await probe(file, browser); await browser.close(); process.exit(0); }
if (botOver.trace !== undefined) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(file).href);
  for (const n of names) {
    const r = await page.evaluate(playInPage, { seed: botOver.trace, bot: { ...BOTS[n], ...botOver }, maxMin: MAX_MIN, maxGeodeS: MAX_GEODE_S, trace: true, every: botOver.every });
    console.log(`# ${n}`); for (const row of r.rows) console.log(row);
    console.log(`end ${r.end} at ${(r.t / 60).toFixed(1)} min, banked ${r.banked}`);
  }
  await browser.close();
  process.exit(0);
}
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run({ ...BOTS[n], ...botOver }, runs, file, browser));
}
await browser.close();
