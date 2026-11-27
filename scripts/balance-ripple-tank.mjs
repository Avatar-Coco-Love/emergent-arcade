// Solvability check and headless balance bots for Ripple Tank.
//
// Usage: node scripts/balance-ripple-tank.mjs [runs=200] [bot,bot,...]
//   e.g. node scripts/balance-ripple-tank.mjs
//        node scripts/balance-ripple-tank.mjs 50 skilled,novice
//
// Runs the game's own rules: buildDebug() cuts the pure block between
// "// § sim" and "// § end sim" out of games/ripple-tank.html.
// Output, one line each:
//   planted  plays each pond's planted solution: must solve in par (campaign + 300 endless ponds)
//   ponds    par and ripples granted on the 8 campaign ponds
//   <bot>    first-try win % on each campaign pond (C1..C8), retries over the
//            campaign, then whole runs (campaign retried from its start, endless
//            ends the run): median endless ponds, median ponds solved (the score),
//            p10/p90, median minutes (moves x SEC_*, not wall clock), first pond seconds
//   reach    how often a bot's runs unlock each achievement
//
// Bots (see only what a player could: the field at the lights, live while dragging):
//   skilled   each move is the best single move: any dipper dropped anywhere, or
//             retimed to its best timing (a drag shows the field live, so a
//             player can sweep; a retime streak costs one ripple).
//   novice    drags one dipper (hand first) past ~25 spots and drops at the best
//             it saw, 25% of the time somewhere just okay; retimes a quarter of
//             the time; never plans more than one move.
//   noTune    skilled, but never retimes (is the second verb needed?).
//   tuneOnly  places hand dippers like skilled, then only retimes (is moving needed?).
//   bellHabit drops each dipper beside a bell, then only retimes (the one-line rule).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/ripple-tank.html');
// Seconds per action: a considered drag (look, drag, sweep), a retime step, reading a new pond.
const SEC_DROP = { skilled: 9, novice: 10 }, SEC_TUNE = 1.5, SEC_TUNE_START = 2.5, SEC_POND = 5;
const MAX_RETRIES = 6;     // a bot stuck on a campaign pond gives up after this many retries
const MAX_PONDS = 80;      // a run this long is far past the 10-minute line; stop counting

function buildDebug() {
  const html = fs.readFileSync(SRC, 'utf8');
  const m = html.match(/\/\/ § sim[\s\S]*?\/\/ § end sim/);
  if (!m) throw new Error('no "// § sim" … "// § end sim" block in games/ripple-tank.html');
  return new Function(m[0] + `
    return { G, PHASES, CALM, CREST, CAMPAIGN, makePond, pondFor, grant, targetAmps, targetSwells, solvedBy,
      legalSpot, applyMove, moveCost, okAt, latX, latY, pondTable, mix, BANK_CAP, solve };`)();
}
const S = buildDebug();
const args = process.argv.slice(2);
const RUNS = +(args[0] || 200);
const BOTS = (args[1] || 'skilled,greedy,novice,noTune,tuneOnly,bellHabit').split(',');
const NC = S.CAMPAIGN.length;

let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const median = a => q(a, 0.5);

// Distance from the lines, aiming inside them (what a player reads off the gauges).
function loss(pond, amps) {
  let l = 0;
  amps.forEach((a, t) => { l += pond.targets[t].kind === 'lantern' ? Math.max(0, a - 0.25) : Math.max(0, 1.35 - a); });
  return l;
}
const legalSpots = (pond, dips, who) => pond.pads.filter(i => S.legalSpot(pond, dips, i, who));

// All single moves for dipper d (drops at `spots`, or retimes), scored.
function scoredMoves(pond, dips, opts) {
  const out = [];
  dips.forEach((d, j) => {
    if (opts.who !== undefined && opts.who !== j) return;
    if (opts.drop !== false && !(opts.dropHandOnly && d.at >= 0)) {
      const spots = opts.sample ? sample(legalSpots(pond, dips, j), opts.sample) : legalSpots(pond, dips, j);
      for (const at of spots) {
        if (at === d.at) continue;
        const nd = S.applyMove(pond, dips, { drop: j, at });
        if (nd) out.push({ move: { drop: j, at }, dips: nd, l: loss(pond, S.targetAmps(pond, nd)) });
      }
    }
    if (opts.tune !== false && d.at >= 0) for (let s = 1; s < S.PHASES; s++) {
      const nd = S.applyMove(pond, dips, { tune: j, steps: s });
      out.push({ move: { tune: j, steps: s }, dips: nd, l: loss(pond, S.targetAmps(pond, nd)) });
    }
  });
  return out;
}
function sample(list, m) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, m); }
const best = list => list.reduce((b, x) => !b || x.l < b.l - 1e-9 || (Math.abs(x.l - b.l) < 1e-9 && rnd() < 0.5) ? x : b, null);

