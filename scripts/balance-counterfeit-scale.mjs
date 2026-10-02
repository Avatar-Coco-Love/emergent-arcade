// Solver check and headless balance bots for Counterfeit Scale.
//
// Usage: node scripts/balance-counterfeit-scale.mjs [runs=300] [bot,bot,...]
//   e.g. node scripts/balance-counterfeit-scale.mjs
//        node scripts/balance-counterfeit-scale.mjs 1000 habit,memory
//
// Runs the game's own rules: buildDebug() cuts the pure block between
// "// § sim" and "// § end sim" out of games/counterfeit-scale.html.
// Output, one line each:
//   check    the solver against the classic results (par must match)
//   cases    par and budget of the 12 campaign cases
//   <bot>    first-try win % on each campaign case (C1..C12), endless win %,
//            then whole runs (3 strikes, one free retry per campaign case):
//            median cases cracked, median case reached, first case seconds,
//            campaign minutes (actions x SEC_*, not wall clock)
//   depth    minutes for the skilled and novice bots to see the campaign
//
// A case is cracked only if the accused coin is right AND the weighings prove it
// (a right guess loses, reason `guess`), as in the game.
//
// Bots (see only what a player could: the pans, the result, their own marks):
//   skilled   solver play, perfect marks.
//   novice    equal halves or thirds, a wrong split 30% of the time, marks a
//             weighing only half the time (forgets the rest), follows the case's
//             counterweight tip half the time, guesses among what it still suspects.
//   habit     thirds of the suspects (the case-1 lesson), perfect marks, no ballast.
//   halves    halves of the suspects, perfect marks, no ballast.
//   memory    solver play but no marks: remembers only the last weighing.
//   marks     memory with marks (should equal skilled).
//   random    one random weighing, then accuses any coin.
//   allWeigh  random weighings for the whole budget, then a guess among suspects.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/counterfeit-scale.html');
// Seconds per action (a considered pace, not reaction time).
const SEC_DRAG = 1.2, SEC_MARK = 0.6, SEC_WEIGH = 2.2, SEC_ACCUSE = 2.5, SEC_CARD = 4;
const SEC_THINK = { skilled: 8, novice: 5 };   // per weighing: planning the split
const ENDLESS_CASES = 30;

function buildDebug() {
  const html = fs.readFileSync(SRC, 'utf8');
  const m = html.match(/\/\/ § sim[\s\S]*?\/\/ § end sim/);
  if (!m) throw new Error('no "// § sim" … "// § end sim" block in games/counterfeit-scale.html');
  return new Function(m[0] + `
    return { makeCase, weighError, weigh, hypsFrom, candidates, solvedBy, isRight, countState, parOf,
      parOfSpec, bestMove, moveCoins, CAMPAIGN, endlessSpec, allHyps };`)();
}
const S = buildDebug();
const args = process.argv.slice(2);
const RUNS = +(args[0] || 300);
const BOTS = (args[1] || 'skilled,novice,habit,halves,memory,marks,random,allWeigh').split(',');

let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// § check: classic results
const base = { fakes: 1, dir: 'heavy', scale: 'balance', cap: 0 };
const CLASSIC = [
  ['9 heavy in 2', { n: 9 }, 2], ['10 heavy in 3', { n: 10 }, 3], ['27 heavy in 3', { n: 27 }, 3], ['28 heavy in 4', { n: 28 }, 4],
  ['12 either in 3', { n: 12, dir: 'either' }, 3], ['13 either in 3', { n: 13, dir: 'either' }, 3], ['14 either in 4', { n: 14, dir: 'either' }, 4],
  ['spring 16 heavy in 4', { n: 16, scale: 'spring' }, 4], ['spring 17 heavy in 5', { n: 17, scale: 'spring' }, 5],
];
const bad = CLASSIC.filter(([, sp, want]) => S.parOfSpec(Object.assign({}, base, sp)) !== want);
console.log(`check    ${CLASSIC.length - bad.length}/${CLASSIC.length} classic pars match` + (bad.length ? ' MISMATCH: ' + bad.map(b => b[0]).join(', ') : ''));
console.log('cases    ' + S.CAMPAIGN.map((sp, i) => { const c = S.makeCase(sp, 1); return `C${i + 1} ${c.n}:${c.par}+${c.slack}`; }).join(' '));

