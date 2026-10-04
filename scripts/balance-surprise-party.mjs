// Headless balance bots for Surprise Party.
//
// Usage: node scripts/balance-surprise-party.mjs [trials=200] [fresh=1|2|both]
//
// Pre-build go/no-go: the rules and houses live in this file between
// "// § sim" and "// § end sim". Once games/surprise-party.html exists, the
// game holds that block and this script cuts it from the game (buildDebug()).
//
// Output, one line per house and bot:
//   house    par whispers / budget, solver decisions (non-wait moves), plan
//   <bot>    win or the reason it fails
//   novice   % of runs still winnable after 1/2/3 random wrong taps
//   check    the go/no-go targets, PASS/FAIL each
//
// Bots:
//   solver        exact search: fewest whispers, then fewest non-wait moves
//   whisper-only  exact search that never touches a door
//   doors-first   closes every door of the birthday person's room first,
//                 then exact search with those doors locked shut
//   habit         one-line rule: close the birthday doors at once, then
//                 whisper the unknown guest farthest from the birthday person
//                 whom the wave won't reach next tick; else wait
//   novice        follows the solver but makes k random wrong taps (a door
//                 or a whisper the plan didn't make) at random turns,
//                 re-planning after each; never undoes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/surprise-party.html');
const args = process.argv.slice(2);
const TRIALS = +(process.env.TRIALS || (/^\d+$/.test(args[0] || '') ? args[0] : 200));
const FRESHES = (args[1] || 'both') === 'both' ? [1, 2] : [+args[1]];

function buildDebug() {
  const src = fs.existsSync(SRC) ? fs.readFileSync(SRC, 'utf8') : fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const m = src.match(/\/\/ § sim\n[\s\S]*?\/\/ § end sim/);
  if (!m) throw new Error('no "// § sim" … "// § end sim" block');
  return new Function(m[0] + `
    return { RULES, HOUSES, parse, start, act, legal, solve, bRoomDoors, dist2, nbFor, genMap, genHouse };`)();
}

function simSource() {   // never called: buildDebug() reads this block as text
// § sim
const RULES = { turns: 8, reach: 2, fresh: 1 };

// '#' wall, '.' floor, 'g' guest, 'B' birthday person, 'd' open door, 'D' closed door.
// env = envelopes (whispers) for the house.
const HOUSES = [
  { id: '1-3', ch: 1, name: 'Three rooms', env: 1, map: [
    '#################',
    '#g.g.#.g.g.#.g.g#',
    '#...g.g...g.g...#',
    '#g.g.#.g.g.#.g.g#',
    '#################'] },
  { id: '2-1', ch: 2, name: 'The junction', env: 2, map: [
    '#####################',
    '#...g.g.g.g.g.g.g...#',
    '##########.##########',
    '#.g.g.g.g.gDg.g.g.g.#',
    '#........#d#........#',
    '#...g...#.B.#...g...#',
    '#####################'] },
  { id: '2-2', ch: 2, name: 'A friend inside', env: 3, map: [
    '#####################',
    '#...g.g.g.g.g.g.g...#',
    '##########.##########',
    '#.g.g.g.g.gDg.g.g.g.#',
    '#........#d#........#',
    '#...g...#gB.#...g...#',
    '#####################'] },
  { id: '3-1', ch: 3, name: 'The hallway', env: 2, map: [
    '#################',
    '#g.g.g.gDg.g.g.g#',
    '#######.#######.#',
    '#g.g.g.g#g.g.g.g#',
    '#######d###d#####',
    '#......g.B.g....#',
    '#################'] },
  { id: '3-2', ch: 3, name: 'Crossroads', env: 2, map: [
    '###############',
    '#......g......#',
    '#g.g.g.g.g.g.g#',
    '#d#####d#####d#',
    '#g.g.g.B.g.g.g#',
    '#d#####d#####d#',
    '#g.g.g.g.g.g.g#',
    '#......g......#',
    '###############'] },
];

function parse(h) {
  const rows = h.map, H = rows.length, W = rows[0].length;
  const cell = [], guests = [], doors = [];
  let B = -1, doorMask = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = rows[y][x] || '#', i = y * W + x;
    cell.push(c === '#' ? 0 : (c === 'd' || c === 'D') ? 2 : 1);
    if (c === 'g') guests.push(i);
    if (c === 'B') B = i;
    if (c === 'd' || c === 'D') { if (c === 'd') doorMask |= 1 << doors.length; doors.push(i); }
  }
  const P = { W, H, cell, guests, doors, B, n: guests.length, env: h.env, doorMask0: doorMask, nbCache: new Map() };
  return P;
}

