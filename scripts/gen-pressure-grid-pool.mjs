// Generates Pressure Grid's Pipeline boards (v12): random walled maps per
// tier, kept when the solver proves par fast and the board needs what its
// tier teaches. Writes the POOL block of games/pressure-grid.html (between
// "// § pool" and "// § end pool") unless --dry. One line per tier.
//
// Usage: node scripts/gen-pressure-grid-pool.mjs [--per N] [--seed S] [--budget MS] [--tier N] [--dry]
//        node scripts/gen-pressure-grid-pool.mjs --merge   (writes the game's block from the saved tiers)
// --tier N makes one tier only (run the three in parallel), saved to
// scripts/pressure-grid-pool.json; --merge or a full run writes the game.
//
// Tiers (TIERS below): 1 small warm-up boards (rings, walls, seals); 2 those
// plus vents and leaky cells; 3 habit breakers (the habit bot, one ring at a
// time by its shortest line, can't match par), valves too.
// A board is kept when: par is proven within the budget and in its kind's
// range, the board needs a pour (pump-only can't match par), and its new
// piece matters (made plain, the par changes). Each pool entry: "par:inner rows" (the outer wall ring is
// added on load); the generator also prints habit and novice numbers, which
// balance-pressure-grid.mjs --pipeline uses to tune the move bank.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { solve, habit, noviceRuns, pumpOnlyPar, parseMap, sim } from './balance-pressure-grid.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const PER = +opt('--per', 60);
const DRY = args.includes('--dry');
let seed = +opt('--seed', 12);
const rnd = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % k; };
const pick = a => a[rnd(a.length)];

// A kind is one way of making a map: its sizes, par range and new piece.
const BASIC = { kind: 'basic', par: [4, 10], sizes: [[4, 3], [5, 3], [4, 4], [5, 4]], pieces: '' };
const VENTS = { kind: 'vents', par: [5, 12], sizes: [[4, 3], [5, 3], [4, 4], [5, 4]], pieces: '*lL' };
const VALVES = { kind: 'valves', par: [6, 13], sizes: [[5, 2], [4, 3], [5, 3]], pieces: '^>v<' };
const TIERS = [
  // warm-up: small boards, nothing new (boards 1-3)
  { tier: 1, kinds: [{ ...BASIC, par: [3, 8], sizes: [[3, 2], [4, 2], [3, 3], [4, 3]] }] },
  // everything the levels teach but valves (boards 4-9, then every third)
  { tier: 2, kinds: [BASIC, VENTS] },
  // habit breakers: the one-ring-at-a-time habit can't match par (board 10 on)
  { tier: 3, kinds: [BASIC, VENTS, VENTS, VALVES], habitBreak: true },
];

function connected(rows) {
  const h = rows.length, w = rows[0].length, cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] !== '#') cells.push(y * w + x);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), q = [cells[0]];
  while (q.length) {
    const i = q.pop(), x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || rows[ny][nx] === '#') continue;
      const j = ny * w + nx; if (!seen.has(j)) { seen.add(j); q.push(j); }
    }
  }
  return seen.size === cells.length;
}

function randomMap(T) {
  T = pick(T.kinds);
  const [w, h] = pick(T.sizes), g = Array.from({ length: h }, () => Array(w).fill('.'));
  const free = () => { for (let t = 0; t < 50; t++) { const x = rnd(w), y = rnd(h); if (g[y][x] === '.') return [x, y]; } return null; };
  const put = ch => { const c = free(); if (c) g[c[1]][c[0]] = ch; return c; };
  for (let k = 1 + rnd(Math.max(1, (w * h / 4) | 0)); k > 0; k--) put('#');
  const nT = 2 + rnd(2);
  for (let k = 0; k < nT; k++) put(rnd(3) === 0 ? 'S' : 'o');
  if (rnd(2)) put('s');
  if (T.kind === 'vents') for (let k = 1 + rnd(2); k > 0; k--) put(pick('*l*L'));
  if (T.kind === 'valves') {
    if (rnd(2)) put('*');
    // a valve on a sealed cell's side, pointing into it or (wrong way) out of it, with a cell behind it
    for (let k = 1 + rnd(2), tries = 0; k > 0 && tries < 20; tries++) {
      const c = free(); if (!c) break;
      const [x, y] = c, d = rnd(4), [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][d];
      const vx = x - dx, vy = y - dy, bx = x - 2 * dx, by = y - 2 * dy;   // S at c, valve beside it, a cell behind the valve
      if (bx < 0 || by < 0 || bx >= w || by >= h || g[vy][vx] === 'S' || g[by][bx] === '#') continue;
      g[y][x] = rnd(3) ? 'S' : 's';
      g[vy][vx] = rnd(2) ? '^>v<'[d] : '^>v<'[(d + 2) % 4];
      k--;
    }
  }
  const rows = g.map(r => r.join(''));
  rows.kind = T;
  return rows;
}