// § bots: each picks the next pans from what it believes, or null to stop weighing.
const MARKS = { 1: { either: ['?', 'H', 'L', 'OK'], heavy: ['?', 'H', 'OK'] }, 2: ['?', 'OK'] };
function markOf(c, cls) { return cls === 'u' ? '?' : cls === 'h' ? 'H' : cls === 'l' ? 'L' : cls === 'c' ? '?' : 'OK'; }
function classes(c, hyps) {
  if (c.fakes === 2) { const m = S.candidates(hyps, c.n); return Array.from(m, x => x ? 'c' : 'g'); }
  return S.countState(c, hyps).cls;
}
function splitSuspects(c, hyps, per, onPan) {
  const cand = shuffle([...S.candidates(hyps, c.n).keys()].filter(i => S.candidates(hyps, c.n)[i]));
  let m = Math.max(1, per(cand.length));
  if (c.cap) m = Math.min(m, c.cap);
  if (c.scale === 'spring') return { L: cand.slice(0, m), R: [] };
  if (2 * m > cand.length) m = Math.floor(cand.length / 2);
  if (!m) return null;
  void onPan;
  return { L: cand.slice(0, m), R: cand.slice(m, 2 * m) };
}
// The case hint's trick (half the time for the novice): a third of the suspects against known-good coins.
function againstGood(c, hyps) {
  const cand = S.candidates(hyps, c.n), sus = shuffle([...Array(c.n).keys()].filter(i => cand[i])), good = [...Array(c.n).keys()].filter(i => !cand[i]);
  let m = Math.min(Math.ceil(sus.length / 3), good.length, c.cap || 99);
  if (!m || c.scale === 'spring') return splitSuspects(c, hyps, n => Math.ceil(n / 3));
  return { L: sus.slice(0, m), R: good.slice(0, m) };
}
function randomSplit(c) {
  const all = shuffle([...Array(c.n).keys()]);
  let m = 1 + Math.floor(rnd() * Math.floor(c.scale === 'spring' ? c.n : c.n / 2));
  if (c.cap) m = Math.min(m, c.cap);
  return c.scale === 'spring' ? { L: all.slice(0, m), R: [] } : { L: all.slice(0, m), R: all.slice(m, 2 * m) };
}
function solverMove(c, hyps, onPan) {
  const st = S.countState(c, hyps), left = c.budget - c.log.length;
  let m = S.bestMove(st, left, c);
  for (let k = left + 1; !m && k <= 9; k++) m = S.bestMove(st, k, c);   // lost already: play on anyway
  return m ? S.moveCoins(st, m, c, onPan) : null;
}
const BOT = {
  skilled: { remember: () => true, move: solverMove },
  marks: { remember: () => true, move: solverMove },
  memory: { remember: () => false, move: solverMove },
  habit: { remember: () => true, move: (c, h) => splitSuspects(c, h, n => Math.ceil(n / 3)) },
  halves: { remember: () => true, move: (c, h) => splitSuspects(c, h, n => Math.floor(n / 2)) },
  novice: {
    remember: () => rnd() < 0.5,
    move: (c, h) => rnd() < 0.3 ? randomSplit(c) : c.dir === 'either' && rnd() < 0.5 ? againstGood(c, h)
      : splitSuspects(c, h, rnd() < 0.5 ? n => Math.floor(n / 2) : n => Math.ceil(n / 3)),
  },
  random: { remember: () => true, move: (c) => c.log.length ? null : randomSplit(c), guessAny: true },
  allWeigh: { remember: () => true, move: (c) => randomSplit(c) },
};