// cells within RULES.reach walking steps of cell s, given open-door mask
function dist2(P, s, mask) {
  const seen = new Map([[s, 0]]), q = [s];
  while (q.length) {
    const c = q.shift(), d = seen.get(c);
    if (d >= RULES.reach) continue;
    const x = c % P.W;
    for (const nc of [c - 1, c + 1, c - P.W, c + P.W]) {
      if ((nc === c - 1 && x === 0) || (nc === c + 1 && x === P.W - 1) || nc < 0 || nc >= P.cell.length) continue;
      if (seen.has(nc) || P.cell[nc] === 0) continue;
      if (P.cell[nc] === 2 && !(mask >> P.doors.indexOf(nc) & 1)) continue;
      seen.set(nc, d + 1); q.push(nc);
    }
  }
  return seen;
}

// nb[i] = bitmask of guests guest i tells (bit n = birthday person)
function nbFor(P, mask) {
  let nb = P.nbCache.get(mask);
  if (nb) return nb;
  nb = P.guests.map((g, i) => {
    const s = dist2(P, g, mask); let m = 0;
    P.guests.forEach((h, j) => { if (j !== i && s.has(h)) m |= 1 << j; });
    if (P.B >= 0 && s.has(P.B)) m |= 1 << P.n;
    return m;
  });
  P.nbCache.set(mask, nb);
  return nb;
}

// state: t = actions taken, know (bitmask), f = [tells left 1, tells left 2], doors, used whispers, spoiled
function start(P) { return { t: 0, know: 0, f: [0, 0], doors: P.doorMask0, used: 0, spoiled: false, bAt: -1 }; }

// actions: {k:'wait'} | {k:'whisper', i} | {k:'door', j}. Returns the new state (after the tick).
function act(P, s, a) {
  const n = { t: s.t, know: s.know, f: s.f.slice(), doors: s.doors, used: s.used, spoiled: s.spoiled, bAt: s.bAt, heard: 0 };
  if (a.k === 'whisper') { n.know |= 1 << a.i; n.f[RULES.fresh - 1] |= 1 << a.i; n.used++; }
  if (a.k === 'door') n.doors ^= 1 << a.j;
  // tick: everyone with tells left tells everyone within reach, then loses one tell
  const tellers = n.f[0] | n.f[1], nb = nbFor(P, n.doors);
  let heard = 0;
  for (let i = 0; i < P.n; i++) if (tellers >> i & 1) heard |= nb[i];
  n.t++;
  const bBit = 1 << P.n;
  if (heard & bBit) { if (n.bAt < 0) n.bAt = n.t; if (n.t < RULES.turns) n.spoiled = true; }
  const fresh = heard & ~n.know & (bBit - 1);
  n.know |= fresh;
  n.heard = fresh;
  if (RULES.fresh === 1) n.f = [fresh, 0];
  else n.f = [n.f[1], fresh];
  return n;
}

function legal(P, s, opt = {}) {
  const out = [{ k: 'wait' }];
  if (s.used < (opt.env ?? P.env)) for (let i = 0; i < P.n; i++) if (!(s.know >> i & 1)) out.push({ k: 'whisper', i });
  if (!opt.noDoors) for (let j = 0; j < P.doors.length; j++) if (!(opt.locked & (1 << j))) out.push({ k: 'door', j });
  return out;
}

