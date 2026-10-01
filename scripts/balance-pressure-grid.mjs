// Solver and bots for Pressure Grid's levels (v8+). One line per level.
//
// Usage: node scripts/balance-pressure-grid.mjs [--level N] [--full] [--count]
//          [--line] [--zone R] [--runs N] [--budget S]
//        node scripts/balance-pressure-grid.mjs --map "row,row,..." [--par N] [--full]
//
// Runs the game's own rules: the block between "// § sim" and "// § end sim"
// in games/pressure-grid.html (no browser needed). A fast copy of play() is
// used for search; it is checked against the game's play() on random move
// sequences first, so the two can't drift apart.
//
// Default: one line per level (≤ 120 chars):
//   par      the minimum number of moves (A*, admissible bound below; "upper
//            bound" when the proof runs over half the budget),
//            and whether it matches `par` in LEVELS ("ok"/"MISMATCH")
//   pump     the minimum with pumps only ("none" = siphon is required)
//   habit    the rule a player takes from level 1: burst the targets one at a
//            time in reading order, each by its shortest sequence
//   ms       time of the par search
// --full adds a second line per level:
//   greedy   novice: pump the fullest target not yet burst (a random move
//            near a target when none can be pumped); solved % within 40 moves
//   random   novice: random moves near targets; solved % within 40 moves
//   ledger   pressure on the solver's line: pumped in, and lost to bursts,
//            pours and leaks (every passive step must lose something)
//   line     the solver's solution (+c3 = pump c3, c3>d3 = pour c3 into d3;
//            columns a.., rows 1.. from the top). --line prints only this.
// --count  optimal move sequences, and how many distinct first moves start
//          one (slow on level 5)
// --map    evaluates an ad-hoc map (letters as in LEVELS, rows separated by
//          commas) without editing any file; --par N checks it against N
// --budget a level's searches stop after S seconds (default 120) and print
//          "over budget" instead of hanging. The par proof gets half of it;
//          past that, a faster search gives par as an upper bound (flagged).
//
// Search moves only touch cells within `zone` steps (default 1) of a target
// that hasn't burst yet: pressure from further away has to be carried in at a
// loss. A step out of a valve costs nothing (pipes carry pressure to their
// end). `--zone 2` gives the same par on levels 1-4 (slower).
//
// As a module: import { solve, habit, levelDefs, parseMap, sim } from this file.
// solve(def) returns { L, par, line, text, expanded, ms, overBudget, proven } (line =
// [[i, j], ...], j < 0 = pump i, else pour i -> j); importing runs nothing.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/pressure-grid.html');
const MAIN = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
const args = MAIN ? process.argv.slice(2) : [];
const opt = (name, d) => { const i = args.indexOf(name); return i < 0 ? d : args[i + 1]; };
const COUNT = args.includes('--count');
const FULL = args.includes('--full');
const ONLY = opt('--level', null);
const MAP = opt('--map', null);
const MAP_PAR = opt('--par', null);
const RADIUS = +opt('--zone', 1);
const RUNS = +opt('--runs', 200);
const BUDGET_MS = 1000 * +opt('--budget', 120);

const html = fs.readFileSync(SRC, 'utf8');
const block = html.match(/\/\/ § sim[\s\S]*?\/\/ § end sim/);
if (!block) throw new Error('no "// § sim" … "// § end sim" block in games/pressure-grid.html');
const S = new Function(block[0] + `
  return { LEVELS, parseLevel, startState, solved, play, pourOk, stars, OPEN, SEALED, WALL,
    C: { THRESHOLD, PUMP_ADD, BLAST, SAFE_MAX, SIPHON_LOSS, LEAKY_DRIP } };`)();
const { THRESHOLD: T, PUMP_ADD, BLAST, SAFE_MAX, SIPHON_LOSS, LEAKY_DRIP } = S.C;
export const sim = S;
export const levelDefs = S.LEVELS;

