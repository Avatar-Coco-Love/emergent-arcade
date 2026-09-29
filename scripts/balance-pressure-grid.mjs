// Headless bots for Pressure Grid: round win rate (TARGET eruptions within
// ROUND_S seconds), and how long each achievement takes within the round.
//
// Usage: node scripts/balance-pressure-grid.mjs [runs=100] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-pressure-grid.mjs 100 spread,strike BLEED_RATE=0.2
//
// Builds a debug copy of games/pressure-grid.html (state on window, no
// timer), then plays one round per run in headless Chromium by calling tick()
// directly, until the round ends (the game's own clock). Bots act
// `rate` times per second; seeded randomness picks cells. Prints one line per
// bot: round win rate, median round time and pumps used, median eruptions,
// then the share of runs that earned each achievement and the median seconds
// to earn it. Also: "storm" = when a single
// 0.2 s tick first had 100+ eruptions (the board flashing white), and whether
// the board settles (no eruptions) within 20 s of the bot stopping.
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/pressure-grid.html');
const LIMIT_S = 120;

// spam: pump the centre cell. spread: pump random cells. sweep: pump the
// lowest-pressure cell (aims at Full Pressure). strike: pump two neighbours,
// then siphon one into the other once that makes it erupt (Siphon Strike).
const BOTS = {
  spam1: { mode: 'spam', rate: 1 },
  spam3: { mode: 'spam', rate: 3 },
  spam6: { mode: 'spam', rate: 6 },
  spread3: { mode: 'spread', rate: 3 },
  spread6: { mode: 'spread', rate: 6 },
  sweep3: { mode: 'sweep', rate: 3 },
  sweep6: { mode: 'sweep', rate: 6 },
  strike3: { mode: 'strike', rate: 3 },
};

function buildDebug(overrides) {
  let html = fs.readFileSync(SRC, 'utf8');
  for (const [k, v] of Object.entries(overrides)) {
    const re = new RegExp(`(\\b${k} = )(\\[[^\\]]*\\]|[^,;]+)`);
    if (!re.test(html)) throw new Error('no const ' + k);
    html = html.replace(re, `$1${v}`);
  }
  const tail = '  fitBoard();\n  setInterval(tick, TICK_MS);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace(tail, `
  window.__dbg = {
    get pressure() { return pressure; }, get eruptions() { return eruptions; }, get siphons() { return siphons; },
    get round() { return round; }, get pumps() { return pumps; }, get roundTicks() { return roundTicks; },
    GRID_SIZE, TICK_MS, unlocked, tick, doPump, doSiphon,
    reset() { pressure = makeGrid(0); flash = makeGrid(0); ticks = 0; eruptions = 0; siphons = 0; unlocked.clear(); newRound(); },
  };
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pressure-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot, limit }) {
  const D = window.__dbg;
  D.reset();
  let s = seed;
  const rand = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const N = D.GRID_SIZE, dt = D.TICK_MS / 1000;
  const c = N >> 1;
  const when = {};
  const note = t => { for (const id of D.unlocked) if (!(id in when)) when[id] = t; };

  function act() {
    const P = D.pressure;
    if (bot.mode === 'spam') D.doPump([c, c]);
    else if (bot.mode === 'spread') D.doPump([rand() * N | 0, rand() * N | 0]);
    else if (bot.mode === 'sweep') {
      let bx = 0, by = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (P[y][x] < P[by][bx]) { bx = x; by = y; }
      D.doPump([bx, by]);
    } else if (bot.mode === 'strike') {
      // Siphon B (c+1) into A (c) when that tips A over; otherwise top up the lower one.
      const a = P[c][c], b = P[c][c + 1];
      if (a + b * 0.6 * 0.85 >= 100 && a < 100) D.doSiphon([c + 1, c], [-1, 0]);
      else D.doPump(a <= b ? [c, c] : [c + 1, c]);
    }
  }

  let acc = 0, storm = null;
  for (let t = 0; t < limit && (D.round === 'ready' || D.round === 'playing'); t += dt) {
    acc += bot.rate * dt;
    while (acc >= 1) { act(); acc--; note(t); }
    const before = D.eruptions;
    D.tick();
    if (storm === null && D.eruptions - before >= 100) storm = t;
    note(t);
  }
  const eruptions = D.eruptions;
  let settled = false;
  for (let t = 0; t < 20 && !settled; t += dt) {
    const before = D.eruptions;
    D.tick();
    if (t > 5 && D.eruptions === before) settled = true;
  }
  return { when, eruptions, storm, settled, won: D.round === 'win', time: D.roundTicks * dt, pumps: D.pumps };
}

async function run(bot, runs, file, browser, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot, limit: LIMIT_S }); }
    await page.close();
  }));
  return results;
}

const IDS = ['first-eruption', 'chain-reaction', 'siphon-strike', 'plumber', 'full-pressure', 'century'];
function report(name, rs) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const cols = IDS.map(id => {
    const ts = rs.filter(r => id in r.when).map(r => r.when[id]);
    return ts.length ? `${id} ${Math.round(100 * ts.length / rs.length)}% @${Math.round(med(ts))}s` : `${id} -`;
  });
  const storms = rs.filter(r => r.storm !== null).map(r => r.storm);
  const storm = storms.length ? `${Math.round(100 * storms.length / rs.length)}% @${Math.round(med(storms))}s` : '-';
  const settled = `${Math.round(100 * rs.filter(r => r.settled).length / rs.length)}%`;
  const wins = rs.filter(r => r.won);
  const round = `win ${Math.round(100 * wins.length / rs.length)}%` +
    (wins.length ? ` @${Math.round(med(wins.map(r => r.time)))}s ${med(wins.map(r => r.pumps))} pumps` : '');
  console.log(`${name.padEnd(8)} ${round} | eruptions ${med(rs.map(r => r.eruptions))} | storm ${storm} | settles ${settled} | ${cols.join(', ')}`);
}

const runs = +process.argv[2] || 100;
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
