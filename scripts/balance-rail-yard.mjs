// Headless balance bots for Rail Sorting Yard.
//
// Usage: node scripts/balance-rail-yard.mjs [runs=20] [bot,bot,...] [level,level,...]
//   e.g. node scripts/balance-rail-yard.mjs                 (every bot, every level)
//        node scripts/balance-rail-yard.mjs 50 novice,hinted
//        node scripts/balance-rail-yard.mjs 1 solver last-yard
//
// The game is turn-based and deterministic, so unlike the other harnesses this
// one needs no browser: buildDebug() cuts the pure `// § engine` and
// `// § levels` blocks out of games/rail-yard.html and runs them in Node.
// One line per bot per level, then a total line per bot.
//
// Bots (all see only what the player sees: cars, tracks, gravel, gates):
//   solver   breadth-first search over states (the hint's own search): par,
//            states searched, and a check that the stated par matches.
//   max      the solver restricted to full-strength flicks (ignores speed).
//   flicks   the solver with every switch left where the level starts it.
//   switches only sets switches, never flicks (it can't move a car).
//   novice   no planning: picks the flick that looks best one move ahead,
//            guesses its strength (±1-2), undoes what looks worse, and
//            takes a hint after STUCK flicks without progress.
//   hinted   asks for a hint before every flick and aims inside the
//            hinted range, off by one a quarter of the time (then undoes).
// Minutes use SEC_* per action (below) plus SEC_CARD per level card. The
// novice restarts (moves back to 0) when no hint can help any more.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/rail-yard.html');
const SEC_FLICK = 9, SEC_HINT = 4, SEC_UNDO = 2, SEC_CARD = 10;
const STUCK = 4, MAX_MOVES = 80;

function buildDebug() {
  const html = fs.readFileSync(SRC, 'utf8');
  const cut = (a, b) => {
    const i = html.indexOf(a), j = html.indexOf(b);
    if (i < 0 || j < 0 || j < i) throw new Error('game file layout changed: update buildDebug()');
    return html.slice(i, j);
  };
  const src = cut('// § engine', '// § engine-end') + cut('// § levels', '// § levels-end');
  return new Function(src + '; return { buildYard, initialState, flick, solved, successors, makeSolver, stateKey, typ, linked, LEVELS, CHAPTERS, S_MAX, TYPES };')();
}

const E = buildDebug();
const args = process.argv.slice(2);
const runs = +(args[0] || 20);
const bots = (args[1] || 'solver,max,flicks,switches,novice,hinted').split(',');
const only = args[2] ? args[2].split(',') : null;
const levels = E.LEVELS.filter(L => !only || only.includes(L.id));

let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pick = a => a[Math.floor(rnd() * a.length)];
const solve = (Y, s, opts = {}) => E.makeSolver(Y, s, opts).step(Infinity);
const legsOf = (Y, L) => Y.sw.map((_, k) => (L.sw && L.sw[k]) || 0);
const apply = (Y, s, m, v, legs) => E.flick(Y, s, m.c, m.side, v, k => (m.asg[k] !== undefined ? m.asg[k] : legs[k]));

// What a player can read at a glance: how much of the train is already
// built at the buffer, and what's in the way on the departure track.
function looks(Y, s) {
  const ids = Y.goal.ids, seq = Y.goal.seq;
  let k = 0;
  while (k < ids.length && !E.typ(s, ids[k])) k++;
  let good = 0;
  while (good < seq.length && k + good < ids.length && E.typ(s, ids[k + good]) === seq[good] &&
    (good === 0 || E.linked(Y, s, ids[k + good - 1], ids[k + good]))) good++;
  let junk = 0;
  for (let j = k + good; j < ids.length; j++) if (E.typ(s, ids[j])) junk++;
  return good * 10 - junk * 6 + (k === 0 && good ? 2 : 0);
}

// A hint: next move of a shortest solution from s (memoised along the plan).
function hinter(Y) {
  const memo = new Map();
  return (s, legs) => {
    const key = E.stateKey(s);
    if (!memo.has(key)) {
      const r = solve(Y, s, { maxStates: 400000 });
      if (!r.moves || !r.moves.length) return null;
      let t = s;
      for (const m of r.moves) { memo.set(E.stateKey(t), m); const f = apply(Y, t, m, m.lo, legs); if (!f || !f.s) break; t = f.s; }
    }
    return memo.get(key);
  };
}