// "row,row,..." -> a level def (rows must be the same width).
export function parseMap(rows, par = null) {
  const map = rows.split(',').map(r => r.trim()).filter(Boolean);
  if (!map.length || map.some(r => r.length !== map[0].length)) throw new Error('--map: rows must be non-empty and the same width');
  if (/[^.o#sS^>v<*lL]/.test(map.join(''))) throw new Error('--map: letters are . o # s S ^ > v < * l L');
  if (!/[oSL]/.test(map.join(''))) throw new Error('--map: needs at least one target (o, S or L)');
  return { id: 'map', name: 'map', par: par === null ? null : +par, hint: '', map };
}

// § fast engine: a state is a Uint8Array, cell = pressure + 32 if it's a burst target.
function makeFast(L) {
  const openNb = L.nbrs.map(a => a.filter(j => L.kind[j] === S.OPEN));
  const leakyCells = []; for (let i = 0; i < L.n; i++) if (L.leaky[i]) leakyCells.push(i);
  const cand = new Int32Array(4096), wave = new Int32Array(4096), touched = new Int32Array(4096), mark = new Uint8Array(L.n);
  // Returns { q, burst, targets, leaks, lost }; j < 0 = pump i, else pour i -> j.
  function play(s, i, j) {
    const q = s.slice();
    let nc = 0, burst = 0, targets = 0, leaks = 0, lost = 0;
    if (j < 0) { q[i] += PUMP_ADD; cand[nc++] = i; }
    else { const v = q[i] & 31; q[j] += v - SIPHON_LOSS; q[i] &= 32; cand[nc++] = j; lost += SIPHON_LOSS; }
    let nt = 0; touched[nt++] = cand[0];
    for (let g = 0; g < 60 && nc; g++) {
      let nw = 0;
      for (let k = 0; k < nc; k++) { const c = cand[k]; if (!mark[c] && (q[c] & 31) >= T) { mark[c] = 1; wave[nw++] = c; } }
      for (let k = 0; k < nw; k++) mark[wave[k]] = 0;
      if (!nw) break;
      for (let k = 0; k < nw; k++) {
        const c = wave[k]; burst++;
        lost += (q[c] & 31) - (L.vent[c] ? 0 : BLAST * openNb[c].length);
        if (L.target[c]) { targets++; q[c] = 32; } else q[c] &= 32;
      }
      nc = 0;
      for (let k = 0; k < nw; k++) if (!L.vent[wave[k]]) for (const o of openNb[wave[k]]) { q[o] += BLAST; cand[nc++] = o; touched[nt++] = o; }
      for (let k = 0; k < nw; k++) if (L.vent[wave[k]]) for (const o of openNb[wave[k]]) { lost += q[o] & 31; q[o] &= 32; }
    }
    for (let k = 0; k < nt; k++) { const c = touched[k]; if (mark[c]) continue; mark[c] = 1; const v = q[c] & 31; if (!L.leaky[c] && v > SAFE_MAX && v < T) { q[c]--; leaks++; lost++; } }
    for (let k = 0; k < nt; k++) mark[touched[k]] = 0;
    for (const c of leakyCells) { const d = Math.min(LEAKY_DRIP, q[c] & 31); if (d) { q[c] -= d; leaks += d; lost += d; } }
    return { q, burst, targets, leaks, lost };
  }
  const solved = q => L.targets.every(t => q[t] & 32);
  const st0 = S.startState(L), start = () => Uint8Array.from(st0.p);
  return { play, solved, start };
}

function checkEngine(L, F) {
  let s = 7;
  const rnd = k => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) % k; };
  for (let run = 0; run < 300; run++) {
    let st = S.startState(L), q = F.start();
    for (let step = 0; step < 40; step++) {
      const i = rnd(L.n), nb = L.nbrs[i];
      const j = rnd(3) || !nb.length ? -1 : nb[rnd(nb.length)];
      const r = S.play(L, st, j < 0 ? { pump: i } : { from: i, to: j });
      if (!r) continue;
      st = r.st; q = F.play(q, i, j).q;
      for (let c = 0; c < L.n; c++) if (st.p[c] + 32 * st.hit[c] !== q[c]) throw new Error(`fast engine differs from the game on ${L.def.id}`);
    }
  }
}

