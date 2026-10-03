// Headless balance bots for Lighthouse Keeper.
//
// Usage: node scripts/balance-lighthouse-keeper.mjs [runs=100] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-lighthouse-keeper.mjs 100 skilled,sweep LAMP=1.2
//   RETRIES=n: tries per night after the first (default 2); ACT=s: seconds
//   between discrete actions (aim retargets, shutter, flare; default 0.5).
//   dbg:<bot> prints one line per night played by that bot.
//
// Builds a debug copy of games/lighthouse-keeper.html (state on window,
// seeded Math.random, no animation loop), then plays seeded runs in headless
// Chromium by calling step() directly. A run goes night after night (8 nights,
// then endless) until a night is lost RETRIES + 1 times, or 30 nights.
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/lighthouse-keeper.html');

// Bots:
//   idle: no input (lamp open, pointing straight out).
//   sweep: swings the beam end to end without stopping; never shutters or flares.
//   nearest: holds the beam on the ship nearest the lamp; never shutters or flares.
//   skilled: reads fog, oil and courses: lights the fogged ship whose course hits
//     rock soonest, shutters when no fogged ship hits rock within 12 s, flares
//     (aimed between them) when 2+ fogged ships hit rock within 8 s outside the beam (oil above 25).
//   noshutter / noflare: skilled without that verb.
//   flarespam: skilled that also fires a full flare whenever the oil allows.
//   novice: a first-time player. Reads for 3 s, then every 1.5-3 s turns the
//     beam toward a ship (a fogged one 60% of the time) with a 0.6 s lag, flips
//     the shutter by mistake now and then (and notices 3-6 s later), shutters
//     1 time in 3 when no ship is fogged (opens again when one is), and from
//     night 3 flares at a crowd 1 time in 3, at a random size.
const BOTS = {
  idle: {},
  sweep: { sweep: true },
  nearest: { nearest: true },
  skilled: { plan: true, shutter: true, flare: true },
  noshutter: { plan: true, flare: true },
  noflare: { plan: true, shutter: true },
  flarespam: { plan: true, shutter: true, flare: true, spam: true },
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
    get ships() { return ships; }, get reefs() { return reefs; }, get oil() { return oil; }, get open() { return open; },
    get beam() { return beam; }, get aim() { return aim; }, get t() { return t; }, get spec() { return spec; },
    get night() { return night; }, get state() { return state; }, get total() { return total; }, get st() { return st; },
    earned: runEarned, LH, PORT, COAST, SPEED, BIG_SPEED, SEE, TURN, FLARE_MIN, FLARE_MAX, OIL_MAX,
    fogAt, inBeam, canSee, setAim, toggleShutter, flare, step, newRun, nextNight, retryNight,
  };
  newRun();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lhk-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page: one whole run.
