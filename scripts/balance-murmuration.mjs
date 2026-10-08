// Headless balance bots for Murmuration.
//
// Usage: node scripts/balance-murmuration.mjs [runs=300] [bot,bot,...] [--night N] [--run]
//   node scripts/balance-murmuration.mjs 300 lure80,smart90       classic night (v7 numbers)
//   node scripts/balance-murmuration.mjs 60 lure60,lure80 --night 1
//   node scripts/balance-murmuration.mjs 50 lure60,smart90 --run    whole Chapter 1 migration
//   node scripts/balance-murmuration.mjs --check                     telemetry keys + run state (one line)
//
// Builds a debug copy of games/murmuration.html (state on window, seeded
// Math.random, no animation loop), then plays seeded games in headless
// Chromium by calling step() directly. The night (the game's own NIGHTS row,
// 0 = classic) is pushed out to 200 s, so one set of runs gives the win rate
// for several dusk times ("@60: 79%" = wins by 60 s). On migration nights the
// bot's lure is clamped to the sky (a finger can't leave it); on the classic
// night it isn't, so its numbers stay comparable with v3-v7.
// --run: each seed flies nights 1-6 in a row with the real dusk, flock carried
// over by the game's own tally; one line per bot (median flock at each dawn).
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/murmuration.html');
const DUSK_TIMES = [45, 50, 55, 60, 65, 70];

const BOTS = {
  // Lure only: hold the lure `lead` units ahead of the main cluster, aimed through the gate.
  lure60: { lead: 60 },   // close leader (the brief's bot)
  lure80: { lead: 80 },   // best lure-only setting
  lure100: { lead: 100 },
  // Naive startle: tap just behind the rearmost bird every 3 s while calm.
  rear100: { lead: 100, startle: { mode: 'rear', every: 3, back: 15 } },
  // Smart startle: tap behind the flock only if it is calm, already heading the
  // right way, has room to burst without leaving the sky, and is away from the gate.
  smart90: { lead: 90, startle: { mode: 'smart', every: 2, back: 10, room: 110, align: 0.7 } },
};