// § search
const key = q => Buffer.from(q.buffer, q.byteOffset, q.length).toString('latin1');

// Admissible bound on moves left. Pumps are the only source of pressure
// (+PUMP_ADD each). Every target not yet burst must burst, destroying at least
// T - BLAST × (open neighbours); every pour destroys SIPHON_LOSS, and a sealed
// target needs ceil(deficit / (SAFE_MAX - SIPHON_LOSS)) pours of its own
// (between moves no cell holds more than SAFE_MAX).
// sound = false drops the "at least 1" floor: faster, but the first goal found
// can be one move past the optimum (an upper bound only).
function bound(L, sound = true) {
  const destroy = L.targets.map(t => Math.max(0, T - BLAST * L.nbrs[t].filter(j => L.kind[j] === S.OPEN).length));
  return q => {
    let H = 0, D = 0, K = 0, open = false;
    for (let i = 0; i < L.n; i++) H += q[i] & 31;
    L.targets.forEach((t, k) => {
      if (q[t] & 32) return;
      open = true;
      D += destroy[k];
      if (L.kind[t] === S.SEALED) K += Math.ceil((T - (q[t] & 31)) / (SAFE_MAX - SIPHON_LOSS));
    });
    if (!open) return 0;
    // at least 1 while unsolved: then a goal is never generated from an h = 0 node one move past the optimum
    const h = K + Math.max(0, Math.ceil((D + K * SIPHON_LOSS - H) / PUMP_ADD));
    return sound ? Math.max(1, h) : h;
  };
}

// A step out of a valve costs nothing: a pipe's feeder counts as next to its end.
function zones(L, radius = RADIUS) {
  return L.targets.map(t => {
    const dist = new Map([[t, 0]]), queue = [t];
    while (queue.length) {
      const i = queue.shift(), d = dist.get(i);
      for (const j of L.nbrs[i]) {
        const nd = d + (L.valve[i] >= 0 ? 0 : 1);
        if (nd <= radius && !(dist.get(j) <= nd)) { dist.set(j, nd); if (L.valve[i] >= 0) queue.unshift(j); else queue.push(j); }
      }
    }
    return [...dist.keys()];
  });
}
function moves(L, Z, q, siphon) {
  const z = new Uint8Array(L.n), out = [];
  L.targets.forEach((t, k) => { if (!(q[t] & 32)) for (const i of Z[k]) z[i] = 1; });
  for (let i = 0; i < L.n; i++) {
    if (!z[i] || L.kind[i] === S.WALL) continue;
    if (L.kind[i] === S.OPEN) out.push([i, -1]);
    if (siphon && (q[i] & 31) > SIPHON_LOSS) for (const j of L.nbrs[i]) if (z[j] && S.pourOk(L, i, j)) out.push([i, j]);
  }
  return out;
}

