// Headless balance bots for Hot Iron.
//
// Usage: node scripts/balance-hot-iron.mjs [runs=200] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-hot-iron.mjs 200 reader,blind COOL=0.12,TOL=0.08
//
// Builds a debug copy of games/hot-iron.html (state on window, seeded
// Math.random, no animation loop), then plays seeded bars in headless
// Chromium by calling step() directly. Profiles rotate with the seed. Prints
// one line per bot. Adapted from balance-orbit-garden.mjs.
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/hot-iron.html');

// Every bot works in human-like time: `gap` s of thinking between discrete
// actions (a strike, or starting/stopping a hold), `react` s late when letting
// go of a hold. `rate` scales both (2 = twice as fast). Readers see heat as
// colour: true temperature plus Gaussian noise `tnoise`. They also mis-tap
// the neighbouring segment with probability `miss`.
//   reader: picks the segment most off target; if it's too thick it pushes
//     metal toward the side that lacks metal, if too thin it pulls from the
//     side with metal to spare. Heats the donor and receiver together (hold
//     on the seam between them), strikes the donor when its colour gives
//     about the right amount and the receiver is soft, waits when too hot.
//   nosteer: the reader, but it heats centred on the donor and ignores the
//     neighbours' colours (reads only the struck segment).
//   blind: fixed rhythm that ignores colour: heat the most off-target
//     segment for `hold` s, then strike it twice.
//   blind-seam: the reader's choice of donor and receiver and its seam
//     heating, but a fixed rhythm (`hold` s of heat, then two strikes) instead
//     of reading colour.
//   slow-hands: the reader with a 0.5 s reaction when letting go of a hold
//     (the rate sweep scales think time only). slow-early also lets go
//     early, judging how fast the colour is rising, as a player learns to.
//   novice: a first-time player (v2, from the first playtest: both rounds
//     lost to cracks in under 15 s). Taps the most off-target segment 3 times
//     on the cold bar, then tries to grow the thinnest segment by heating it
//     for `grow` s and striking it, then plays as the reader. novice-slow
//     adds the slow-hands release.
const HUMAN = { gap: 0.5, react: 0.25, tnoise: 0.03, miss: 0.03 };
const BOTS = {
  reader: { ...HUMAN, policy: 'reader', rate: 1 },
  'reader-0.5x': { ...HUMAN, policy: 'reader', rate: 0.5 },
  'reader-2x': { ...HUMAN, policy: 'reader', rate: 2 },
  'slow-hands': { ...HUMAN, policy: 'reader', rate: 1, react: 0.5 },
  'slow-early': { ...HUMAN, policy: 'reader', rate: 1, react: 0.5, early: true },
  nosteer: { ...HUMAN, policy: 'reader', rate: 1, nosteer: true },
  blind: { ...HUMAN, policy: 'blind', rate: 1, hold: 1.5 },
  'blind-seam': { ...HUMAN, policy: 'blind', rate: 1, hold: 1.2, seam: true },
  novice: { ...HUMAN, policy: 'reader', rate: 1, novice: true, grow: 2.5 },
  'novice-slow': { ...HUMAN, policy: 'reader', rate: 1, react: 0.5, novice: true, grow: 2.5 },
  idle: { ...HUMAN, policy: 'idle', rate: 1 },
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
  const tail = '  newBar(profile);\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get state() { return state; }, get elapsed() { return elapsed; }, get segs() { return segs; },
    get target() { return target; }, get fuel() { return fuel; }, get cracks() { return cracks; },
    get strikes() { return strikes; },
    N, T_WORK, T_BURN, TOL, TH_MIN, FUEL_MAX, STRIKE_BASE, STRIKE_GAIN, FLOW_T0, FLOW_SPAN, FLOW_NEED,
    PROFILES, softness, earned: roundEarned, step, strike, setHeat, newBar,
  };
  newBar(0);
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hot-iron-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newBar(seed % D.PROFILES.length);
  let s = seed * 7919;
  const rand = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const DT = 1 / 60, N = D.N, S = D.segs;
  const gap = bot.gap / bot.rate, react = bot.react;
  let heating = null, lastT = null;
  const advance = t => { for (let k = 0; k < Math.round(t / DT) && D.state === 'playing'; k++) D.step(DT); };
  const setHeat = x => { heating = x; D.setHeat(x); };
  const tap = i => {
    const r = rand();
    if (r < bot.miss / 2) i--; else if (r < bot.miss) i++;
    D.strike(Math.max(0, Math.min(N - 1, i)));
  };
  const soft = D.softness;
  const err = i => S[i].th - D.target[i];

  // The job: the thickest segment (preferring one that is already hot)
  // pushes metal toward the side of the bar that lacks it, at most as much as
  // has to cross that seam and never so much that it ends up too thin itself.
  // If nothing is too thick, the seam where the most metal still has to cross
  // decides (the donor is then a conduit that gets refilled).
  function job(Tp) {
    // Metal burned away is spread as a shortfall over the whole target.
    const lost = S.reduce((a, x, k) => a + err(k), 0) / N;
    const e = S.map((x, k) => err(k) - lost);
    const total = 0;
    const F = []; let acc = 0; for (let k = 0; k < N; k++) { acc += e[k]; F.push(acc); } // excess at or left of k
    let best = null;
    for (let i = 0; i < N; i++) {
      if (e[i] <= D.TOL * 0.5) continue;
      const L = i > 0 ? F[i - 1] : 0, R = total - F[i];
      const recv = i === 0 ? 1 : i === N - 1 ? N - 2 : (L < R ? i - 1 : i + 1);
      const flux = recv > i ? F[i] : total - (i > 0 ? F[i - 1] : 0);
      const amount = Math.min(flux, e[i] + D.TOL * 0.8);
      if (amount < 0.06) continue; // less than the lightest blow
      const score = e[i] * (1 + 2 * soft(Tp[i]));
      if (!best || score > best.score) best = { donor: i, recv, amount, score };
    }
    if (best) return best;
    for (let j = 0; j < N - 1; j++) {
      if (Math.abs(F[j]) < D.TOL * 0.5) continue;
      const donor = F[j] > 0 ? j : j + 1, recv = F[j] > 0 ? j + 1 : j;
      if (Math.min(Math.abs(F[j]), e[donor] + D.TOL * 0.8) < 0.06) continue;
      const score = Math.abs(F[j]) * (1 + 2 * soft(Tp[donor]));
      if (!best || score > best.score) best = { donor, recv, amount: Math.min(Math.abs(F[j]), e[donor] + D.TOL * 0.8), score };
    }
    if (best && best.amount >= 0.06) return best;
    let i = -1;
    for (let k = 0; k < N; k++) if (Math.abs(e[k]) > D.TOL * 0.6 && (i < 0 || Math.abs(e[k]) > Math.abs(e[i]))) i = k;
    if (i < 0) return null;
    const side = i === 0 ? 1 : i === N - 1 ? N - 2 : (e[i - 1] > e[i + 1] ? i - 1 : i + 1);
    return e[i] > 0 ? { donor: i, recv: side === i - 1 ? i + 1 : i - 1, amount: e[i] } : { donor: side, recv: i, amount: -e[i] };
  }

  // Strike when the donor is in the working range and the blow won't move
  // more metal than the job needs (hotter moves more); heat the seam between
  // donor and receiver when it's too cold; wait when it's too hot.
  function readerAction() {
    let Tp = S.map(x => x.T + gauss() * bot.tnoise);
    // Letting go early: judge the colour it will have reached by the time the
    // hand lets go (rise over the last look, projected over the reaction).
    if (bot.early && heating !== null && lastT) Tp = Tp.map((t, k) => t + Math.max(0, S[k].T - lastT[k]) / 0.1 * bot.react);
    lastT = S.map(x => x.T);
    const j = job(Tp);
    if (!j) return { wait: true };
    const { donor, recv } = j;
    const other = donor + (donor - recv);
    const th = S[donor].th;
    const blow = T => th * (D.STRIKE_BASE + D.STRIKE_GAIN * Math.min(1, (T - D.T_WORK) / (D.T_BURN - D.T_WORK)));
    const wr = soft(Tp[recv]), wo = other >= 0 && other < N ? soft(Tp[other]) : 0;
    const recvOk = bot.nosteer || (wr >= 0.4 && wo / (wr + wo + 1e-9) <= 0.25);
    const hotEnough = Tp[donor] >= D.T_WORK + 0.04;
    const notTooMuch = blow(Tp[donor]) <= Math.max(j.amount + D.TOL * 0.4, blow(D.T_WORK + 0.1));
    if (hotEnough && notTooMuch && recvOk) return { strike: donor };
    if (hotEnough && !notTooMuch) return { wait: true };
    const heatPos = bot.nosteer ? donor + 0.5 : Math.max(donor, recv) + 0.3 * (recv - donor);
    if ([donor, recv].some(k => Tp[k] > D.T_BURN - 0.1)) return { wait: true };
    if (hotEnough && !recvOk) {
      // The far side is as hot as the receiver: heat past the receiver so it
      // runs hotter (unless that would burn it), else let things cool.
      if (Tp[recv] < D.T_BURN - 0.15) return { heat: recv + 0.5 + 0.6 * (recv - donor) };
      return { wait: true };
    }
    return { heat: heatPos };
  }

  if (bot.novice) {
    // Hammer the cold bar where it looks most wrong.
    let i = 0;
    for (let k = 0; k < N; k++) if (Math.abs(err(k)) > Math.abs(err(i))) i = k;
    for (let k = 0; k < 3 && D.state === 'playing'; k++) { advance(gap); tap(i); }
    // Heat the segment that needs to grow, then hit it.
    let j = 0;
    for (let k = 0; k < N; k++) if (err(k) < err(j)) j = k;
    advance(gap * 0.5); setHeat(j + 0.5); advance(bot.grow); advance(react); setHeat(null);
    advance(gap); tap(j); advance(gap);
  }
  let blindPhase = 0, blindTarget = 0;
  while (D.state === 'playing' && D.elapsed < 400) {
    if (bot.policy === 'idle') { advance(1); continue; }
    if (bot.policy === 'blind') {
      // Heat for a fixed time, then strike twice, never looking at colour.
      if (blindPhase === 0) {
        let x;
        if (bot.seam) {
          const j = job(S.map(() => 0));
          if (!j) { advance(1); continue; }
          blindTarget = j.donor;
          x = Math.max(j.donor, j.recv) + 0.3 * (j.recv - j.donor);
        } else {
          let i = 0;
          for (let k = 0; k < N; k++) if (err(k) > err(i)) i = k;
          blindTarget = i;
          x = i + 0.5;
        }
        advance(gap * 0.5); setHeat(x); advance(bot.hold); advance(react); setHeat(null);
        blindPhase = 1;
      } else {
        tap(blindTarget); advance(gap);
        tap(blindTarget); advance(gap);
        blindPhase = 0;
      }
      if (D.fuel <= 0) advance(1);
      continue;
    }
    const a = readerAction();
    if (a.heat !== undefined && D.fuel > 0) {
      if (heating === null) advance(gap * 0.5); // reach for the spot
      setHeat(a.heat); advance(0.1);
      continue;
    }
    if (heating !== null) { advance(react); setHeat(null); }
    if (a.strike !== undefined) { tap(a.strike); advance(gap); continue; }
    advance(0.2);
  }
  if (heating !== null) setHeat(null);
  return {
    won: D.state === 'won', lost: D.state === 'lost', time: D.elapsed, fuelLeft: D.fuel / D.FUEL_MAX,
    cracks: D.cracks, strikes: D.strikes, profile: seed % D.PROFILES.length,
    off: S.filter((x, i) => Math.abs(x.th - D.target[i]) > D.TOL).length, earned: [...D.earned],
    burned: N - S.reduce((a, x) => a + x.th, 0),
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
  const why = `cracked ${pct(rs.filter(r => r.cracks >= 3).length)}, no fuel ${pct(rs.filter(r => r.lost && r.cracks < 3).length)}, timeout ${pct(rs.filter(r => !r.won && !r.lost).length)}`;
  const perProfile = [0, 1, 2, 3].map(p => { const g = rs.filter(r => r.profile === p); return g.length ? Math.round(100 * g.filter(r => r.won).length / g.length) : '-'; }).join('/');
  console.log(`${name.padEnd(11)} win ${pct(wins.length).padStart(4)} (by shape ${perProfile}) | ${why}` +
    ` | wins: ${Math.round(med(wins.map(r => r.time)))}s, ${med(wins.map(r => r.strikes))} strikes, fuel left ${Math.round(100 * med(wins.map(r => r.fuelLeft)))}%` +
    ` | cracks ${med(rs.map(r => r.cracks))}, off ${med(rs.map(r => r.off))}, burned ${med(rs.map(r => r.burned)).toFixed(2)} | ${achs}`);
}

const runs = +process.argv[2] || 200;
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