function playInPage({ seed, bot, retries, act }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newRun();
  const rnd = Math.random, dt = 1 / 60, hyp = Math.hypot;
  const nights = [];
  let runT = 0, firstLossT = -1, firstLossN = 0, sawAll = -1;
  const angTo = s => Math.atan2(Math.min(s.y, D.LH.y - 10) - D.LH.y, s.x - D.LH.x);
  // Seconds until a ship holding its course hits rock or shore (99: not within 12 s).
  function danger(s) {
    const v = s.big ? D.BIG_SPEED : D.SPEED;
    let x = s.x, y = s.y;
    for (let k = 1; k <= 48; k++) {
      x += Math.cos(s.h) * v * 0.25; y += Math.sin(s.h) * v * 0.25;
      if (hyp(x - D.PORT.x, y - D.PORT.y) < D.PORT.r) return 99;
      if (y > D.COAST - 4) return k * 0.25;
      for (const r of D.reefs) if (hyp(x - r.x, y - r.y) < r.r + 4) return k * 0.25;
    }
    return 99;
  }
  const live = () => D.ships.filter(s => !s.done);
  // A ship needs light if the fog around it is too thick to see through.
  const needs = s => D.fogAt(s.x, s.y) >= D.SEE * 0.85;

  for (let n = 0; n < 30; n++) {
    let tries = 0;
    for (;;) {
      let nextAct = 0, tick = 0, sweepDir = 1, target = null, novNext = D.night === 1 && tries === 0 ? 3 : 1.5;
      let lagAim = null, lagAt = 0, mistakeFix = -1, flareCool = 0;
      while (D.state === 'playing') {
        if (tick++ % 6 === 0) {
          const L = live();
          if (bot.sweep) {
            if (D.beam < -Math.PI + 0.2) sweepDir = 1; else if (D.beam > -0.2) sweepDir = -1;
            D.setAim(D.beam + sweepDir * 0.6);
          } else if (bot.nearest) {
            let b = null, bd = 1e9;
            for (const s of L) { const d = hyp(s.x - D.LH.x, s.y - D.LH.y); if (d < bd) { bd = d; b = s; } }
            if (b) D.setAim(angTo(b));
          } else if (bot.plan) {
            const scored = L.filter(needs).map(s => ({ s, d: danger(s) })).sort((a, b) => a.d - b.d);
            const urgent = scored.filter(x => x.d < 12);
            if (D.t >= nextAct || !target || target.done) {
              const pick = urgent[0] || scored[0];
              if (pick && pick.s !== target) { target = pick.s; nextAct = D.t + act; }
            }
            if (target && !target.done) D.setAim(angTo(target));
            if (bot.shutter && D.t >= nextAct) {
              const want = urgent.length > 0;
              if (want !== D.open && (D.open || D.oil > 2)) { D.toggleShutter(); nextAct = D.t + act; }
            } else if (!bot.shutter && !D.open) D.toggleShutter();
            if (bot.flare && D.t >= nextAct) {
              const hot = urgent.filter(x => x.d < 8 && !D.inBeam(x.s.x, x.s.y));
              if ((hot.length >= 2 && D.oil > 25) || (bot.spam && D.oil > D.FLARE_MAX + 5)) {
                const set = hot.length ? hot : urgent;
                if (set.length) {
                  const mid = set.reduce((a, x) => a + angTo(x.s), 0) / set.length;
                  D.setAim(mid);
                  // Let the lamp swing round, then fire.
                  for (let k = 0; k < 30 && Math.abs(D.beam - D.aim) > 0.05 && D.state === 'playing'; k++) { D.step(dt); runT += dt; }
                  if (D.state === 'playing') D.flare(D.oil > 55 ? 1 : 0.5);
                  nextAct = D.t + act;
                }
              }
            }
          } else if (bot.novice && D.t >= novNext) {
            novNext = D.t + 1.5 + 1.5 * rnd();
            const blind = L.filter(needs);
            const pool = blind.length && rnd() < 0.6 ? blind : L;
            if (pool.length) { lagAim = pool[Math.floor(rnd() * pool.length)]; lagAt = D.t + 0.6; }
            if (rnd() < 0.08 && D.open) { D.toggleShutter(); mistakeFix = D.t + 3 + 3 * rnd(); }
            // Has read the shutter hint: shutters now and then when no ship is fogged, opens when one is.
            else if (D.open && !blind.length && rnd() < 0.3) D.toggleShutter();
            else if (!D.open && blind.length && mistakeFix < 0 && rnd() < 0.7) D.toggleShutter();
            if (D.night >= 3 && D.t > flareCool && blind.length >= 2 && rnd() < 0.33) {
              D.flare(rnd()); flareCool = D.t + 10;
            }
          }
          if (bot.novice) {
            if (lagAim && D.t >= lagAt && !lagAim.done) D.setAim(angTo(lagAim));
            if (!D.open && mistakeFix >= 0 && D.t >= mistakeFix) { D.toggleShutter(); mistakeFix = -1; }
          }
        }
        if (D.state === 'playing') { D.step(dt); runT += dt; }
      }
      const won = D.state === 'night';
      nights.push({ n: D.night, won, home: D.st.home, wrecks: D.st.wrecks, dark: D.st.darkS, shut: D.st.shutS, flares: D.st.flares,
        oil: D.oil, dry: D.st.dryS, t: D.t, try: tries });
      if (bot.dbg) console.log(seed, D.night, won ? 'won' : 'lost', 'home', D.st.home, 'wrecks', D.st.wrecks, 'oil', Math.round(D.oil),
        'dry', Math.round(D.st.dryS), 'shut', Math.round(D.st.shutS), 'flares', D.st.flares, 't', Math.round(D.t));
      if (!won && firstLossT < 0) { firstLossT = runT; firstLossN = D.night; }
      if (won) break;
      if (++tries > retries) return { nights, runT, firstLossT, firstLossN, last: D.night, score: D.total, sawAll, earned: [...D.earned] };
      D.retryNight();
    }
    if (D.night === 8 && sawAll < 0) sawAll = runT;
    D.nextNight();
  }
  return { nights, runT, firstLossT: firstLossT < 0 ? runT : firstLossT, firstLossN, last: D.night, score: D.total, sawAll, earned: [...D.earned], capped: true };
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

// One line per bot: % of runs that won each of nights 1-8 (first try or after
// retries), median nights won, median minutes per run (to the last loss) and to
// the first loss, minutes to reach night 8, median score (ships home), then
// per-night medians (wrecks, s dark, s shuttered, flares, s out of oil, oil at
// the end) and achievements.
function report(name, rs) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const pct = (n, d) => d ? Math.round(100 * n / d) : 0;
  const won = n => pct(rs.filter(r => r.nights.some(x => x.n === n && x.won)).length, rs.length);
  const all = rs.flatMap(r => r.nights);
  const m = k => Math.round(med(all.map(x => x[k])) * 10) / 10;
  const saw = rs.filter(r => r.sawAll >= 0);
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  const achs = Object.entries(ach).sort().map(([k, v]) => `${k} ${pct(v, rs.length)}%`).join(', ');
  const mins = x => (x / 60).toFixed(1);
  console.log(`${name.padEnd(9)} won n1-8 ${[1, 2, 3, 4, 5, 6, 7, 8].map(won).join('/')}% | nights ${med(rs.map(r => r.last - 1))}` +
    ` | run ${mins(med(rs.map(r => r.runT)))} min, 1st loss ${mins(med(rs.map(r => r.firstLossT)))} min (n${med(rs.map(r => r.firstLossN))})` +
    ` | n8 by ${saw.length ? mins(med(saw.map(r => r.sawAll))) : '-'} min | score ${med(rs.map(r => r.score))} max ${Math.max(...rs.map(r => r.score))}` +
    ` | per night: wrecks ${m('wrecks')} dark ${m('dark')}s shut ${m('shut')}s flares ${m('flares')} dry ${m('dry')}s oil ${m('oil')}` +
    `${rs.some(r => r.capped) ? ' | CAPPED ' + pct(rs.filter(r => r.capped).length, rs.length) + '%' : ''} || ${achs}`);
}

const runs = +process.argv[2] || 100;
const BOTS_ALL = BOTS;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
const opts = { retries: 2, act: 0.5 };
for (const kv of (process.argv[4] || '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  if (k === 'RETRIES') opts.retries = +v; else if (k === 'ACT') opts.act = +v; else overrides[k] = v;
}
const file = buildDebug(overrides);
const browser = await chromium.launch();
for (const n of names) {
  if (n.startsWith('dbg:')) { report(n, await run({ ...BOTS[n.slice(4)], dbg: true }, runs, file, browser, opts)); continue; }
  if (!BOTS_ALL[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS_ALL[n], runs, file, browser, opts));
}
await browser.close();