// A* from q; returns the shortest line of moves, or null.
// Stops (overBudget) at the deadline (a Date.now() value).
// eager: return the first goal generated (with an unsound h: an upper bound, fast).
function astar(L, F, h, Z, start, siphon = true, deadline = Infinity, maxExpanded = 5e6, eager = false) {
  const best = new Map([[key(start), 0]]), buckets = [];
  (buckets[h(start)] ||= []).push([start, 0, null]);
  let expanded = 0;
  for (let f = 0; f < buckets.length; f++) {
    const b = buckets[f];
    while (b && b.length) {
      const [q, g, line, goal] = b.pop();
      if (goal) {
        const out = []; for (let x = line; x; x = x.prev) out.unshift([x.i, x.j]);
        return { line: out, expanded };
      }
      if (best.get(key(q)) < g) continue;
      if (++expanded > maxExpanded) return { line: null, expanded };
      if ((expanded & 1023) === 0 && Date.now() > deadline) return { line: null, expanded, overBudget: true };
      for (const [i, j] of moves(L, Z, q, siphon)) {
        const r = F.play(q, i, j).q;
        const nl = { i, j, prev: line };
        // a goal is returned when its bucket comes up, not when generated:
        // a cheaper one may still come from this bucket
        if (F.solved(r)) {
          if (eager) { const out = []; for (let x = nl; x; x = x.prev) out.unshift([x.i, x.j]); return { line: out, expanded }; }
          (buckets[g + 1] ||= []).push([r, g + 1, nl, true]); continue;
        }
        const k = key(r), old = best.get(k);
        if (old !== undefined && old <= g + 1) continue;
        best.set(k, g + 1);
        (buckets[g + 1 + h(r)] ||= []).push([r, g + 1, nl]);
      }
    }
  }
  return { line: null, expanded };
}

// Optimal sequences of exactly `par` moves, and distinct first moves among them.
function countSolutions(L, F, h, Z, par) {
  const memo = new Map();
  function count(q, g) {
    const k = key(q) + g;
    if (memo.has(k)) return memo.get(k);
    let c = 0;
    for (const [i, j] of moves(L, Z, q, true)) {
      const r = F.play(q, i, j).q;
      if (F.solved(r)) { if (g + 1 === par) c++; }
      else if (g + 1 < par && g + 1 + h(r) <= par) c += count(r, g + 1);
    }
    memo.set(k, c);
    return c;
  }
  const start = F.start();
  let total = 0, firsts = 0;
  for (const [i, j] of moves(L, Z, start, true)) {
    const r = F.play(start, i, j).q;
    const c = F.solved(r) ? (par === 1 ? 1 : 0) : count(r, 1);
    total += c; if (c) firsts++;
  }
  return { total, firsts };
}

// § bots
export function habit(L, deadline = Infinity) {
  let q = makeFast(L).start(), total = 0;
  for (const t of L.targets) {
    if (q[t] & 32) continue;
    const sub = { ...L, targets: [t] };
    const Fs = makeFast(sub), r = astar(sub, Fs, bound(sub), zones(sub), q, true, deadline);
    if (!r.line) return null;
    for (const [i, j] of r.line) q = Fs.play(q, i, j).q;
    total += r.line.length;
  }
  return total;
}

function novice(L, F, Z, mode, seed) {
  let s = seed;
  const rnd = k => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) % k; };
  let q = F.start();
  for (let n = 1; n <= 40; n++) {
    let mv = null;
    if (mode === 'greedy') {
      const open = L.targets.filter(t => !(q[t] & 32) && L.kind[t] === S.OPEN).sort((a, b) => (q[b] & 31) - (q[a] & 31));
      if (open.length) mv = [open[0], -1];
    }
    if (!mv) { const ms = moves(L, Z, q, true); if (!ms.length) return null; mv = ms[rnd(ms.length)]; }
    q = F.play(q, mv[0], mv[1]).q;
    if (F.solved(q)) return n;
  }
  return null;
}

function ledger(L, F, line) {
  let q = F.start(), pumped = 0, lostBurst = 0, lostPour = 0, leaks = 0, bursts = 0;
  for (const [i, j] of line) {
    const r = F.play(q, i, j);
    if (j < 0) pumped += PUMP_ADD; else lostPour += SIPHON_LOSS;
    lostBurst += r.lost - (j < 0 ? 0 : SIPHON_LOSS) - r.leaks; leaks += r.leaks; bursts += r.burst;
    q = r.q;
  }
  let left = 0; for (let c = 0; c < L.n; c++) left += q[c] & 31;
  return `in ${pumped}, bursts ${bursts} lost ${lostBurst}, pours lost ${lostPour}, leaks ${leaks}, left ${left}`;
}