function playNovice(L, hint) {
  const Y = E.buildYard(L), legs = legsOf(Y, L);
  let s = E.initialState(Y), moves = 0, hints = 0, undos = 0, since = 0, bestLook = looks(Y, s), flicks = 0, restarts = 0;
  const noisy = v => Math.max(1, Math.min(E.S_MAX, v + pick([0, 0, 0, 1, -1, 1, -1, 2, -2])));
  while (!E.solved(Y, s) && moves < MAX_MOVES) {
    let m, v;
    if (since >= STUCK) {
      m = hint(s, legs);
      if (!m) {
        // No way on from here (a gate dropped too soon): restart, as a player would.
        if (++restarts > 3) break;
        s = E.initialState(Y); moves = 0; since = STUCK; bestLook = looks(Y, s); // and leans on hints now
        continue;
      }
      moves += 2; hints++;
      v = Math.max(m.lo, Math.min(m.hi, noisy(Math.round((m.lo + m.hi) / 2))));
      if (rnd() < 0.25) v = noisy(v);
    } else {
      const opts = [];
      E.successors(Y, s, {}, (s2, mv) => opts.push({ s2, mv, look: looks(Y, s2) + rnd() * 3 }));
      opts.sort((a, b) => b.look - a.look);
      m = opts[0].mv;
      v = noisy(m.lo + Math.floor(rnd() * (m.hi - m.lo + 1)));
    }
    const r = apply(Y, s, m, v, legs);
    moves++; flicks++;
    const before = looks(Y, s), after = looks(Y, r.s);
    if (after < before && rnd() < 0.7) { undos++; since++; continue; }
    s = r.s;
    if (after > bestLook && !restarts) { bestLook = after; since = 0; } else since++;
    for (const [k, l] of Object.entries(m.asg)) legs[k] = l;
  }
  return { won: E.solved(Y, s), moves, hints, undos, flicks, restarts };
}

function playHinted(L, hint) {
  const Y = E.buildYard(L), legs = legsOf(Y, L);
  let s = E.initialState(Y), moves = 0, hints = 0, undos = 0, flicks = 0;
  while (!E.solved(Y, s) && moves < MAX_MOVES) {
    const m = hint(s, legs);
    if (!m) break;
    moves += 2; hints++;
    for (const [k, l] of Object.entries(m.asg)) legs[k] = l;
    let v = m.lo + Math.floor(rnd() * (m.hi - m.lo + 1));
    if (rnd() < 0.25) v = Math.max(1, Math.min(E.S_MAX, v + (rnd() < 0.5 ? -1 : 1)));
    const r = apply(Y, s, m, v, legs), want = apply(Y, s, m, m.lo, legs);
    moves++; flicks++;
    if (E.stateKey(r.s) !== E.stateKey(want.s)) { undos++; continue; }
    s = r.s;
  }
  return { won: E.solved(Y, s), moves, hints, undos, flicks };
}

const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const mins = r => (r.flicks * SEC_FLICK + r.hints * SEC_HINT + r.undos * SEC_UNDO + SEC_CARD) / 60;
let problems = 0;
for (const bot of bots) {
  let totMin = 0, totPar = 0, wins = 0;
  for (const L of levels) {
    const Y = E.buildYard(L), s0 = E.initialState(Y);
    const t0 = Date.now();
    let line;
    if (bot === 'solver') {
      const r = solve(Y, s0);
      const par = r.moves ? r.moves.length : null;
      if (par !== L.par) problems++;
      totPar += par || 0;
      line = `par ${par} (stated ${L.par}${par === L.par ? '' : ' MISMATCH'}) states ${r.states} ${Date.now() - t0} ms` +
        (r.moves ? ` | ${r.moves.map(m => `${Y.cells[m.c].t}${Y.cells[m.c].i}${m.side ? '+' : '-'}${m.lo}${m.hi > m.lo ? '-' + m.hi : ''}`).join(' ')}` : '');
    } else if (bot === 'max' || bot === 'flicks') {
      const r = solve(Y, s0, bot === 'max' ? { speeds: [E.S_MAX], maxStates: 600000 } : { fixed: legsOf(Y, L), maxStates: 600000 });
      if (r.moves) wins++;
      line = r.moves ? `WINS in ${r.moves.length} (par ${L.par})` : `cannot win${r.capped ? ' (search capped)' : ''} (${r.states} states)`;
    } else if (bot === 'switches') {
      const w = E.solved(Y, s0);
      if (w) wins++;
      line = w ? 'WINS' : 'cannot win (moves no car)';
    } else {
      const hint = hinter(Y), res = [];
      seed = 1 + E.LEVELS.indexOf(L) * 1000;
      for (let i = 0; i < runs; i++) res.push(bot === 'novice' ? playNovice(L, hint) : playHinted(L, hint));
      const w = res.filter(r => r.won).length;
      const m = med(res.map(mins));
      totMin += m; wins += w / runs;
      line = `win ${Math.round(100 * w / runs)}% moves ${med(res.map(r => r.moves))} (par ${L.par}) hints ${med(res.map(r => r.hints))} undos ${med(res.map(r => r.undos))}` +
        (bot === 'novice' ? ` restarts ${med(res.map(r => r.restarts))}` : '') + ` ~${m.toFixed(1)} min`;
    }
    console.log(`${bot.padEnd(8)} ${String(E.LEVELS.indexOf(L) + 1).padStart(2)} ${L.id.padEnd(16)} ${line}`);
  }
  if (bot === 'solver') console.log(`${bot.padEnd(8)} total par ${totPar}${problems ? `, ${problems} level(s) with a wrong stated par` : ', every stated par verified'}`);
  else if (bot === 'novice' || bot === 'hinted') console.log(`${bot.padEnd(8)} total ~${totMin.toFixed(1)} min to see every level (median per level, summed)`);
  else console.log(`${bot.padEnd(8)} total wins ${wins} of ${levels.length} levels`);
}
if (problems) process.exitCode = 1;