function buildDebug() {
  let html = fs.readFileSync(SRC, 'utf8');
  const seed = `<script>
let __s = 1;
Math.random = function() { __s |= 0; __s = __s + 0x6D2B79F5 | 0; let t = Math.imul(__s ^ __s >>> 15, 1 | __s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
window.__seed = s => { __s = s; };
</script>`;
  const tail = '  newMigration();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace('<script>\n(function() {', seed + '\n<script>\n(function() {');
  html = html.replace(tail, `
  window.__dbg = {
    get birds() { return birds; }, get gate() { return gate; }, get state() { return state; },
    get elapsed() { return elapsed; }, get passed() { return passed.size; }, get startles() { return startles; },
    get GATES() { return GATES; }, get run() { return run; }, get tally() { return tally; },
    get lastResult() { return lastResult; },
    newRun() { run = freshRun(); tally = null; }, serializeRun, restoreRun,
    earned: roundEarned, NIGHTS, W, H, step, startle, newFlock, draw, fitSky,
    setGate(k) { gate = k; },
    setLure(x, y) { lure = x == null ? null : { x, y, on: true }; },
  };
  newFlock();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'murm-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page.
function playInPage({ seed, bot, night, dusk, clamp, fresh = true }) {
  const D = window.__dbg;
  D.NIGHTS[night].dusk = dusk; // night pushed out, so one set of runs gives several dusk times
  if (fresh) window.__seed(seed);
  D.newFlock(night);
  const dt = 1 / 60, hyp = Math.hypot;
  let luring = true, lastTap = -99, t = 0, lastGate = 0, taps = 0, tick = 0;
  const gateTimes = [];
  function cluster(bs) {
    let cx = 0, cy = 0;
    for (const b of bs) { cx += b.x; cy += b.y; }
    cx /= bs.length; cy /= bs.length;
    for (let it = 0; it < 3; it++) {
      let sx = 0, sy = 0, n = 0;
      for (const b of bs) if (hyp(b.x - cx, b.y - cy) < 70) { sx += b.x; sy += b.y; n++; }
      if (n) { cx = sx / n; cy = sy / n; }
    }
    const mem = bs.filter(b => hyp(b.x - cx, b.y - cy) < 70);
    let vx = 0, vy = 0;
    for (const b of mem) { vx += b.vx; vy += b.vy; }
    return { cx, cy, mem, vx: vx / (mem.length || 1), vy: vy / (mem.length || 1) };
  }
  while (D.state === 'playing') {
    if (tick++ % 6 === 0) { // 10 decisions per second
      const bs = D.birds, c = cluster(bs), g = D.GATES[D.gate];
      const a = g.a * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
      let nx = -uy, ny = ux; // gate normal, pointed from the flock's side through the gate
      if ((c.cx - g.x) * nx + (c.cy - g.y) * ny > 0) { nx = -nx; ny = -ny; }
      const along = (c.cx - g.x) * ux + (c.cy - g.y) * uy;
      const depth = Math.abs((c.cx - g.x) * nx + (c.cy - g.y) * ny);
      // Line up on a staging point first, then lead straight through.
      const stage = Math.abs(along) > 25 && depth < 60;
      const wx = g.x + nx * (stage ? -70 : 80), wy = g.y + ny * (stage ? -70 : 80);
      let dx = wx - c.cx, dy = wy - c.cy;
      const dl = hyp(dx, dy) || 1; dx /= dl; dy /= dl;
      const meanFear = bs.reduce((s, b) => s + b.fear, 0) / bs.length;
      if (luring && meanFear > 0.3) luring = false;
      if (!luring && meanFear < 0.15) luring = true;
      const lx = c.cx + dx * bot.lead, ly = c.cy + dy * bot.lead;
      if (!luring) D.setLure(null);
      else if (clamp) D.setLure(Math.min(D.W - 12, Math.max(12, lx)), Math.min(D.H - 12, Math.max(12, ly)));
      else D.setLure(lx, ly);

      const S = bot.startle;
      if (S && t - lastTap > S.every && meanFear < 0.1 && hyp(g.x - c.cx, g.y - c.cy) > 110 && c.mem.length) {
        let rp = Infinity, rear = null;
        for (const b of c.mem) { const p = (b.x - c.cx) * dx + (b.y - c.cy) * dy; if (p < rp) { rp = p; rear = b; } }
        let tx, ty, ok = true;
        if (S.mode === 'rear') { tx = rear.x - dx * S.back; ty = rear.y - dy * S.back; }
        else {
          const sp = hyp(c.vx, c.vy) || 1;
          if ((c.vx * dx + c.vy * dy) / sp < S.align) ok = false;
          tx = c.cx + dx * (rp - S.back); ty = c.cy + dy * (rp - S.back);
          const px = c.cx + dx * S.room, py = c.cy + dy * S.room;
          if (px < 25 || px > D.W - 25 || py < 25 || py > D.H - 25) ok = false;
        }
        if (ok) { D.startle(tx, ty); lastTap = t; taps++; }
      }
    }
    D.step(dt);
    t += dt;
    if (D.gate !== lastGate) { gateTimes.push(t); lastGate = D.gate; }
  }
  if (D.state === 'won') gateTimes.push(t);
  return { won: D.state === 'won', t, birds: D.birds.length, taps: D.startles, gateTimes,
    lost: D.lastResult.stats.lost, after: D.tally && D.tally.after, over: D.tally && D.tally.over,
    // Recruits that joined: within sight (VIEW 40) of a bird of the original flock.
    recruits: D.birds.filter(b => b.recruit && D.birds.some(o => !o.recruit && hyp(o.x - b.x, o.y - b.y) < 40)).length };
}

async function pool(runs, file, browser, job, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await job(page, 1000 + i); }
    await page.close();
  }));
  return results;
}

const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };

function report(name, rs, times, gates, recruits) {
  const win = T => `@${T}:${(100 * rs.filter(r => r.won && r.t <= T).length / rs.length).toFixed(0).padStart(3)}%`;
  const perGate = Array.from({ length: gates }, (_, k) =>
    med(rs.filter(r => r.gateTimes.length > k).map(r => r.gateTimes[k] - (k ? r.gateTimes[k - 1] : 0))).toFixed(1));
  const wins = rs.filter(r => r.won);
  const scattered = rs.filter(r => !r.won).length;
  console.log(`${name.padEnd(9)} ${times.map(win).join(' ')}  winmed ${med(wins.map(r => r.t)).toFixed(0)}s  taps ${med(rs.map(r => r.taps))}` +
    `  lost(win) ${med(wins.map(r => r.lost))}  scattered ${scattered}/${rs.length}  s/gate ${perGate.join('/')}` +
    (recruits ? `  recruits joined (win) ${wins.reduce((s, r) => s + r.recruits, 0)}/${recruits * wins.length}` : ''));
}

// A whole migration per seed: nights 1-6 with their real dusk, the flock from the game's tally.
async function migration(bot, runs, file, browser, nights) {
  return pool(runs, file, browser, async (page, seed) => {
    await page.evaluate(() => window.__dbg.newRun());
    const dawns = [], wins = [];
    let gates = 0;
    for (let n = 1; n < nights.length; n++) {
      dawns.push(await page.evaluate(() => window.__dbg.run.flock));
      const r = await page.evaluate(playInPage, { seed, bot, night: n, dusk: nights[n].dusk, clamp: true, fresh: n === 1 });
      wins.push(r.won);
      gates = await page.evaluate(() => window.__dbg.tally.gates);
      if (!(await page.evaluate(() => window.__dbg.run))) { if (n === nights.length - 1) dawns.push(r.after); break; }
    }
    return { dawns, wins, gates };
  });
}

// --check: the per-night arcade:result carries every documented key, the classic
// night none of the migration's, and the run state is small, JSON-safe and validated.
const STAT_KEYS = 'gates birds flock0 startles lure_s spook_s lost lost_pan light_left scared_pk cohesion tap_back tap_side tap_front'.split(' ');
const EXTRA_KEYS = 'level run attempt nv night_id gate_t idle_s spook score board flock_end run_over'.split(' ');
async function check(file, browser) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(file).href);
  const bad = [];
  const night = async (n, bot) => {
    await page.evaluate(playInPage, { seed: 7, bot, night: n, dusk: n ? (await page.evaluate(k => window.__dbg.NIGHTS[k].dusk, n)) : 60, clamp: n > 0, fresh: n === 1 || !n });
    return page.evaluate(() => JSON.parse(JSON.stringify(window.__dbg.lastResult)));
  };
  await page.evaluate(() => window.__dbg.newRun());
  let saved = 0;
  for (let n = 1; n <= 6; n++) {
    if (!(await page.evaluate(() => window.__dbg.run))) { bad.push(`run ended before night ${n}`); break; }
    saved = Math.max(saved, await page.evaluate(() => JSON.stringify(window.__dbg.serializeRun()).length));
    const r = await night(n, BOTS.smart90);
    const keys = Object.keys(r.stats);
    for (const k of STAT_KEYS) if (!keys.includes(k)) bad.push(`night ${n}: stats.${k} missing`);
    if (keys.length > 16) bad.push(`night ${n}: ${keys.length} stats (max 16)`);
    for (const k of EXTRA_KEYS) if (!(k in r)) bad.push(`night ${n}: ${k} missing`);
    if (r.level !== n || r.board !== 'ch1') bad.push(`night ${n}: level ${r.level}, board ${r.board}`);
    if (n === 6 && !('chapter_done' in r)) bad.push('night 6: chapter_done missing');
  }
  const c = await night(0, BOTS.smart90);
  for (const k of ['level', 'score', 'board', 'flock_end']) if (k in c) bad.push(`classic sends ${k}`);
  if (c.night_id !== 'classic') bad.push('classic night_id');
  const junk = await page.evaluate(() => [null, {}, { v: 1, id: 'x', night: 9, flock: 40, gates: 0, q: [] },
    { v: 1, id: 'BAD!', night: 1, flock: 40, gates: 0, q: [] }, { v: 1, id: 'x', night: 2, flock: 99, gates: 0, q: [] }]
    .map(o => window.__dbg.restoreRun(o)));
  if (junk.some(Boolean)) bad.push('restoreRun accepted junk');
  if (saved > 1024) bad.push(`run state ${saved} bytes`);
  console.log(bad.length ? `FAIL ${bad.join('; ')}` : `ok   telemetry: ${STAT_KEYS.length} stats + ${EXTRA_KEYS.length + 1} extra keys on nights 1-6, none of the migration's on classic; run state <= ${saved} bytes, junk rejected`);
  await page.close();
  return !bad.length;
}

const args = process.argv.slice(2);
const flagAt = args.indexOf('--night');
const night = flagAt >= 0 ? +args[flagAt + 1] : 0;
const runMode = args.includes('--run');
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--night'));
const runs = +pos[0] || 300;
const file = buildDebug();
const browser = await chromium.launch();
const nights = await (async () => {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(file).href);
  const N = await page.evaluate(() => window.__dbg.NIGHTS.map(n => ({ id: n.id, dusk: n.dusk, gates: n.gates.length, need: n.need,
    recruits: (n.recruits || []).reduce((s, r) => s + r.n, 0) })));
  await page.close();
  return N;
})();
if (!(night >= 0 && night < nights.length)) throw new Error(`--night 0-${nights.length - 1}`);
if (args.includes('--check')) { const ok = await check(file, browser); await browser.close(); process.exit(ok ? 0 : 1); }
const names = (pos[1] || (runMode || night ? 'lure60,lure80,smart90' : Object.keys(BOTS).join(','))).split(',');
for (const n of names) if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
if (runMode) {
  for (const n of names) {
    const rs = await migration(BOTS[n], runs, file, browser, nights);
    const at = k => med(rs.filter(r => r.dawns.length > k).map(r => r.dawns[k]));
    const reached = k => rs.filter(r => r.dawns.length > k).length;
    console.log(`${n.padEnd(9)} flock at dawn ${nights.slice(1).map((_, k) => `n${k + 1} ${at(k)} (${reached(k)})`).join(' · ')} · roost ${at(nights.length - 1)} (${reached(nights.length - 1)})` +
      `  chapter cleared ${rs.filter(r => r.wins.length === nights.length - 1 && r.wins.at(-1)).length}/${runs}  gates med ${med(rs.map(r => r.gates))}`);
  }
} else {
  const N = nights[night];
  const times = night ? [N.dusk - 10, N.dusk - 5, N.dusk, N.dusk + 10] : [45, 50, 55, 60, 65, 70];
  if (night) console.log(`night ${night} ${N.id}: ${N.gates} gates, need ${N.need}, dusk ${N.dusk}`);
  for (const n of names) {
    const rs = await pool(runs, file, browser, (page, seed) => page.evaluate(playInPage, { seed, bot: BOTS[n], night, dusk: 200, clamp: night > 0 }));
    if (night) report(n, rs, times, N.gates, N.recruits);
    else {
      // Classic: the v7 line format, so old tables still compare.
      const win = T => `@${T}:${(100 * rs.filter(r => r.won && r.t <= T).length / rs.length).toFixed(0).padStart(3)}%`;
      const perGate = [0, 1, 2, 3, 4].map(k =>
        med(rs.filter(r => r.gateTimes.length > k).map(r => r.gateTimes[k] - (k ? r.gateTimes[k - 1] : 0))).toFixed(1));
      console.log(`${n.padEnd(9)} ${times.map(win).join(' ')}  taps ${med(rs.map(r => r.taps))}` +
        `  scattered ${rs.filter(r => !r.won).length}/${rs.length}  s/gate ${perGate.join('/')}`);
    }
  }
}
await browser.close();
