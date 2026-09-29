// Headless balance bots for Ant Trails.
//
// Usage: node scripts/balance-ant-trails.mjs [runs=200] [bot,bot,...] [CONST=value,...]
//   e.g. node scripts/balance-ant-trails.mjs 200 trail,wash EVAP=0.08,SMELL_R=25
//   FROM=3 starts every run on day 3 with a fresh colony (START_ANTS ants).
//
// Builds a debug copy of games/ant-trails.html (state on window, seeded
// Math.random, no animation loop), then plays seeded games in headless
// Chromium by calling step() directly, one whole run (up to 6 days) each.
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/ant-trails.html');

// Every bot plays whole runs (up to 6 days, the colony carrying over).
//   idle: no input.
//   trail: redraws a straight nest-to-pile trail whenever the nearest one fades.
//   wash: trail, plus rain on a spider that's hunting near ants (and on the rival day,
//     rain on the rivals' nest mouth now and then).
//   far: wash, but trails the farthest pile first.
//   novice: a first-time player. Reads for a few seconds, then draws a wobbly
//     trail from near the nest to a random pile every 3-5 s, and 1 in 5 of its
//     gestures is a mistaken hold (rain on its own trail near the nest). Never
//     washes a spider on days 1-3; from day 4 it reacts to 1 threat in 2, late.
const BOTS = {
  idle: {},
  trail: { trail: true },
  wash: { trail: true, wash: true },
  far: { trail: true, wash: true, far: true },
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
    get ants() { return ants; }, get rivals() { return rivals; }, get rivalNest() { return rivalNest; },
    get piles() { return piles; }, get spiders() { return spiders; }, get day() { return day; },
    get state() { return state; }, get elapsed() { return elapsed; }, get delivered() { return delivered; },
    get rivalDelivered() { return rivalDelivered; }, get lost() { return lost; }, get gland() { return gland; },
    get rain() { return rain; }, get bonusMet() { return bonusMet; }, get sundown() { return sundown; },
    earned: roundEarned, DAYS, NEST, INK_PX, W, H, step, layTrail, scentAt, newRun, nextDay,
    setDay(n) { day = n; startDay(); },
    setRain(x, y) { if (x == null) rain = null; else if (rain) { rain.x = x; rain.y = y; } else rain = { x, y, t: 0 }; },
  };
  newRun();
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ants-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Runs inside the page: one whole run.
function playInPage({ seed, bot, from }) {
  const D = window.__dbg;
  window.__seed(seed);
  D.newRun();
  if (from) D.setDay(from);
  const dt = 1 / 60, hyp = Math.hypot, N = D.NEST, rnd = Math.random;
  const days = [], earned = new Set();
  function lineScent(p) {
    let s = 0, n = 0;
    for (let k = 0.15; k <= 0.85; k += 0.1) { s += D.scentAt(N.x + (p.x - N.x) * k, N.y + (p.y - N.y) * k); n++; }
    return s / n;
  }
  function drawPath(pts) {
    for (let i = 1; i < pts.length; i++) D.layTrail(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }
  for (;;) {
    const dawn = D.ants.length;
    let t = 0, tick = 0, rainFrom = -1, rainUntil = -1, rainAt = null, washCool = 0, rivalCool = 3, washes = 0;
    let novNext = D.day === 0 ? 4 : 2;
    while (D.state === 'playing') {
      if (tick++ % 6 === 0) { // 10 decisions per second
        if (t >= rainFrom && t < rainUntil) {
          const s = rainAt();
          D.setRain(s.x, s.y);
        } else if (D.rain) D.setRain(null);
        const busy = t < rainUntil;
        const canWash = bot.wash || (bot.novice && D.day >= 3);
        if (canWash && !busy && t > washCool) {
          const threat = D.spiders.find(sp => sp.eat <= 0 && sp.followT > 0.5 && D.ants.some(a => hyp(a.x - sp.x, a.y - sp.y) < 60));
          if (threat && (bot.wash || rnd() < 0.5)) {
            const late = bot.wash ? 0 : 0.8; // the novice reacts late
            rainFrom = t + late; rainUntil = t + late + 1.0; rainAt = () => threat;
            washCool = t + (bot.wash ? 4 : 6); washes++;
            if (!late) D.setRain(threat.x, threat.y);
          } else if (threat) washCool = t + 6;
        }
        if (bot.wash && D.rivalNest && t >= rainUntil && t > rivalCool) {
          const rn = D.rivalNest, spot = { x: rn.x, y: rn.y + 30 };
          rainFrom = t; rainUntil = t + 1.0; rivalCool = t + 4; rainAt = () => spot; D.setRain(spot.x, spot.y);
        }
        if (bot.trail && t >= rainUntil) {
          const piles = D.piles.filter(p => p.n > 0).sort((a, b) => (bot.far ? -1 : 1) * (hyp(a.x - N.x, a.y - N.y) - hyp(b.x - N.x, b.y - N.y)));
          for (const p of piles) {
            const len = hyp(p.x - N.x, p.y - N.y);
            if (lineScent(p) < 0.25 && D.gland * D.INK_PX >= len) {
              for (let k = 0; k < 1; k += 0.05) {
                D.layTrail(N.x + (p.x - N.x) * k, N.y + (p.y - N.y) * k, N.x + (p.x - N.x) * (k + 0.05), N.y + (p.y - N.y) * (k + 0.05));
              }
              break;
            }
          }
        }
        if (bot.novice && t >= rainUntil && t >= novNext) {
          novNext = t + 3 + 2 * rnd();
          const a = rnd() * Math.PI * 2, r0 = 20 + 40 * rnd();
          const sx = N.x + Math.cos(a) * r0, sy = N.y - Math.abs(Math.sin(a)) * r0;
          if (rnd() < 0.2) {
            // Meant to drag, held still instead: rain on its own trail.
            const spot = { x: sx, y: sy };
            rainFrom = t; rainUntil = t + 0.6; rainAt = () => spot; D.setRain(sx, sy);
          } else {
            const piles = D.piles.filter(p => p.n > 0);
            if (piles.length) {
              const p = piles[Math.floor(rnd() * piles.length)];
              const ex = p.x + (rnd() - 0.5) * 40, ey = p.y + (rnd() - 0.5) * 40;
              const nx = -(ey - sy), ny = ex - sx, nl = hyp(nx, ny) || 1;
              const pts = [];
              for (let i = 0; i <= 10; i++) {
                const w = i === 0 || i === 10 ? 0 : (rnd() - 0.5) * 20;
                pts.push([sx + (ex - sx) * i / 10 + nx / nl * w, sy + (ey - sy) * i / 10 + ny / nl * w]);
              }
              drawPath(pts);
            }
          }
        }
      }
      D.step(dt);
      t += dt;
    }
    for (const id of D.earned) earned.add(id);
    days.push({ day: D.day, won: D.state !== 'lost', t: D.elapsed, lost: D.lost, dawn, bonus: D.bonusMet,
      delivered: D.delivered, rivals: D.rivalDelivered, washes });
    if (D.state !== 'night') break;
    D.nextDay();
  }
  return { days, earned: [...earned] };
}

async function run(bot, runs, file, browser, from, workers = 8) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    while (next < runs) { const i = next++; results[i] = await page.evaluate(playInPage, { seed: 1000 + i, bot, from }); }
    await page.close();
  }));
  return results;
}

