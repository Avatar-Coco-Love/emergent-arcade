// Headless balance bots for Surprise Party.
//
// Usage: node scripts/balance-surprise-party.mjs [trials=200] [fresh=1|2|both]
//
// Runs the game's own rules: buildDebug() cuts the pure block between
// "// § sim" and "// § end sim" out of games/surprise-party.html (rules, the
// campaign houses, the Party Season generator).
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
//   season        Party Season economy at 100/90/75/50% chance of finding par per house
//   novice        follows the solver but makes k random wrong taps (a door,
//                 a wait, or a whisper outside the tinted danger zone, that
//                 the plan didn't make) at random turns, re-planning after
//                 each; never undoes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/surprise-party.html');
const args = process.argv.slice(2);
const TRIALS = +(process.env.TRIALS || (/^\d+$/.test(args[0] || '') ? args[0] : 200));
const FRESHES = (args[1] || 'both') === 'both' ? [1, 2] : [+args[1]];

function buildDebug() {
  const src = fs.readFileSync(SRC, 'utf8');
  const m = src.match(/\/\/ § sim[\s\S]*?\/\/ § end sim/);
  if (!m) throw new Error('no "// § sim" … "// § end sim" block');
  return new Function(m[0] + `
    return { RULES, HOUSES, parse, start, act, legal, solve, bRoomDoors, dist2, nbFor, seasonMap, seasonHouse, rng32 };`)();
}

const { RULES, HOUSES, parse, start, act, legal, solve, bRoomDoors, dist2, nbFor, seasonMap, seasonHouse, rng32 } = buildDebug();

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

