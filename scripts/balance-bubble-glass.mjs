// Headless balance bots for Bubble Glass.
//
// Usage: node scripts/balance-bubble-glass.mjs [runs=20] [bot,bot,...] [levels=all] [CONST=value,...]
//   e.g. node scripts/balance-bubble-glass.mjs 20 reader,novice 2,3 DEEP=12
//   Levels are 1-based positions, or ids (roof,the-plug). Each level is
//   played on its own (up to 3 tries, 150 s each), so one level can be
//   tuned without the others. TRACE=1 prints the first run's moves.
//
// Builds a debug copy of games/bubble-glass.html (state on window, seeded
// Math.random, no animation loop), then plays seeded runs in headless
// Chromium by calling the game's step() and its bot actions directly (the
// same functions the input handlers use). Prints one line per bot. Adapted
// from balance-terrace-garden.mjs. Needs Playwright (installed globally in
// Claude Code cloud sessions).
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/bubble-glass.html');

// Every bot decides every `gap` s and acts `react` s after it looks.
//   reader: knows every verb. Tries each turn (eighths of a turn either
//     way) in a look-ahead copy of the box and takes the one that brings
//     the bubble closest to the vent (by path length, sand costing extra).
//     If no turn helps: shatters a shard if that plus a turn would, else
//     melts: tries blobs and bars of glass on the sand near the bubble's
//     path to the vent, each followed by its best turn. If nothing helps,
//     it tries a random big turn. Restarts after 150 s.
//   rotate-only: the reader that only turns.
//   no-melt / no-shatter: the reader without that verb.
//   habit: the rule a player takes from level 1, "turn so the vent is
//     straight up from the bubble", every decision. Never melts or taps.
//   novice: the obvious first guesses: spins the box fast for its first
//     `spin` s; afterwards, whenever the bubble has been stuck a while,
//     melts the sand right next to it (half the time) or turns the box a
//     random 45–180°; {taps} any glass it sees (half the time).
//   hinted: the novice, but does what the stuck hint says whenever one is
//     showing (turn the way it points, hold on the spot it rings, {tap} the
//     glass it rings, Restart).
//   spinner: turns the box at full speed, all the time.
//   slow-hands: the reader thinking every 2 s and reacting in 0.7 s.
//   keys: the reader turning at the arrow keys' rate.
//   idle: does nothing.
const HUMAN = { gap: 0.8, react: 0.3, verbs: 'turn melt shatter' };
const BOTS = {
  reader: { ...HUMAN, policy: 'reader' },
  'rotate-only': { ...HUMAN, policy: 'reader', verbs: 'turn' },
  'no-melt': { ...HUMAN, policy: 'reader', verbs: 'turn shatter' },
  'no-shatter': { ...HUMAN, policy: 'reader', verbs: 'turn melt' },
  habit: { ...HUMAN, policy: 'habit' },
  novice: { ...HUMAN, policy: 'novice', gap: 0.6, spin: 6 },
  hinted: { ...HUMAN, policy: 'novice', gap: 0.6, spin: 6, hint: true },
  spinner: { ...HUMAN, policy: 'spinner' },
  'slow-hands': { ...HUMAN, policy: 'reader', gap: 2, react: 0.7 },
  keys: { ...HUMAN, policy: 'reader', keys: true },
  idle: { ...HUMAN, policy: 'idle' },
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
try { localStorage.clear(); } catch (e) {}
</script>`;
  const tail = '  fitStage();\n  updateTiltBtn();\n  startLevel(reached);\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get world() { return world; }, get state() { return state; }, get elapsed() { return elapsed; },
    get level() { return level; }, get hint() { return hint; }, get hints() { return hints; },
    get turns() { return turns; }, get warns() { return warns; },
    LEVELS, N, CH, STEP, RAD, KEY_RATE, SHARD_MAX, MELT_RATE, earned: unlocked,
    startLevel, step, leave, tapAt, botTurn, botMelt, botRelease,
    lookahead, bestTurn, cloneWorld, ventDistance, bubbleScore, shatterAt, meltStart, meltMove, meltStop, simStep,
  };
  startLevel(0);
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bubble-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page: one level, up to 3 tries.
function playInPage({ seed, bot, lv }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.earned.clear();
  const N = D.N, DT = D.STEP, RAD = D.RAD, TIME = 150;
  const rand = (() => { let r = seed * 7919; return () => { r = r + 0x6D2B79F5 | 0; let t = Math.imul(r ^ r >>> 15, 1 | r);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
  const trace = [];
  const log = s => {
    if (!bot.trace) return;
    trace.push(`  ${D.elapsed.toFixed(1)}s ang ${Math.round(D.world.ang / D.RAD)} ${s}`);
    if (bot.trace > 1) { // TRACE=2: the box every decision, one character per 2x2 cells
      const w = D.world;
      for (let y = 0; y < N; y += 2) { let r = '    '; for (let x = 0; x < N; x += 2) { const i = y * N + x; r += w.bub[i] || w.bub[i + 1] || w.bub[i + N] || w.bub[i + N + 1] ? 'O' : '.#sgV'[w.t[i]] || '?'; } trace.push(r); }
    }
  };
  const W = () => D.world;
  const may = v => bot.verbs.includes(v) && D.LEVELS[D.level].verbs.includes(v);
  // Keys bots can't set a far target: the box turns at KEY_RATE toward it.
  let goal = null;
  const advance = t => {
    for (let k = 0; k < Math.round(t / DT) && D.state === 'playing'; k++) {
      if (goal !== null) {
        const w = W(), d = goal - w.ang, m = D.KEY_RATE * RAD * DT;
        w.angT = Math.abs(d) <= m ? goal : w.ang + Math.sign(d) * m;
        if (Math.abs(d) <= m) goal = null;
      }
      if (melting) D.world.melt && D.meltMove(W(), melting.fx, melting.fy);
      D.step(DT);
    }
  };
  let melting = null;
  const turn = a => { if (bot.keys) { goal = a; D.botTurn(W().ang); } else D.botTurn(a); };
  // Hold on (x, y), the finger drifting by (dx, dy) cells per s, for t s.
  const melt = (x, y, dx, dy, t) => {
    if (!D.botMelt(x, y)) return false;
    const steps = Math.round(t / DT);
    for (let k = 0; k < steps && D.state === 'playing'; k++) {
      D.meltMove(W(), x + dx * k * DT, y + dy * k * DT);
      D.step(DT);
    }
    D.botRelease();
    return true;
  };
  const LOOK = 3.5;

  // The bubble's path to the vent (corner points), for melt candidates.
  function pathPoints(w) {
    const dist = D.ventDistance(w), M1 = N + 1, pts = [];
    let px = Math.round(w.bx), py = Math.round(w.by);
    for (let n = 0; n < 200; n++) {
      pts.push([px, py]);
      let best = null, bd = dist[py * M1 + px];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const d = dist[(py + dy) * M1 + px + dx];
        if (d < bd) { bd = d; best = [px + dx, py + dy]; }
      }
      if (!best) break;
      [px, py] = best;
    }
    return pts;
  }
  function meltPlans(w) {
    const pts = pathPoints(w), seen = new Set(), spots = [];
    for (const [px, py] of pts) for (let dy = -6; dy <= 6; dy += 3) for (let dx = -6; dx <= 6; dx += 3) {
      const x = px + dx, y = py + dy;
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const key = (x >> 1) * 100 + (y >> 1);
      if (seen.has(key) || w.t[y * N + x] !== 2) continue;
      seen.add(key);
      spots.push([x + 0.5, y + 0.5, Math.hypot(x - w.bx, y - w.by)]);
    }
    spots.sort((a, b) => a[2] - b[2]);
    const g = [Math.sin(w.ang), Math.cos(w.ang)];
    const plans = [];
    for (const [x, y] of spots.slice(0, 12)) {
      plans.push([x, y, 0, 0]);
      plans.push([x, y, -g[1] * 5, g[0] * 5]);
      plans.push([x, y, g[1] * 5, -g[0] * 5]);
    }
    return plans;
  }
  const HOLD = 2.2;
  function tryMelt(w, [x, y, dx, dy]) {
    const c = D.cloneWorld(w);
    if (!D.meltStart(c, x, y)) return null;
    for (let k = 0; k < Math.round(HOLD / DT); k++) { D.meltMove(c, x + dx * k * DT, y + dy * k * DT); D.simStep(c, DT); }
    D.meltStop(c);
    const r = D.bestTurn(c, LOOK);
    return Math.min(r.best.score, r.wait);
  }

  function readerMove() {
    const w = W();
    const { best, wait } = D.bestTurn(w, LOOK);
    if (best.k && best.score < wait - 1) { turn(best.a); log(`turn ${best.k} → ${best.score.toFixed(0)} (wait ${wait.toFixed(0)})`); return; }
    if (wait < -50) return; // about to win
    if (may('shatter')) {
      for (const s of w.shards) {
        const c = D.cloneWorld(w), x = s.cells[0] % N + 0.5, y = ((s.cells[0] / N) | 0) + 0.5;
        if (!D.shatterAt(c, x, y)) continue;
        const r = D.bestTurn(c, LOOK);
        if (Math.min(r.best.score, r.wait) < wait - 2) { D.tapAt(x, y); log(`shatter → ${Math.min(r.best.score, r.wait).toFixed(0)}`); return; }
      }
    }
    if (may('melt') && w.heat >= 8) {
      let bp = null, bs = wait - 2;
      for (const p of meltPlans(w)) { const sc = tryMelt(w, p); if (sc !== null && sc < bs) { bs = sc; bp = p; } }
      if (bp) { log(`melt at ${bp.map(v => v.toFixed(0))} → ${bs.toFixed(0)}`); melt(bp[0], bp[1], bp[2], bp[3], HOLD); return; }
    }
    if (still > 2) { const k = [-4, -2, 2, 4][Math.floor(rand() * 4)]; turn(w.ang + k * 45 * RAD); log(`explore ${k}`); }
  }

  let lastPos = null, still = 0, dir = rand() < 0.5 ? -1 : 1;
  function noviceMove() {
    const w = W();
    const h = D.hint;
    if (bot.hint && h && D.elapsed > bot.spin) {
      if (h.turn) { turn(h.a); log('hint turn'); return; }
      if (h.restart) { log('hint restart'); D.leave('restart', D.level); return 'restart'; }
      if (h.shatter) { D.tapAt(h.x, h.y); log('hint shatter'); return; }
      if (h.melt) { melt(h.x, h.y, 0, 0, 2); log('hint melt'); return; }
    }
    if (D.elapsed < bot.spin) { turn(w.ang + dir * Math.PI / 2); return; }
    if (may('shatter') && w.shards.length && rand() < 0.5) {
      const s = w.shards[Math.floor(rand() * w.shards.length)];
      D.tapAt(s.cells[0] % N + 0.5, ((s.cells[0] / N) | 0) + 0.5); log('tap glass'); return;
    }
    if (still < 1.5) return;
    if (may('melt') && w.heat >= 1 && rand() < 0.5) {
      // The sand touching the bubble, on its upper side if any.
      let best = null, bd = Infinity;
      const ux = -Math.sin(w.ang), uy = -Math.cos(w.ang);
      for (let y = Math.floor(w.by - 4); y <= w.by + 4; y++) for (let x = Math.floor(w.bx - 4); x <= w.bx + 4; x++) {
        if (x < 0 || y < 0 || x >= N || y >= N || w.t[y * N + x] !== 2) continue;
        const d = Math.hypot(x + 0.5 - w.bx, y + 0.5 - w.by) - 0.8 * ((x + 0.5 - w.bx) * ux + (y + 0.5 - w.by) * uy);
        if (d < bd) { bd = d; best = [x + 0.5, y + 0.5]; }
      }
      if (best) { melt(best[0], best[1], 0, 0, 1.5); log('melt at bubble'); return; }
    }
    const k = (1 + Math.floor(rand() * 4)) * (rand() < 0.5 ? -1 : 1);
    turn(w.ang + k * 45 * RAD); log(`random turn ${k}`);
  }

  function habitMove() {
    const w = W();
    let vx = 0, vy = 0, n = 0;
    for (let i = 0; i < N * N; i++) if (w.t[i] === 4) { vx += i % N + 0.5; vy += ((i / N) | 0) + 0.5; n++; }
    const ux = vx / n - w.bx, uy = vy / n - w.by;
    let a = Math.atan2(-ux, -uy);
    a = w.ang + ((a - w.ang + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    turn(a);
  }

  const tries = [];
  for (let t = 0; t < 3; t++) {
    D.startLevel(lv);
    still = 0; lastPos = [W().bx, W().by];
    let out = null;
    while (D.state === 'playing' && D.elapsed < TIME) {
      const w = W();
      if (bot.policy === 'idle') { advance(1); continue; }
      if (bot.policy === 'spinner') { w.angT = w.ang + Math.PI; advance(0.5); continue; }
      advance(bot.react);
      if (D.state !== 'playing') break;
      if (bot.policy === 'reader') readerMove();
      else if (bot.policy === 'habit') habitMove();
      else if (bot.policy === 'novice') { if (noviceMove() === 'restart') { out = 'restart'; break; } }
      const t0 = D.elapsed;
      advance(bot.gap * (0.7 + 0.6 * rand()));
      const w2 = W();
      const moved = Math.hypot(w2.bx - lastPos[0], w2.by - lastPos[1]);
      still = moved < 0.5 ? still + (D.elapsed - t0) : 0;
      lastPos = [w2.bx, w2.by];
    }
    const w = W();
    const won = D.state === 'won';
    tries.push({ won, t: D.elapsed, why: won ? 'win' : out || 'timeout', melted: w.melted, shattered: w.shattered,
      deg: w.deg, heat: w.heat, hints: D.hints, turns: D.turns });
    if (won) break;
  }
  return { tries, earned: [...D.earned], trace };
}

async function run(bot, lv, runs, file, browser, workers = 4) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(workers, runs) }, async () => {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('page error:', e.message));
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot, lv }); }
    await page.close();
  }));
  return results;
}

function report(name, lvName, rs) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const pct = n => `${Math.round(100 * n / rs.length)}%`.padStart(4);
  const first = rs.filter(r => r.tries[0].won), any = rs.filter(r => r.tries.some(t => t.won));
  const f1 = rs.map(r => r.tries[0]);
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  const achs = Object.entries(ach).map(([k, v]) => `${k} ${pct(v).trim()}`).join(', ');
  const wins = f1.filter(t => t.won);
  console.log(`${name.padEnd(11)} ${lvName.padEnd(11)} 1st ${pct(first.length)} any ${pct(any.length)}` +
    ` | try 1: ${wins.length ? Math.round(med(wins.map(t => t.t))) + 's' : '-'} win` +
    ` melt ${med(f1.map(t => t.melted))} shat ${med(f1.map(t => t.shattered))} deg ${Math.round(med(f1.map(t => t.deg)))}` +
    ` heat ${Math.round(med(f1.map(t => t.heat)))} hints ${med(f1.map(t => t.hints))}` +
    (achs ? ` | ${achs}` : ''));
  if (rs[0].trace.length) console.log(rs[0].trace.join('\n'));
}

const runs = +process.argv[2] || 20;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
for (const kv of (process.argv[5] || '').split(/,(?![^\[]*\])/).filter(Boolean)) { const [k, v] = kv.split('='); overrides[k] = v; }
const file = buildDebug(overrides);
const browser = await chromium.launch();
const probe = await browser.newPage();
await probe.goto(pathToFileURL(file).href);
const ids = await probe.evaluate(() => window.__dbg.LEVELS.map(L => L.id));
await probe.close();
const want = (process.argv[4] && process.argv[4] !== 'all' ? process.argv[4].split(',') : ids)
  .map(v => /^\d+$/.test(v) ? +v - 1 : ids.indexOf(v));
for (const lv of want) if (lv < 0 || lv >= ids.length) throw new Error(`unknown level; levels: ${ids.join(', ')}`);
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  for (const lv of want) report(n, ids[lv], await run({ ...BOTS[n], trace: +process.env.TRACE || 0 }, lv, runs, file, browser));
}
await browser.close();