// Exact forward search. Goal 'win': all guests know after the last tick and the birthday
// person never heard before 8:00. Lexicographic cost: whispers, then non-wait moves.
// Returns { w, m, plan, end } or null. goal 'survive': any line that doesn't spoil.
// opt: env (whisper budget), noDoors, locked (door bitmask never toggled).
function solve(P, s0, opt = {}) {
  const n = P.n, all = (1 << n) - 1, bBit = 1 << n, D = P.doors.length, F2 = RULES.fresh === 2;
  const env = opt.env ?? P.env, survive = opt.goal === 'survive';
  const nbOpen = nbFor(P, (1 << D) - 1);
  const K = all + 1, big = n * (F2 ? 3 : 2) + D > 52;   // numeric keys while they fit in a double
  // could every unknown guest still hear in time with no whispers left (all doors open, one hop per tick)?
  const reachable = (know, f0, f1, left) => {
    let fr = f0 | f1, kn = know;
    for (let t = 0; t < left && fr; t++) {
      let h = 0;
      for (let i = 0; i < n; i++) if (fr >> i & 1) h |= nbOpen[i];
      fr = h & ~kn & all; kn |= fr;
    }
    return (kn & all) === all;
  };
  // layer arrays: know, f0, f1, doors, used, w, m, parent index, action code (-1 wait, i whisper, 100 + j door)
  let L = { know: [s0.know], f0: [s0.f[0]], f1: [s0.f[1]], doors: [s0.doors], used: [s0.used], w: [0], m: [0], par: [-1], act: [0] };
  const layers = [L];
  for (let t = s0.t; t < RULES.turns; t++) {
    const N = { know: [], f0: [], f1: [], doors: [], used: [], w: [], m: [], par: [], act: [] }, idx = new Map();
    const last = t + 1 === RULES.turns;
    for (let p = 0; p < L.know.length; p++) {
      const know = L.know[p], f0 = L.f0[p], f1 = L.f1[p], doors = L.doors[p], used = L.used[p];
      const nA = 1 + (used < env ? n : 0) + (opt.noDoors ? 0 : D);
      for (let c = 0; c < nA; c++) {
        let kn = know, a0 = f0, a1 = f1, dm = doors, u = used, code = -1;
        if (c >= 1 && c <= (used < env ? n : 0)) {
          const i = c - 1; if (know >> i & 1) continue;
          kn |= 1 << i; if (F2) a1 |= 1 << i; else a0 |= 1 << i; u++; code = i;
        } else if (c > 0) {
          const j = c - 1 - (used < env ? n : 0);
          if (opt.locked >> j & 1) continue;
          dm ^= 1 << j; code = 100 + j;
        }
        const nb = nbFor(P, dm), tellers = a0 | a1;
        let heard = 0;
        for (let i = 0; i < n; i++) if (tellers >> i & 1) heard |= nb[i];
        if ((heard & bBit) && !last) continue;
        const fresh = heard & ~kn & all;
        kn |= fresh;
        const n0 = F2 ? a1 : fresh, n1 = F2 ? fresh : 0;
        if (!survive && u >= env && !reachable(kn, n0, n1, RULES.turns - t - 1)) continue;
        const key = big ? kn + ',' + n0 + ',' + n1 + ',' + dm : ((kn * K + n0) * K + n1) * (1 << D) + dm;
        const w = L.w[p] + (code >= 0 && code < 100 ? 1 : 0), m = L.m[p] + (code === -1 ? 0 : 1);
        const old = idx.get(key);
        if (old === undefined) {
          idx.set(key, N.know.length);
          N.know.push(kn); N.f0.push(n0); N.f1.push(n1); N.doors.push(dm); N.used.push(u); N.w.push(w); N.m.push(m); N.par.push(p); N.act.push(code);
        } else if (w < N.w[old] || (w === N.w[old] && m < N.m[old])) {
          N.used[old] = u; N.w[old] = w; N.m[old] = m; N.par[old] = p; N.act[old] = code;
        }
      }
    }
    L = N; layers.push(L);
    if (!L.know.length) return null;
  }
  let best = -1;
  for (let p = 0; p < L.know.length; p++) {
    if (!survive && L.know[p] !== all) continue;
    if (best < 0 || L.w[p] < L.w[best] || (L.w[p] === L.w[best] && L.m[p] < L.m[best])) best = p;
  }
  if (best < 0) return null;
  const plan = [];
  for (let li = layers.length - 1, p = best; li > 0; p = layers[li].par[p], li--) {
    const c = layers[li].act[p];
    plan.unshift(c === -1 ? { k: 'wait' } : c < 100 ? { k: 'whisper', i: c } : { k: 'door', j: c - 100 });
  }
  let end = s0;
  for (const a of plan) end = act(P, end, a);
  return { w: L.w[best], m: L.m[best], plan, end };
}