const cellName = (L, k) => `${String.fromCharCode(97 + k % L.w)}${(k / L.w | 0) + 1}`;
const fmt = (L, [i, j]) => j < 0 ? `+${cellName(L, i)}` : `${cellName(L, i)}>${cellName(L, j)}`;

// § api: par and the solution line for a level def (from LEVELS or parseMap).
export function solve(def, { budget = BUDGET_MS, zone = RADIUS } = {}) {
  const L = S.parseLevel(def), F = makeFast(L), h = bound(L);
  const Z = zones(L, zone);
  checkEngine(L, F);
  const t0 = Date.now();
  // A proof gets half the budget; past that, the fast search gives an upper bound (proven: false).
  let r = astar(L, F, h, Z, F.start(), true, t0 + budget / 2), proven = true;
  if (r.overBudget) { r = astar(L, F, bound(L, false), Z, F.start(), true, t0 + budget, 5e6, true); proven = false; }
  const line = r.line || null;
  return { L, F, h, Z, par: line ? line.length : null, line, text: line ? line.map(m => fmt(L, m)).join(' ') : '',
    expanded: r.expanded, ms: Date.now() - t0, overBudget: !!r.overBudget, proven };
}

// § cli
function report(def, label) {
  const t0 = Date.now(), deadline = t0 + BUDGET_MS;
  const sol = solve(def);
  const { L, F, h, Z, par } = sol;
  const name = `${label} ${def.id.padEnd(9)}`;
  if (sol.overBudget) { console.log(`${name} par over budget (${BUDGET_MS / 1000} s, ${sol.expanded} expanded)`); return false; }
  const parNote = (def.par == null ? '' : par === def.par ? ' ok' : ` MISMATCH (says ${def.par})`) + (sol.proven ? '' : ' (upper bound: proof over budget)');
  const needsSiphon = L.targets.some(t => L.kind[t] === S.SEALED);
  let pump = 'none';
  if (!needsSiphon) { const r = astar(L, F, h, Z, F.start(), false, deadline); pump = r.overBudget ? 'over budget' : r.line?.length ?? 'none'; }
  const hb = habit(L, deadline);
  const line = `${name} par ${par ?? 'none'}${parNote} | pump ${pump} | habit ${hb ?? '-'} | ${sol.ms} ms`;
  console.log(line.length > 120 ? line.slice(0, 117) + '...' : line);
  if (args.includes('--line') && !FULL && par) console.log(`   line ${sol.text}`);
  if (COUNT && par) { const c = countSolutions(L, F, h, Z, par); console.log(`   seqs ${c.total}, ${c.firsts} first moves`); }
  if (FULL) {
    const nov = mode => {
      const ns = []; for (let r = 0; r < RUNS; r++) { const n = novice(L, F, Z, mode, 1000 + r); if (n) ns.push(n); }
      ns.sort((a, b) => a - b);
      return `${Math.round(100 * ns.length / RUNS)}%` + (ns.length ? ` med ${ns[ns.length >> 1]}` : '');
    };
    console.log(`   greedy ${nov('greedy')} | random ${nov('random')} | ${sol.expanded} expanded` + (par ? ` | ${ledger(L, F, sol.line)}` : ''));
    if (par) console.log(`   line ${sol.text}`);
  }
  return par !== null && (def.par == null || par === def.par);
}

if (MAIN) {
  if (4 * BLAST >= T) console.log(`WARNING: 4 × BLAST (${4 * BLAST}) >= THRESHOLD (${T}): interior bursts don't lose pressure`);
  let ok = true;
  if (MAP) {
    let def; try { def = parseMap(MAP, MAP_PAR); } catch (e) { console.log(e.message); process.exit(1); }
    ok = report(def, 'map');
  }
  else S.LEVELS.forEach((def, idx) => { if (ONLY === null || +ONLY === idx + 1) ok = report(def, `L${idx + 1}`) && ok; });
  if (!ok) process.exitCode = 1;
}