// cells within 2 steps of the birthday person with the doors as they are (the tint)
const zone = (P, s) => P.B < 0 ? new Map() : dist2(P, P.B, s.doors);
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
        // the danger zone is tinted on screen, so a careless whisper never picks a guest inside it
        const wrong = legal(P, s, { env }).filter(b => fmt(b) !== fmt(a) && (b.k !== 'wait' || a.k !== 'wait') && !(b.k === 'whisper' && zone(P, s).has(P.guests[b.i])));
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
    // most envelopes the house could give while the habits it targets still lose
    let safe = P.env;
    for (let e = sol.w; e <= sol.w + 3; e++) {
      const Q = { ...P, env: e };
      if (h.ch >= 2 && solve(Q, start(Q), { noDoors: true })) break;
      if (h.ch >= 3 && doorsFirst(Q).win) break;
      safe = e;
    }
    const nv = [1, 2, 3].map(k => novice(P, k)), nvT = [1, 2, 3].map(k => novice(P, k, 0, ['door', 'wait'])), nv1 = [1, 2, 3].map(k => novice(P, k, 1));
    const wo1 = solve(P, start(P), { noDoors: true, env: P.env + 1 });
    const dec = sol.m;
    console.log(`${h.id.padEnd(5)} ch${h.ch}${h.intro ? ' intro' : ''}${h.optionalDoors ? ' optional-doors' : ''} ${h.name}: ${P.n} guests, ${P.doors.length} doors, env ${h.env}, par ${sol.w} (fewest ${free.w}), decisions ${dec}, plan ${fmtPlan(P, sol.plan)}  [${ms} ms]`);
    console.log(`  spare         most envelopes with whisper-only${h.ch >= 3 ? ' and doors-first' : ''} still losing: ${h.ch >= 2 ? safe : '-'}`);
    console.log(`  whisper-only  ${wo ? `win (${wo.w} env)` : `fails` + (woFree ? ` (needs ${woFree.w} env)` : ` (none up to ${P.env + 4} env)`)}`);
    console.log(`  doors-first   ${df.txt}`);
    console.log(`  habit         ${hb.txt}`);
    const jit = solve(P, start(P), { jit: true });
    console.log(`  just-in-time  ${jit ? `possible (${jit.w} env)` : 'no'}; word-of-mouth ${sol.w === 1 && P.n >= 8 ? 'yes' : 'no'}`);
    console.log(`  novice        survives 1/2/3 wrong taps: ${nv.join('/')}%; door/wait slips only ${nvT.join('/')}%; any, with +1 envelope ${nv1.join('/')}% (whisper-only then ${wo1 ? 'wins' : 'still fails'})`);
    rows.push({ h, sol, wo, df, hb, nv, nvT, nv1, dec, jit: !!jit, wom: sol.w === 1 && P.n >= 8 });
  }
  // § checks
  const chk = (name, ok) => console.log(`  check ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  const ok = rows.filter(r => !r.bad);
  chk('every house solvable', ok.length === rows.length);
  chk('whisper-only fails every ch2+ house (but optionalDoors)', ok.filter(r => r.h.ch >= 2 && !r.h.optionalDoors).every(r => !r.wo));
  chk('optionalDoors houses: whisper-only wins (Open house)', ok.filter(r => r.h.optionalDoors).every(r => r.wo));
  chk('doors-first fails every ch3 house', ok.filter(r => r.h.ch >= 3).every(r => !r.df.win));
  chk('habit fails every ch3 house', ok.filter(r => r.h.ch >= 3).every(r => !r.hb.win));
  chk('solver decisions >= 3 on ch2+ houses (but intro/optionalDoors)', ok.filter(r => r.h.ch >= 2 && !r.h.intro && !r.h.optionalDoors).every(r => r.dec >= 3));
  chk('achievements reachable: word-of-mouth, just-in-time, open-house', ok.some(r => r.wom) && ok.some(r => r.jit) && ok.some(r => r.h.optionalDoors && r.wo));
  chk('novice survives 2 wrong taps >= 50% (median house)', median(ok.map(r => r.nv[1])) >= 50);
  chk('novice survives 3 wrong taps >= 25% (median house)', median(ok.map(r => r.nv[2])) >= 25);
}
// § season: Party Season's envelope economy. Undo is allowed but an undone whisper stays spent,
// so a house costs what the player's solution spends: par when they find the best line, par + 1
// (or + 2) when they settle. Pool starts at SEASON_START, each party adds its par; the season ends
// when the pool can't pay for the house in play. Bots: chance per house of finding par.
function seasonRun(seed, pPar, cap = 40) {
  const r = rng32(seed);
  let pool = 2, parties = 0, ms = 0;
  for (let k = 0; parties < cap; k++) {
    const t0 = Date.now(), h = seasonHouse(seed * 1000 + k * 7919, k); ms = Math.max(ms, Date.now() - t0);
    if (!h) return { parties, ms, fail: true };
    pool += h.par;
    const spend = h.par + (r() < pPar ? 0 : r() < 0.7 ? 1 : 2);
    if (spend > pool) return { parties, ms };
    pool -= spend; parties++;
  }
  return { parties, ms };
}
function season() {
  const runs = +(process.env.SEASONS || 20);
  for (const pPar of [1, 0.9, 0.75, 0.5]) {
    const res = [];
    let ms = 0;
    for (let r = 1; r <= runs; r++) { const x = seasonRun(r, pPar); res.push(x.parties); ms = Math.max(ms, x.ms); }
    res.sort((a, b) => a - b);
    console.log(`season par ${String(pPar * 100).padStart(3)}% parties median ${res[res.length >> 1]} (p10 ${res[Math.floor(res.length * 0.1)]}, p90 ${res[Math.floor(res.length * 0.9)]}, cap 40), 10+ in ${Math.round(100 * res.filter(x => x >= 10).length / runs)}%; slowest house ${ms} ms`);
  }
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
if (args[0] === 'gen') {   // gen [count] [k]: Party Season houses for season position k (default 0..count-1)
  const count = +(args[1] || 10);
  for (let i = 0; i < count; i++) {
    const k = args[2] !== undefined ? +args[2] : i, t0 = Date.now();
    const h = seasonHouse(1000 + i, k);
    if (!h) { console.log(`k ${k}: none (${Date.now() - t0} ms)`); continue; }
    const P = parse(h), sol = solve(P, start(P));
    console.log(`k ${k}: ch${h.ch} tries ${h.tries}, ${Date.now() - t0} ms, ${P.n} guests, ${P.doors.length} doors, env ${h.env} par ${h.par}, decisions ${sol.m}, plan ${fmtPlan(P, sol.plan)}`);
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
RULES.fresh = 1;
if (!process.env.NO_SEASON) season();