// doors that touch the birthday person's room (flood fill from B, stopping at doors)
function bRoomDoors(P) {
  if (P.B < 0) return [];
  const seen = new Set([P.B]), q = [P.B], out = new Set();
  while (q.length) {
    const c = q.shift();
    for (const nc of [c - 1, c + 1, c - P.W, c + P.W]) {
      if (seen.has(nc) || P.cell[nc] === 0) continue;
      seen.add(nc);
      if (P.cell[nc] === 2) { out.add(P.doors.indexOf(nc)); continue; }
      q.push(nc);
    }
  }
  return [...out];
}
// § generator: room grid (ch1 gaps, ch2 doors + birthday room a dead end, ch3 hallway)
function rng32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function genMap(rnd, o) {
  const { cols, rows, rw, rh, guests, ch } = o, hall = ch >= 3;
  const rowsH = [];   // interior height of each room row
  for (let r = 0; r < rows; r++) rowsH.push(hall && r === 1 ? 1 : rh);
  const W = cols * (rw + 1) + 1, H = rowsH.reduce((a, b) => a + b + 1, 1);
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const y0 = []; let y = 1;
  for (let r = 0; r < rows; r++) { y0.push(y); y += rowsH[r] + 1; }
  const room = (c, r) => hall && r === 1 ? 'H' : c + ',' + r;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    for (let yy = 0; yy < rowsH[r]; yy++) for (let xx = 0; xx < rw; xx++) g[y0[r] + yy][1 + c * (rw + 1) + xx] = '.';
  if (hall) for (let c = 0; c < cols - 1; c++) for (let yy = 0; yy < rowsH[1]; yy++) g[y0[1] + yy][(c + 1) * (rw + 1)] = '.';
  // adjacent room pairs and the wall cells between them
  const pairs = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (c + 1 < cols && room(c, r) !== room(c + 1, r)) pairs.push({ a: room(c, r), b: room(c + 1, r), cells: Array.from({ length: rowsH[r] }, (_, k) => [(c + 1) * (rw + 1), y0[r] + k]) });
    if (r + 1 < rows) pairs.push({ a: room(c, r), b: room(c, r + 1), cells: Array.from({ length: rw }, (_, k) => [1 + c * (rw + 1) + k, y0[r] + rowsH[r]]) });
  }
  for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
  const par = {}, find = x => par[x] === undefined || par[x] === x ? x : (par[x] = find(par[x]));
  const deg = {}, links = [];
  for (const p of pairs) {
    const ra = find(p.a), rb = find(p.b);
    const extra = ra === rb;
    if (extra && rnd() > o.loops) continue;
    par[ra] = rb;
    deg[p.a] = (deg[p.a] || 0) + 1; deg[p.b] = (deg[p.b] || 0) + 1;
    const [x, yy] = p.cells[Math.floor(rnd() * p.cells.length)];
    g[yy][x] = ch === 1 ? '.' : rnd() < o.closed ? 'D' : 'd';
    links.push(p);
  }
  // floor cells by room
  const cellsOf = id => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (room(c, r) === id)
      for (let yy = 0; yy < rowsH[r]; yy++) for (let xx = 0; xx < rw; xx++) out.push([1 + c * (rw + 1) + xx, y0[r] + yy]);
    if (id === 'H') for (let c = 0; c < cols - 1; c++) for (let yy = 0; yy < rowsH[1]; yy++) out.push([(c + 1) * (rw + 1), y0[1] + yy]);
    return out;
  };
  const free = [];
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (g[yy][x] === '.') free.push([x, yy]);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  if (ch >= 2) {
    const ids = Object.keys(deg);
    const cand = hall ? ['H'] : ids.filter(id => deg[id] === 1);
    if (!cand.length) return null;
    const [bx, by] = pick(cellsOf(pick(cand)));
    g[by][bx] = 'B';
  }
  // guests gather: most stand exactly 2 steps from someone already placed, so the news can chain
  const placed = [];
  let tries = 0;
  while (placed.length < guests && tries++ < 500) {
    let c = null;
    if (placed.length && rnd() < o.chain) {
      const [px, py] = pick(placed), near = [];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== 2) continue;
        const x = px + dx, yy = py + dy;
        if (g[yy] && g[yy][x] === '.' && (g[py + Math.sign(dy)][px] !== '#' || g[py][px + Math.sign(dx)] !== '#') && g[(py + yy) / 2 | 0] && (dx && dy || g[py + dy / 2][px + dx / 2] === '.')) near.push([x, yy]);
      }
      if (near.length) c = pick(near);
    }
    if (!c) c = pick(free);
    const [x, yy] = c;
    if (g[yy][x] !== '.') continue;
    g[yy][x] = 'g'; placed.push(c);
  }
  return g.map(r => r.join(''));
}
// a generated house: env = fewest whispers that win; kept only if doors matter
function genHouse(seed, o) {
  const rnd = rng32(seed);
  for (let tries = 0; tries < (o.tries || 200); tries++) {
    const map = genMap(rnd, o);
    if (!map) continue;
    const h = { id: 'gen', ch: o.ch, env: 99, map };
    const P = parse(h);
    let sol = null;
    for (let e = 1; e <= (o.maxEnv || 3) && !sol; e++) { P.env = e; sol = solve(P, start(P)); }
    if (!sol) continue;
    h.env = P.env = sol.w;
    if (o.ch >= 2) {
      if (sol.m < (o.minDecisions || 3)) continue;
      if (solve(P, start(P), { noDoors: true })) continue;
    }
    h.tries = tries + 1; h.par = sol;
    return h;
  }
  return null;
}
// § end sim
}

