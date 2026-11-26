// Headless balance bots for Island Census.
//
// Usage: node scripts/balance-island-census.mjs [runs=300] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-island-census.mjs 300 idle,reader HUNT=5,BREED=[0.8,0.5,0.2,0]
//   TRACE=3 also prints the first 3 rounds' census (rabbits/foxes) per season.
//
// Builds a debug copy of games/island-census.html (state on window, seeded
// Math.random, no animation loop), then plays seeded rounds in headless
// Chromium. The game is turn-based, so bots act once per season and call
// runSeason() directly. Needs Playwright (installed globally in Claude Code
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/island-census.html');

// Bots (all see only what the screen shows: counts per meadow, grass colour,
// fences and the fox arrows).
//   idle: never acts, just presses Next season.
//   release: only releases rabbits, into the grassiest fox-free meadow, when
//     rabbits run low.
//   fence: only fences. Picks a refuge (a grassy, fox-free meadow with at
//     most 3 paths) and fences it in, the paths the fox arrows use first;
//     opens it when foxes run low so rabbits spill out to them.
//   reader: fence, plus releases: into the refuge when rabbits run low, into
//     the foxes' meadow when foxes run low.
//   novice: a first-time player's obvious guesses. Watches the first season,
//     then fences paths out of the biggest fox meadow ("keep the foxes in")
//     and releases rabbits into a random meadow that has some when rabbits
//     look low. Takes its fences down only after a "too few foxes" strike.
const BOTS = {
  idle: {},
  release: { release: true },
  fence: { fence: true },
  reader: { release: true, fence: true },
  novice: { novice: true },
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
  const tail = '  newIsland();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get meadows() { return meadows; }, get paths() { return paths; }, get R() { return R; }, get F() { return F; },
    get G() { return G; }, get season() { return season; }, get moves() { return moves; }, get strikes() { return strikes; },
    get state() { return state; }, get strikeLog() { return strikeLog; }, get result() { return result; }, get event() { return event; },
    earned: roundEarned, release, toggleFence, foxIntent, neighbours, newIsland, MAX_FENCES,
    R_BAND_LO, R_BAND_HI, F_BAND_LO, F_BAND_HI,
    next() { runSeason(); if (result) { state = result.won ? 'won' : 'lost'; } else { state = 'planning'; anim = null; } },
  };
  newIsland();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'census-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page: one round (up to 8 seasons).