// The bots: given pond and dippers, return the next move (or null to give up).
// Drops of the solver's plan whose pad is free now, then its retimes.
function planStep(pond, dips, plan) {
  for (let d = 0; d < dips.length; d++) if (plan.at[d] !== dips[d].at && S.legalSpot(pond, dips, plan.at[d], d)) return { drop: d, at: plan.at[d] };
  for (let d = 0; d < dips.length; d++) if (plan.at[d] !== dips[d].at) { // a swap: park on a spare pad
    const spare = legalSpots(pond, dips, d).find(i => !plan.at.includes(i));
    if (spare !== undefined) return { drop: d, at: spare };
  }
  let g0 = 0, bestOff = 99;
  for (let g = 0; g < S.PHASES; g++) { const off = dips.filter((x, d) => x.at >= 0 && (plan.ph[d] + g) % S.PHASES !== x.ph).length; if (off < bestOff) { bestOff = off; g0 = g; } }
  for (let d = 0; d < dips.length; d++) if (dips[d].at >= 0 && (plan.ph[d] + g0) % S.PHASES !== dips[d].ph) return { tune: d, steps: (plan.ph[d] + g0 - dips[d].ph + S.PHASES) % S.PHASES };
  return null;
}
// Two-ply: the move whose best follow-up leaves the least to fix (a solving move wins at once).
function look2(pond, dips, opts) {
  const first = scoredMoves(pond, dips, opts);
  let bestM = null, bestV = Infinity;
  for (const m of first) {
    if (m.l === 0 && S.solvedBy(pond, m.dips)) return m;
    const next = scoredMoves(pond, m.dips, opts);
    const v = Math.min(m.l, ...next.map(x => x.l)) + 0.001 * m.l + 0.0001 * rnd();
    if (v < bestV) { bestV = v; bestM = m; }
  }
  return bestM;
}
const BOT = {
  planner(pond, dips) {
    const plan = S.solve(pond, dips);
    if (!plan) return null;
    const move = planStep(pond, dips, plan);
    return move && { move, dips: S.applyMove(pond, dips, move) };
  },
  skilled(pond, dips) { return look2(pond, dips, {}); },
  greedy(pond, dips) { return best(scoredMoves(pond, dips, {})); },
  novice(pond, dips) {
    const hand = dips.findIndex(d => d.at < 0);
    const inWater = dips.map((d, j) => j).filter(j => dips[j].at >= 0);
    if (hand < 0 && rnd() < 0.25) {
      const j = inWater[Math.floor(rnd() * inWater.length)];
      return best(scoredMoves(pond, dips, { who: j, drop: false }));
    }
    const j = hand >= 0 ? hand : inWater[Math.floor(rnd() * inWater.length)];
    const list = scoredMoves(pond, dips, { who: j, tune: false });
    if (!list.length) return null;
    if (rnd() < 0.25) { list.sort((a, b) => a.l - b.l); return list[Math.floor(rnd() * Math.min(6, list.length))]; }
    return best(list);
  },
  noTune(pond, dips) { return look2(pond, dips, { tune: false }); },
  tuneOnly(pond, dips) {
    if (dips.some(d => d.at < 0)) return best(scoredMoves(pond, dips, { tune: false, dropHandOnly: true }));
    return look2(pond, dips, { drop: false });
  },
  bellHabit(pond, dips) {
    const j = dips.findIndex((d, k) => !d.habit);
    if (j >= 0) {
      const bells = pond.targets.filter(t => t.kind === 'bell').concat(pond.targets.some(t => t.kind === 'bell') ? [] : pond.targets);
      const b = bells[j % bells.length];
      const spots = legalSpots(pond, dips, j).sort((u, v) => Math.hypot(S.latX(u) - b.x, S.latY(u) - b.y) - Math.hypot(S.latX(v) - b.x, S.latY(v) - b.y));
      const at = spots.find(i => i !== dips[j].at);
      const nd = S.applyMove(pond, dips, { drop: j, at });
      nd.forEach((d, k) => { d.habit = dips[k].habit || k === j; });
      return { move: { drop: j, at }, dips: nd };
    }
    const m = best(scoredMoves(pond, dips, { drop: false }));
    if (m) m.dips.forEach(d => { d.habit = true; });
    return m;
  },
};