// One case: returns { win, reason, weighs, loads, marks, secs }.
function playCase(name, spec, caseSeed) {
  const bot = BOT[name], c = S.makeCase(spec, caseSeed);
  const onPan = new Uint8Array(c.n);
  let kept = [], loads = 0, marks = 0, shown = Array(c.n).fill('?');
  const belief = () => S.hypsFrom(c, kept);
  while (c.log.length < c.budget) {
    const hs = belief();
    if (S.solvedBy(hs)) break;
    const mv = bot.move(c, hs, onPan);
    if (!mv || S.weighError(c, mv.L, mv.R)) break;
    const want = new Uint8Array(c.n); mv.L.forEach(i => want[i] = 1); mv.R.forEach(i => want[i] = 2);
    for (let i = 0; i < c.n; i++) if (want[i] !== onPan[i]) { loads++; onPan[i] = want[i]; }
    S.weigh(c, mv.L, mv.R);
    const last = c.log[c.log.length - 1];
    if (name === 'memory') kept = [last];
    else if (bot.remember()) {
      kept = kept.concat([last]);
      // taps to bring each coin's mark up to date (marks cycle one way)
      const cyc = c.fakes === 2 ? MARKS[2] : MARKS[1][c.dir];
      classes(c, belief()).forEach((k, i) => {
        const to = markOf(c, k), a = cyc.indexOf(shown[i]), b = cyc.indexOf(to);
        if (a >= 0 && b >= 0 && a !== b) { marks += (b - a + cyc.length) % cyc.length; shown[i] = to; }
      });
    }
  }
  const hs = belief();
  let picks;
  if (bot.guessAny) picks = shuffle([...Array(c.n).keys()]).slice(0, c.fakes);
  else picks = hs[Math.floor(rnd() * hs.length)].f;
  // Cracked only if the weighings prove it (the game's rule): a right guess still loses.
  const proven = S.solvedBy(c.hyps), right = S.isRight(c, picks);
  const win = right && proven;
  const reason = win ? '' : c.log.length >= c.budget && !proven ? 'budget' : right ? 'guess' : 'wrong';
  const secs = SEC_CARD + c.log.length * (SEC_WEIGH + (SEC_THINK[name] || SEC_THINK.skilled)) + loads * SEC_DRAG + marks * SEC_MARK + SEC_ACCUSE;
  return { win, reason, weighs: c.log.length, loads, marks, secs };
}

// A whole run: campaign then endless, 3 strikes, one free retry per campaign case.
function playRun(name, runSeed) {
  let strikes = 0, cracked = 0, idx = 0, secs = 0, campaignSecs = 0, endlessWins = 0, attempt = 0;
  const free = S.CAMPAIGN.map(() => true);
  while (strikes < 3 && idx < S.CAMPAIGN.length + ENDLESS_CASES) {
    const camp = idx < S.CAMPAIGN.length;
    const spec = camp ? S.CAMPAIGN[idx] : S.endlessSpec(idx - S.CAMPAIGN.length, runSeed);
    const r = playCase(name, spec, runSeed * 1000 + idx * 37 + attempt);
    secs += r.secs; attempt++;
    if (r.win) { cracked++; if (!camp) endlessWins++; idx++; attempt = 0; if (idx === S.CAMPAIGN.length) campaignSecs = secs; continue; }
    if (camp && free[idx]) { free[idx] = false; continue; }
    strikes++;
    if (!camp) { idx++; attempt = 0; }
  }
  return { cracked, reached: idx + 1, secs, campaignSecs, endlessWins };
}

const depth = {};
for (const name of BOTS) {
  if (!BOT[name]) { console.log(`${name.padEnd(9)}unknown bot`); continue; }
  const rates = S.CAMPAIGN.map((sp, i) => {
    let w = 0; for (let r = 0; r < RUNS; r++) if (playCase(name, sp, 5000 + r * 13 + i).win) w++; return pct(w, RUNS);
  });
  let ew = 0, en = 0;
  for (let r = 0; r < Math.ceil(RUNS / 10); r++) for (let i = 0; i < ENDLESS_CASES; i++) { en++; if (playCase(name, S.endlessSpec(i, 900 + r), 77 + r * 31 + i).win) ew++; }
  const runs = []; for (let r = 0; r < Math.ceil(RUNS / 3); r++) runs.push(playRun(name, 1 + r));
  const first = median(Array.from({ length: 50 }, (_, r) => playCase(name, S.CAMPAIGN[0], 3 + r).secs));
  const camp = runs.filter(x => x.campaignSecs).map(x => x.campaignSecs / 60);
  depth[name] = { camp: median(camp), whole: median(runs.map(x => x.secs / 60)), n: camp.length, runs: runs.length };
  console.log(`${name.padEnd(9)}C1-12 ${rates.join(' ')} | endless ${pct(ew, en)}% | run: cracked ${median(runs.map(x => x.cracked))}, ` +
    `reach C${median(runs.map(x => x.reached))} | case 1 ${Math.round(first)} s | campaign ${camp.length ? median(camp).toFixed(1) + ' min' : 'never'}`);
}
for (const name of ['skilled', 'novice']) if (depth[name])
  console.log(`depth    ${name}: campaign done in ${depth[name].n}/${depth[name].runs} runs, ${depth[name].camp.toFixed(1)} min; whole run ${depth[name].whole.toFixed(1)} min (endless capped at ${ENDLESS_CASES})`);