function playInPage({ seed, bot }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newIsland();
  const rnd = Math.random, sum = a => a.reduce((x, y) => x + y, 0);
  const trace = [];
  let used = 0, haven = -1, novSeen = 0;
  while (D.state === 'planning') {
    const n = D.meadows.length, r = Math.round(sum(D.R)), f = Math.round(sum(D.F));
    const fenced = () => D.paths.filter(p => p.fence).length;
    const act = fn => { if (fn()) used++; };
    if (bot.novice) {
      // First guesses: fence the foxes in where they are, and top up rabbits
      // wherever there are some. Learns one thing from the census: after a
      // "too few foxes" strike it takes its fences down.
      const log = D.strikeLog;
      if (log.length && log[log.length - 1] === 'Too few foxes' && log.length !== novSeen) {
        for (const p of D.paths) if (p.fence) D.toggleFence(p);
        novSeen = log.length;
      } else if (D.season > 0) {
        let den = 0;
        for (let i = 1; i < n; i++) if (D.F[i] > D.F[den]) den = i;
        const open = D.neighbours(den).filter(p => !p.fence);
        if (open.length && fenced() < D.MAX_FENCES && rnd() < 0.7) act(() => D.toggleFence(open[Math.floor(rnd() * open.length)]));
        const some = D.meadows.map((_, i) => i).filter(i => D.R[i] >= 1);
        if (D.moves > 0 && r < 60 && some.length) act(() => D.release(some[Math.floor(rnd() * some.length)]));
        else if (D.moves > 0 && rnd() < 0.3) act(() => D.release(Math.floor(rnd() * n)));
      }
    } else {
      const foxLow = f <= D.F_BAND_LO + 2, rabLow = r < D.R_BAND_LO + 25;
      const other = (p, i) => p.a === i ? p.b : p.a;
      // The refuge: a meadow with few enough paths to fence them all, lots of
      // grass and no foxes in or next to it. Chosen once, kept while fox-free.
      if (haven < 0 || D.F[haven] > 0.5) {
        haven = -1;
        let best = -Infinity;
        for (let i = 0; i < n; i++) {
          const ps = D.neighbours(i);
          if (ps.length > D.MAX_FENCES) continue;
          const s = D.meadows[i].K + D.R[i] - 30 * D.F[i] - 8 * sum(ps.map(p => D.F[other(p, i)])) - 4 * ps.length;
          if (s > best) { best = s; haven = i; }
        }
        if (bot.fence) for (const p of D.paths) if (p.fence && haven >= 0 && p.a !== haven && p.b !== haven) D.toggleFence(p);
      }
      const hp = haven >= 0 ? D.neighbours(haven) : [];
      if (bot.fence && foxLow) {
        // Starving foxes: open the refuge so rabbits spill out to them.
        for (const p of hp) if (p.fence) D.toggleFence(p);
      } else if (bot.fence) {
        // Fence the refuge's paths, the ones foxes are heading down first.
        const intent = D.foxIntent();
        const w = p => sum(intent.filter(fi => fi.to === haven && other(p, haven) === fi.from).map(fi => fi.m));
        for (const p of [...hp].sort((a, b) => w(b) - w(a))) if (!p.fence && D.moves > 0) act(() => D.toggleFence(p));
      }
      if (bot.release && foxLow && D.moves > 0) {
        // Feed the foxes: rabbits into the meadow with the most foxes.
        let den = 0;
        for (let i = 1; i < n; i++) if (D.F[i] > D.F[den]) den = i;
        if (D.F[den] > 0) while (D.moves > 0) act(() => D.release(den));
      }
      if (bot.release && rabLow && !foxLow) {
        let best = haven;
        if (best < 0 || !bot.fence) {
          for (let i = 0; i < n; i++) {
            const score = D.G[i] / D.meadows[i].K - D.F[i];
            if (best < 0 || score > D.G[best] / D.meadows[best].K - D.F[best]) best = i;
          }
        }
        while (D.moves > 0) act(() => D.release(best));
      }
    }
    D.next();
    trace.push([Math.round(sum(D.R)), Math.round(sum(D.F))]);
  }
  return { won: D.state === 'won', reason: D.result && D.result.reason, seasons: D.season,
    strikes: D.strikes, kinds: D.strikeLog.slice(), used, trace, earned: [...D.earned], event: D.event };
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

// One line per bot: win %, losses by reason, median seasons survived,
// median strikes and moves, median census after the first year, achievements.
function report(name, rs) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const pct = (n, d = rs.length) => d ? Math.round(100 * n / d) : 0;
  const why = {};
  for (const r of rs) if (!r.won) why[r.reason] = (why[r.reason] || 0) + 1;
  const y1 = rs.filter(r => r.trace.length >= 4).map(r => r.trace[3]);
  const kinds = {};
  for (const r of rs) for (const k of r.kinds) kinds[k] = (kinds[k] || 0) + 1;
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  if (process.env.TRACE) for (const r of rs.slice(0, +process.env.TRACE)) console.log(`  ${name} ${r.won ? "won" : r.reason} ${r.trace.map(t => t.join("/")).join(" ")}`);
  console.log(`${name.padEnd(7)} win ${String(pct(rs.filter(r => r.won).length)).padStart(3)}%` +
    ` | lost: ${Object.entries(why).map(([k, v]) => `${k} ${pct(v)}%`).join(' ') || '-'}` +
    ` | seasons ${med(rs.map(r => r.seasons))} strikes ${med(rs.map(r => r.strikes))} moves ${med(rs.map(r => r.used))}` +
    ` | strikes/run: ${Object.entries(kinds).map(([k, v]) => `${k.replace('Too ', '').replace(' ', '-')} ${(v / rs.length).toFixed(2)}`).join(' ')}` +
    ` | after y1 R ${med(y1.map(t => t[0]))} F ${med(y1.map(t => t[1]))}` +
    ` || ${Object.entries(ach).sort().map(([k, v]) => `${k} ${pct(v)}%`).join(', ')}`);
}

const runs = +process.argv[2] || 300;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
for (const kv of (process.argv[4] || '').split(/,(?![^\[]*\])/).filter(Boolean)) {
  const [k, v] = kv.split('=');
  overrides[k] = v;
}
const file = buildDebug(overrides);
const browser = await chromium.launch();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS[n], runs, file, browser));
}
await browser.close();