// One line per bot: for each day, % of runs that won it (and, in brackets,
// % of those that reached it), median seconds to win it, median ants at dawn, median ants lost that day
// and % bonus; then achievements.
function report(name, rs, from, nDays) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
  const pct = (n, d) => d ? Math.round(100 * n / d) : 0;
  const cols = [];
  for (let d = from; d < nDays; d++) {
    const at = rs.map(r => r.days.find(x => x.day === d)).filter(Boolean);
    const won = at.filter(x => x.won);
    cols.push(`d${d + 1} ${String(pct(won.length, rs.length)).padStart(3)}% (${pct(won.length, at.length)}%) ` +
      `${Math.round(med(won.map(x => x.t)))}s ants ${med(at.map(x => x.dawn))} lost ${med(at.map(x => x.lost))} bonus ${pct(at.filter(x => x.bonus).length, at.length)}%` +
      (d === nDays - 1 ? ` rivals ${med(at.map(x => x.rivals))}` : ''));
  }
  const ach = {};
  for (const r of rs) for (const id of r.earned) ach[id] = (ach[id] || 0) + 1;
  const achs = Object.entries(ach).sort().map(([k, v]) => `${k} ${pct(v, rs.length)}%`).join(', ');
  console.log(`${name.padEnd(6)} ${cols.join(' | ')} || ${achs}`);
}

const runs = +process.argv[2] || 200;
const names = (process.argv[3] || Object.keys(BOTS).join(',')).split(',');
const overrides = {};
let from = 0;
for (const kv of (process.argv[4] || '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  if (k === 'FROM') from = +v - 1; else overrides[k] = v;
}
const file = buildDebug(overrides);
const browser = await chromium.launch();
const nDays = await (async () => { const pg = await browser.newPage(); await pg.goto(pathToFileURL(file).href);
  const n = await pg.evaluate(() => window.__dbg.DAYS.length); await pg.close(); return n; })();
for (const n of names) {
  if (!BOTS[n]) throw new Error(`unknown bot ${n}; bots: ${Object.keys(BOTS).join(', ')}`);
  report(n, await run(BOTS[n], runs, file, browser, from), from, nDays);
}
await browser.close();