const { RULES, HOUSES, parse, start, act, legal, solve, bRoomDoors, dist2, nbFor, genMap, genHouse } = buildDebug();

// § bots
let seed = 1;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const fmt = a => a.k === 'wait' ? '·' : a.k === 'whisper' ? 'w' + a.i : 'd' + a.j;
const fmtPlan = (P, plan) => plan.map(fmt).join(' ');

function play(P, s, chooser) {
  while (s.t < RULES.turns && !s.spoiled) s = act(P, s, chooser(s));
  return s;
}
const result = (P, s) => s.spoiled ? `spoiled ${clock(s.bAt)}` : s.know === (1 << P.n) - 1 ? `win (${s.used} env)` : `${P.n - popcount(s.know)} guests missed`;
const popcount = x => { let c = 0; while (x) { c += x & 1; x >>>= 1; } return c; };
const clock = t => { const m = 18 * 60 + 15 * t; return `${Math.floor(m / 60) - 12}:${String(m % 60).padStart(2, '0')}`; };

function doorsFirst(P) {
  const bd = bRoomDoors(P);
  let s = start(P), locked = 0;
  for (const j of bd) {
    locked |= 1 << j;
    if (s.doors >> j & 1) { s = act(P, s, { k: 'door', j }); if (s.spoiled) return { txt: `spoiled ${clock(s.bAt)}` }; }
  }
  const r = solve(P, s, { locked });
  return r ? { win: true, txt: `win (${r.w} env)` } : { txt: 'no win with those doors shut' + (s.t ? ` (${s.t} turns)` : '') };
}

function habit(P) {
  const bd = bRoomDoors(P);
  const gd = P.guests.map(g => P.B < 0 ? 0 : walk(P, g, P.B));
  const s = play(P, start(P), s => {
    for (const j of bd) if (s.doors >> j & 1) return { k: 'door', j };
    if (s.used < P.env) {
      // guests the wave reaches next tick
      const nxt = act(P, s, { k: 'wait' });
      let best = -1;
      for (let i = 0; i < P.n; i++) if (!(s.know >> i & 1) && !(nxt.know >> i & 1) && (best < 0 || gd[i] > gd[best])) best = i;
      if (best >= 0) return { k: 'whisper', i: best };
    }
    return { k: 'wait' };
  });
  return { win: !s.spoiled && s.know === (1 << P.n) - 1, txt: result(P, s) };
}

function walk(P, a, b) {   // walking distance, all doors open
  const seen = new Map([[a, 0]]), q = [a];
  while (q.length) {
    const c = q.shift();
    if (c === b) return seen.get(c);
    for (const nc of [c - 1, c + 1, c - P.W, c + P.W]) if (!seen.has(nc) && P.cell[nc]) { seen.set(nc, seen.get(c) + 1); q.push(nc); }
  }
  return 99;
}

function novice(P, k, extraEnv = 0, kindsAllowed = null) {
  const env = P.env + extraEnv;
  let wins = 0;
  for (let tr = 0; tr < TRIALS; tr++) {
    const turns = new Set();
    while (turns.size < k) turns.add(Math.floor(rnd() * RULES.turns));
    let s = start(P), plan = solve(P, s, { env }).plan, ok = true;
    while (s.t < RULES.turns) {
      let a = plan[0];
      if (turns.has(s.t)) {
        // a wrong tap: a door the plan didn't toggle, a guest it didn't whisper, or a wait where it acted
        const wrong = legal(P, s, { env }).filter(b => fmt(b) !== fmt(a) && (b.k !== 'wait' || a.k !== 'wait'));
        const kinds = [...new Set(wrong.map(b => b.k))].filter(x => !kindsAllowed || kindsAllowed.includes(x));
        if (kinds.length) {
          const kind = kinds[Math.floor(rnd() * kinds.length)], pool = wrong.filter(b => b.k === kind);
          a = pool[Math.floor(rnd() * pool.length)]; plan = null;
        }
      }
      s = act(P, s, a);
      if (s.spoiled) { ok = false; break; }
      if (plan) plan = plan.slice(1);
      else { const r = solve(P, s, { env }); if (!r) { ok = false; break; } plan = r.plan; }
    }
    if (ok && s.know === (1 << P.n) - 1) wins++;
  }
  return Math.round(100 * wins / TRIALS);
}