// Play one pond with `bank` ripples on arrival (after the grant). Returns { won, bank, moves, secs, ... }.
function playPond(pond, bank, bot) {
  let dips = pond.start.map(d => ({ at: d.at, ph: d.ph })), last = null, moves = 0, tunes = 0, secs = SEC_POND;
  let calmByCancel = false;
  for (let step = 0; step < 60; step++) {
    if (S.solvedBy(pond, dips)) break;
    if (bank <= 0) break;
    const m = BOT[bot](pond, dips);
    if (!m) break;
    const cost = S.moveCost(m.move, last);
    bank -= cost; moves += cost;
    if (m.move.tune !== undefined) { tunes++; secs += (cost ? SEC_TUNE_START : 0) + SEC_TUNE * Math.min(m.move.steps, S.PHASES - m.move.steps); }
    else secs += SEC_DROP[bot] || SEC_DROP.skilled;
    dips = m.dips; last = m.move;
    if (!calmByCancel && dips.filter(d => d.at >= 0).length >= 2) {
      const amps = S.targetAmps(pond, dips);
      calmByCancel = pond.targets.some((t, i) => t.kind === 'lantern' && Math.round(amps[i] * 10) <= S.CALM);
    }
  }
  return { won: S.solvedBy(pond, dips), bank, moves, tunes, secs, calmByCancel };
}

function planted() {
  let bad = 0, n = 0, ways = [];
  const check = pond => {
    n++; ways.push(pond.ways);
    let dips = pond.start.map(d => ({ at: d.at, ph: d.ph })), used = 0, last = null;
    for (let step = 0; step < 12 && !S.solvedBy(pond, dips); step++) {
      const move = planStep(pond, dips, pond.sol);
      if (!move) break;
      used += S.moveCost(move, last); last = move;
      dips = S.applyMove(pond, dips, move);
    }
    if (!S.solvedBy(pond, dips) || used > pond.par) bad++;
  };
  for (let i = 0; i < NC; i++) check(S.pondFor(1, i, NC));
  for (let r = 0; r < 20; r++) for (let k = 0; k < 10; k++) check(S.pondFor(1000 + r, NC + k * 3, NC));
  console.log(`planted  ${n - bad}/${n} ponds solved at par by the solver's plan${bad ? '  FAIL' : ''}; solving layouts median ${median(ways)} (p10 ${q(ways, 0.1)})`);
}

function pondsLine() {
  let bank = 0;
  const parts = [];
  for (let i = 0; i < NC; i++) {
    const p = S.pondFor(1, i, NC);
    bank = S.grant(bank - 0, p);
    parts.push(`C${i + 1} n${p.n} t${p.targets.length} par ${p.par} +${p.extra}`);
  }
  console.log(`ponds    ${parts.join(' · ')}`);
}

function runBot(bot) {
  const first = Array(NC).fill(0);
  const retries = [], endless = [], total = [], mins = [], firstSecs = [], reach = { calm: 0, par: 0, trio: 0, keeper: 0, deep: 0 };
  const parPonds = [];
  for (let r = 0; r < RUNS; r++) {
    seed = 7 + r * 101;
    const runSeed = S.mix(12345, r);
    let bank = 0, solved = 0, secs = 0, retry = 0, idx = 0, at = { calm: 0, par: 0, trio: 0 };
    while (idx < MAX_PONDS) {
      const pond = S.pondFor(runSeed, idx, NC);
      const arrive = S.grant(bank, pond);
      let res, tries = 0;
      for (;;) {
        res = playPond(pond, arrive, bot);
        secs += res.secs;
        if (idx === 0 && tries === 0) firstSecs.push(res.secs);
        if (res.calmByCancel) at.calm = 1;
        if (res.won || idx >= NC || tries >= MAX_RETRIES) break;
        tries++; retry++;
      }
      if (idx < NC && tries === 0 && res.won) first[idx]++;
      if (!res.won) break;
      if (idx >= 2 && res.moves <= pond.par) at.par = 1;
      if (pond.n === 3) at.trio = 1;
      solved++; bank = res.bank; idx++;
    }
    retries.push(retry); total.push(solved); endless.push(Math.max(0, solved - NC)); mins.push(secs / 60);
    reach.calm += at.calm; reach.par += at.par; reach.trio += at.trio; reach.keeper += solved >= NC ? 1 : 0; reach.deep += solved >= 20 ? 1 : 0;
  }
  const c = first.map((w, i) => `${pct(w, RUNS)}`).join('/');
  console.log(`${bot.padEnd(9)} C1-8 ${c}%  retries ${median(retries)}  endless ${median(endless)}  ponds ${median(total)} (p10 ${q(total, 0.1)}, p90 ${q(total, 0.9)})  ${median(mins).toFixed(1)} min (p90 ${q(mins, 0.9).toFixed(1)})  pond 1 ${Math.round(median(firstSecs))} s`);
  return reach;
}

planted();
pondsLine();
const reaches = {};
for (const b of BOTS) reaches[b] = runBot(b);
const rs = ['skilled', 'novice'].filter(b => reaches[b]);
if (rs.length) console.log('reach    ' + rs.map(b => `${b}: still-water ${pct(reaches[b].calm, RUNS)}% clean-ripples ${pct(reaches[b].par, RUNS)}% trio ${pct(reaches[b].trio, RUNS)}% pond-keeper ${pct(reaches[b].keeper, RUNS)}% deep-water ${pct(reaches[b].deep, RUNS)}%`).join(' · '));