const walled = rows => ['#'.repeat(rows[0].length + 2), ...rows.map(r => `#${r}#`), '#'.repeat(rows[0].length + 2)];
const BUDGET = +opt('--budget', 1500);   // ms per search; open boards blow up, walled ones prove fast
function parOf(rows) {
  const r = solve(parseMap(walled(rows).join(',')), { budget: BUDGET });
  return r.proven && !r.overBudget ? r : null;
}

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pressure-grid-pool.json');
const saved = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [[], [], []];
const ONLY = opt('--tier', null);
const PART = args.includes('--seed') ? `-${opt('--seed')}` : '';   // parallel runs of one tier save apart; --merge joins them
for (const T of args.includes('--merge') ? [] : TIERS.filter(t => ONLY === null || +ONLY === t.tier)) {
  seed = +opt('--seed', 12) * 7919 + T.tier;
  const kept = [], seen = new Set(), why = {};
  const no = r => { why[r] = (why[r] || 0) + 1; };
  let tries = 0;
  const t0 = Date.now();
  while (kept.length < PER && tries < +opt('--tries', PER * 400)) {
    tries++;
    const rows = randomMap(T), K = rows.kind;
    const k = rows.join('/');
    if (seen.has(k) || !connected(rows)) { no('dup/split'); continue; }
    seen.add(k);
    if (K.pieces && ![...K.pieces].some(ch => k.includes(ch))) { no('no piece'); continue; }
    const r = parOf(rows);
    if (!r) { no('unsolved/slow'); continue; }
    if (r.par < K.par[0] || r.par > K.par[1]) { no('par range'); continue; }
    const L = r.L;
    // needs a pour: pump-only can't match par (a sealed target rules it out anyway)
    if (!L.targets.some(t => L.kind[t] === sim.SEALED)) {
      const p = pumpOnlyPar(L, Date.now() + BUDGET);
      if (p !== null && p <= r.par) { no('pump-only'); continue; }
    }
    // the kind's piece matters: made plain (vents and leaky cells open), the par changes;
    // valves count if their arrows matter (two-way seals change par) or the pipe is used (walls change it)
    if (K.pieces) {
      const plains = K.kind === 'vents' ? [rows.map(row => row.replace(/[*l]/g, '.').replace(/L/g, 'o'))]
        : [rows.map(row => row.replace(/[\^>v<]/g, 's')), rows.map(row => row.replace(/[\^>v<]/g, '#'))];
      if (plains.every(pl => { const q = parOf(pl); return q && q.par === r.par; })) { no('piece idle'); continue; }
    }
    const hb = habit(L, Date.now() + BUDGET);
    if (hb == null) { no('habit'); continue; }
    if (T.habitBreak && hb <= r.par) { no('habit at par'); continue; }
    const nov = noviceRuns(L, 'greedy', 40);
    const ok = nov.filter(Boolean).sort((a, b) => a - b);
    const novMed = ok.length >= 20 ? ok[19] : 41;   // median of 40 runs, 41 = unsolved
    kept.push({ par: r.par, rows, habit: hb, novice: novMed });
    process.stderr.write(`  t${T.tier} ${kept.length}/${PER} (${tries} tries)\r`);
    // saved as it goes, so a stopped run keeps what it found
    if (!DRY) fs.writeFileSync(DATA.replace('.json', `.t${T.tier}${PART}.json`), JSON.stringify(kept.map(b => ({ par: b.par, habit: b.habit, novice: b.novice, map: b.rows.join('/') }))) + '\n');
  }
  console.error(`\nt${T.tier} rejected: ${JSON.stringify(why)}`);
  kept.sort((a, b) => a.par - b.par || a.rows.join('').localeCompare(b.rows.join('')));
  saved[T.tier - 1] = kept.map(b => ({ par: b.par, habit: b.habit, novice: b.novice, map: b.rows.join('/') }));
  if (!DRY) fs.writeFileSync(DATA.replace('.json', `.t${T.tier}${PART}.json`), JSON.stringify(saved[T.tier - 1]) + '\n');
  const pars = kept.map(b => b.par), loss = kept.map(b => b.habit - b.par);
  const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-';
  console.log(`tier ${T.tier}: ${kept.length} boards from ${tries} tries · par ${Math.min(...pars)}-${Math.max(...pars)} avg ${avg(pars)} · habit loss avg ${avg(loss)} · novice unsolved ${kept.filter(b => b.novice > 40).length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

for (let t = 1; t <= 3; t++) {
  if (ONLY !== null && !args.includes('--merge')) break;
  const files = fs.readdirSync(path.dirname(DATA)).filter(f => f.startsWith(`pressure-grid-pool.t${t}`) && f.endsWith('.json')).sort();
  if (!files.length) continue;
  const seenMaps = new Set();
  saved[t - 1] = files.flatMap(f => JSON.parse(fs.readFileSync(path.join(path.dirname(DATA), f), 'utf8')))
    .filter(b => !seenMaps.has(b.map) && seenMaps.add(b.map)).sort((a, b) => a.par - b.par || a.map.localeCompare(b.map));
  if (!DRY) files.forEach(f => fs.unlinkSync(path.join(path.dirname(DATA), f)));
}
const pools = saved;
if (!DRY && (ONLY === null || args.includes('--merge'))) fs.writeFileSync(DATA, JSON.stringify(saved) + '\n');
const body = pools.map(p => '    [' + p.map(b => `'${b.par}:${b.map}'`).join(',\n     ') + ']').join(',\n');
const block = `// § pool: Pipeline boards, generated by scripts/gen-pressure-grid-pool.mjs (don't edit by hand).
  // One list per tier; "par:inner rows" (the outer wall ring is added on load).
  const POOL = [
${body}
  ];
  // § end pool`;
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/pressure-grid.html');
if (!DRY && (ONLY === null || args.includes('--merge'))) {
  const html = fs.readFileSync(SRC, 'utf8');
  const re = /\/\/ § pool[\s\S]*?\/\/ § end pool/;
  if (!re.test(html)) throw new Error('no "// § pool" … "// § end pool" block in games/pressure-grid.html');
  fs.writeFileSync(SRC, html.replace(re, block));
  console.log(`wrote ${pools.map(p => p.length).join(' + ')} boards to games/pressure-grid.html`);
}