function run(fresh) {
  RULES.fresh = fresh;
  console.log(`\n== fresh for ${fresh} turn${fresh > 1 ? 's' : ''} ==`);
  const rows = [];
  for (const h of HOUSES) {
    const P = parse(h);
    const t0 = Date.now();
    const sol = solve(P, start(P));
    const ms = Date.now() - t0;
    if (!sol) { console.log(`${h.id.padEnd(5)} ${h.name}: UNSOLVABLE with ${h.env} env (${ms} ms)`); rows.push({ h, bad: true }); continue; }
    const upTo = (o, from) => { for (let e = from; e <= from + 3; e++) { const r = solve(P, start(P), { ...o, env: e }); if (r) return r; } return null; };
    const free = upTo({}, 1);
    const wo = solve(P, start(P), { noDoors: true });
    const woFree = wo || upTo({ noDoors: true }, P.env + 1);
    const df = doorsFirst(P), hb = habit(P);
    const nv = [1, 2, 3].map(k => novice(P, k)), nvT = [1, 2, 3].map(k => novice(P, k, 0, ['door', 'wait'])), nv1 = [1, 2, 3].map(k => novice(P, k, 1));
    const wo1 = solve(P, start(P), { noDoors: true, env: P.env + 1 });
    const dec = sol.m;
    console.log(`${h.id.padEnd(5)} ch${h.ch} ${h.name}: ${P.n} guests, ${P.doors.length} doors, env ${h.env}, par ${sol.w} (fewest ${free.w}), decisions ${dec}, plan ${fmtPlan(P, sol.plan)}  [${ms} ms]`);
    console.log(`  whisper-only  ${wo ? `win (${wo.w} env)` : `fails` + (woFree ? ` (needs ${woFree.w} env)` : ` (none up to ${P.env + 4} env)`)}`);
    console.log(`  doors-first   ${df.txt}`);
    console.log(`  habit         ${hb.txt}`);
    console.log(`  novice        survives 1/2/3 wrong taps: ${nv.join('/')}%; door/wait slips only ${nvT.join('/')}%; any, with +1 envelope ${nv1.join('/')}% (whisper-only then ${wo1 ? 'wins' : 'still fails'})`);
    rows.push({ h, sol, wo, df, hb, nv, nvT, nv1, dec });
  }
  // § checks
  const chk = (name, ok) => console.log(`  check ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  const ok = rows.filter(r => !r.bad);
  chk('every house solvable', ok.length === rows.length);
  chk('whisper-only fails every ch2+ house', ok.filter(r => r.h.ch >= 2).every(r => !r.wo));
  chk('doors-first fails every ch3 house', ok.filter(r => r.h.ch >= 3).every(r => !r.df.win));
  chk('habit fails every ch3 house', ok.filter(r => r.h.ch >= 3).every(r => !r.hb.win));
  chk('solver decisions >= 3 on ch2+ houses', ok.filter(r => r.h.ch >= 2).every(r => r.dec >= 3));
  chk('novice survives 2 wrong taps >= 50% (median house)', median(ok.map(r => r.nv[1])) >= 50);
  chk('novice survives 3 wrong taps >= 25% (median house)', median(ok.map(r => r.nv[2])) >= 25);
}
const median = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] ?? 0; };

// show <id>: the house with guest letters and who tells whom (doors as drawn)
function show(id) {
  const h = HOUSES.find(x => x.id === id), P = parse(h);
  const L = i => i === P.n ? 'B' : String.fromCharCode(97 + i);
  const grid = h.map.map(r => r.split(''));
  P.guests.forEach((g, i) => { grid[Math.floor(g / P.W)][g % P.W] = L(i); });
  P.doors.forEach((d, j) => { grid[Math.floor(d / P.W)][d % P.W] = String(j); });
  console.log(grid.map(r => r.join('')).join('\n'));
  const open = P.doorMask0, all = (1 << P.doors.length) - 1;
  for (const [nm, m] of [['as drawn', open], ['all open', all], ['all shut', 0]]) {
    const nb = nbFor(P, m);
    console.log(nm.padEnd(9), nb.map((x, i) => L(i) + ':' + [...Array(P.n + 1).keys()].filter(j => x >> j & 1).map(L).join('')).join(' '));
  }
}
if (args[0] === 'gen') {   // gen ch cols rows guests [count]: sample generated houses
  RULES.fresh = +(process.env.FRESH || 1);
  const [ch, cols, rows, guests, count = 5] = args.slice(1).map(Number);
  for (let k = 1; k <= count; k++) {
    const t0 = Date.now();
    const h = genHouse(k, { ch, cols, rows, guests, rw: 4, rh: 3, loops: 0.3, closed: 0.3, chain: 0.85 });
    if (!h) { console.log(`seed ${k}: none (${Date.now() - t0} ms)`); continue; }
    const P = parse(h);
    const df = ch >= 2 ? doorsFirst(P).txt : '-', hb = habit(P).txt;
    console.log(`seed ${k}: tries ${h.tries}, ${Date.now() - t0} ms, env ${h.env}, decisions ${h.par.m}, plan ${fmtPlan(P, h.par.plan)} | doors-first ${df} | habit ${hb}`);
    if (process.env.MAPS) console.log(h.map.join('\n'));
  }
  process.exit(0);
}
// design <id> [iters]: hill-climb guest positions on a house's floor plan (walls, doors, B kept).
// Goal: whisper-only needs >= par + 2, solver decisions >= 3, novice slack. Dev tool, prints the best map.
if (args[0] === 'design') {
  RULES.fresh = +(process.env.FRESH || 1);
  const h0 = HOUSES.find(x => x.id === args[1]), iters = +(args[2] || 300);
  const R = rng => Math.floor(rnd() * rng);
  const floor = [];
  h0.map.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.' || c === 'g') floor.push([x, y]); }));
  const score = map => {
    const P = parse({ ...h0, map, env: 99 });
    if (P.n < 6) return { v: -1 };
    let sol = null;
    for (let e = 1; e <= 3 && !sol; e++) sol = solve(P, start(P), { env: e });
    if (!sol) return { v: -1 };
    P.env = sol.w + 1;
    const wo = solve(P, start(P), { noDoors: true });
    const df = h0.ch >= 3 ? doorsFirst(P).win : false;
    const nv = TRIALS ? novice(P, 2) : 0;
    const v = (wo ? 0 : 40) + (df ? 0 : 10) + Math.min(sol.m, 5) * 4 + nv / 5 - Math.abs(P.n - (h0.guests || 12)) - sol.w;
    return { v, P, sol, nv, wo };
  };
  let cur = h0.map, best = score(cur);
  for (let it = 0; it < iters; it++) {
    const g = cur.map(r => r.split(''));
    const gs = [], fs = [];
    floor.forEach(([x, y]) => (g[y][x] === 'g' ? gs : fs).push([x, y]));
    const op = R(3);
    if ((op === 0 || !gs.length) && fs.length) { const [x, y] = fs[R(fs.length)]; g[y][x] = 'g'; }
    else if (op === 1 && gs.length) { const [x, y] = gs[R(gs.length)]; g[y][x] = '.'; }
    else if (gs.length && fs.length) { const [x, y] = gs[R(gs.length)], [u, v] = fs[R(fs.length)]; g[y][x] = '.'; g[v][u] = 'g'; }
    const map = g.map(r => r.join('')), sc = score(map);
    if (sc.v >= best.v) { cur = map; best = sc; }
  }
  console.log(`best v ${best.v.toFixed(1)}: ${best.P.n} guests, par ${best.sol.w} (env ${best.P.env}), decisions ${best.sol.m}, whisper-only ${best.wo ? 'wins' : 'fails'} at env, novice2 ${best.nv}%, plan ${fmtPlan(best.P, best.sol.plan)}`);
  console.log(cur.map(r => `    '${r}',`).join('\n'));
  process.exit(0);
}
if (args[0] === 'show') { RULES.fresh = 1; show(args[1]); process.exit(0); }
for (const f of FRESHES) run(f);
