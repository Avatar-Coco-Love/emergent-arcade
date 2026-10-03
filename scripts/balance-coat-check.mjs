// Go/no-go harness and headless balance bots for Coat Check (pre-build).
//
// Usage: node scripts/balance-coat-check.mjs [runs=300] [bot,bot,...]
//   e.g. node scripts/balance-coat-check.mjs
//        node scripts/balance-coat-check.mjs 600 encode,scatter
//
// There is no game file yet (brief: docs/ideas/coat-check.md). The rules live
// here between "// § sim" and "// § end sim" so the game can copy the block;
// once games/coat-check.html exists, cut that block from it with buildDebug()
// like scripts/balance-counterfeit-scale.mjs does.
//
// Output, one line each:
//   stream   generator health: fallback tickets, retention spread, budgets
//   <bot>    first-try win % on each campaign shift (S1..S12, standalone) and on
//            Endless shifts 1-10; whole runs (one free retry per campaign shift,
//            Endless until a lost shift): median coats returned, shift reached,
//            Endless shifts cleared, wrong doors and peeks per shift, purity,
//            campaign cleared %, minutes to reach shift 8 at 4 s/action, and the
//            whole run at 3/4/6 s per action
//   check    the brief's go/no-go targets, PASS/FAIL each
//
// Memory model (the brief's guess, shared by every bot): a bot keeps up to k
// coats in mind (most recently hung, peeked or seen behind a wrong door), each
// with its hook (or its row, after that row was reshuffled) and arrival order.
// A coat it has forgotten is searched for with its scheme alone: a door whose
// row/column the scheme assigns to the ticket's feature ranks first, a door the
// scheme rules out ranks last. Spilled coats (cell taken, row full) therefore
// mislead until the bot opens their door. A friend (⇄) ticket doesn't name the
// guest's own coat, so a peek settles it only if the bot remembers that coat.
//
// Bots:
//   cap3..cap7  good scheme (row = colour, column = pattern, look-alikes to the
//               nearest free hook in the row, overflow to the emptiest row),
//               memory k = 3..7, peeks whenever more than one door ties.
//   encode      = cap4.   scatter: random hooks, k = 4, same fetch and peeks.
//   novice      k = 3, hangs in reading order, peeks while unsure, mis-taps 8%.
//   habit       shift-1 habit: colour row, left to right, k = 4, peeks only after
//               a wrong door on the current ticket.
//   peekOnly    random hooks, no memory, peeks until it finds the coat.
//   noPeek      cap7's scheme, never peeks.
//   perfect     unlimited memory, peeks only when a reshuffle hides a position.
//   random      random hooks, random doors.
const args = process.argv.slice(2);
const RUNS = +(args[0] || 300);
const ALL = ['cap3', 'cap4', 'cap5', 'cap6', 'cap7', 'encode', 'scatter', 'novice', 'habit', 'peekOnly', 'noPeek', 'perfect', 'random'];
const BOTS = args[1] ? args[1].split(',') : ALL;
const ENDLESS_CAP = 40;   // Endless shifts per run at most (perfect never loses)

// § sim (pure rules: no DOM, no clock; the game copies this block)
const NV = 4;   // values per feature: colour, pattern, pin
// reshuffle: counter events (a hang or a guest served) between reshuffles; friendP: chance an arrival brings a friend right behind
const TUNE = { reshuffle: [5, 7], friendP: 0.35 };
function rng32(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sp = (name, rows, cols, guests, load, rules) => ({ name, rows, cols, guests, load, rules, slack: 2 });
const CAMPAIGN = [
  sp('Colour tickets', 2, 3, 4, 3, ['colour']),
  sp('Any feature', 3, 3, 6, 4, []),
  sp('Look-alikes', 3, 4, 8, 6, ['look']),
  sp('Coach party', 3, 4, 10, 7, ['coach']),
  sp('Reshuffle', 3, 4, 10, 7, ['reshuffle']),
  sp('Friends', 3, 4, 10, 7, ['friends']),
  sp('Two-feature', 3, 4, 10, 8, ['pair']),
  sp('Regulars', 3, 4, 10, 8, ['regulars']),
  sp('Look + coach', 3, 4, 10, 8, ['look', 'coach']),
  sp('Reshuffle + friends', 3, 4, 10, 8, ['reshuffle', 'friends']),
  sp('Pairs + regulars', 3, 4, 10, 8, ['pair', 'regulars']),
  sp('All rules', 3, 4, 12, 9, ['look', 'coach', 'reshuffle', 'friends', 'pair', 'regulars']),
];
const MIX = ['look', 'coach', 'reshuffle', 'friends', 'pair', 'regulars'];
function endlessSpec(e, seed) {
  const r = rng32(seed * 7919 + e * 104729 + 1), pool = MIX.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const load = Math.min(12, 8 + (e >> 1)), big = load >= 10;
  return { name: 'Endless ' + (e + 1), rows: big ? 4 : 3, cols: 4, guests: load + 6, load, rules: pool.slice(0, r() < 0.3 ? 3 : 2), slack: 1, endless: true };
}
const has = (st, rule) => st.spec.rules.includes(rule);
const predOK = (coat, pred) => pred.every(([f, v]) => coat.f[f] === v);
// carry: [{ f, hook }] regulars left on the hooks by the previous shift; bonus: carried peeks
function newShift(spec, seed, carry = [], bonus = 0) {
  const r = rng32(seed), n = spec.rows * spec.cols, two = spec.rules.includes('colour');
  const st = { spec, r, rr: rng32(seed ^ 0x5bd1e995), hooks: Array(n).fill(null), feats: two ? 2 : 3, tfeats: two ? [0] : [0, 1, 2],
    arrived: 0, events: 0, served: 0, complaints: 0, budget: spec.slack + bonus, peeks: 0, reshuffles: 0, tickets: 0, fallbacks: 0,
    nextId: 1, pending: null, done: false, lost: false, maxLoad: 0, reshuffled: -1, friendNext: 0, stays: new Set(), ages: [], hung: [] };
  if (spec.rules.includes('regulars')) { const k = 1 + (r() < 0.5); while (st.stays.size < k) st.stays.add(1 + Math.floor(r() * (spec.guests - 2))); }
  st.coach = spec.rules.includes('coach') ? { start: Math.floor(r() * 2), size: spec.cols + 2, colour: Math.floor(r() * NV) } : null;
  st.nextRes = spec.rules.includes('reshuffle') ? TUNE.reshuffle[0] + Math.floor(r() * (TUNE.reshuffle[1] - TUNE.reshuffle[0] + 1)) : Infinity;
  carry.forEach((c, i) => { st.hooks[c.hook] = { id: st.nextId++, f: c.f.slice(), arr: -100 - i, born: -10, stay: false, carried: true }; });
  return st;
}
const hungCoats = st => st.hooks.filter(Boolean);
function uniqueFeats(c, hung, feats) { return feats.filter(f => !hung.some(o => o !== c && o.f[f] === c.f[f])); }
function uniquePairs(c, hung, feats) {
  const out = [];
  for (let i = 0; i < feats.length; i++) for (let j = i + 1; j < feats.length; j++) {
    const a = feats[i], b = feats[j];
    if (!hung.some(o => o !== c && o.f[a] === c.f[a] && o.f[b] === c.f[b])) out.push([a, b]);
  }
  return out;
}
function eligibleCount(hung, feats) { return hung.filter(c => uniqueFeats(c, hung, feats).length).length; }
function makeCoat(st) {
  const r = st.r, hung = hungCoats(st), nf = st.feats, idx = st.arrived;
  const rand = () => [Math.floor(r() * NV), Math.floor(r() * NV), nf === 3 ? Math.floor(r() * NV) : -1];
  const dup = f => hung.some(c => c.f[0] === f[0] && c.f[1] === f[1] && c.f[2] === f[2]);
  const best = fix => {   // 6 tries, keep the coat that leaves the most guests able to leave
    let pick = null, score = -1;
    for (let t = 0; t < 6; t++) {
      const f = rand(); if (fix) fix(f); if (dup(f)) continue;
      const s = eligibleCount(hung.concat([{ f }]), st.tfeats);
      if (s > score) { score = s; pick = f; }
    }
    return pick || (() => { let f; do { f = rand(); if (fix) fix(f); } while (dup(f) && hung.length < 40); return f; })();
  };
  const ch = st.coach;
  if (ch && idx >= ch.start && idx < ch.start + ch.size) return best(f => { f[0] = ch.colour; });
  if (has(st, 'look') && hung.length && r() < 0.5) {   // a look-alike: shares two features, differs in the third
    const src = hung[Math.floor(r() * hung.length)], vary = r() < 0.7 ? 2 : Math.floor(r() * 2);
    const f = src.f.slice(), opts = [0, 1, 2, 3].filter(v => v !== src.f[vary]);
    const fresh = opts.filter(v => !hung.some(o => o.f[vary] === v));
    f[vary] = (fresh.length ? fresh : opts)[Math.floor(r() * (fresh.length ? fresh : opts).length)];
    if (!dup(f)) return f;
  }
  return best(null);
}
// The ticket for each guest who could leave now: [{ coat, w, pick() }]
function departures(st) {
  const hung = hungCoats(st), out = [];
  for (const c of hung) {
    if (c.stay) continue;
    const singles = uniqueFeats(c, hung, st.tfeats).map(f => [[f, c.f[f]]]);
    const pairs = has(st, 'pair') ? uniquePairs(c, hung, st.tfeats).filter(([a, b]) => !singles.some(s => s[0][0] === a || s[0][0] === b)).map(([a, b]) => [[a, c.f[a]], [b, c.f[b]]]) : [];
    const A = c.friendOf && hung.find(o => o.id === c.friendOf);
    const friend = A ? uniqueFeats(A, hung, st.tfeats).map(f => [[f, A.f[f]]]) : [];
    if (!singles.length && !pairs.length && !friend.length) continue;
    const waitsForB = hung.some(o => o.friendOf === c.id);   // A leaves after its friend B
    out.push({ coat: c, w: waitsForB ? 0.05 : st.events - c.born + 1, pick: () => {
      const r = st.r;
      if (friend.length && r() < 0.7) return { pred: friend[Math.floor(r() * friend.length)], friend: A.id };
      if (pairs.length && (!singles.length || r() < 0.5)) return { pred: pairs[Math.floor(r() * pairs.length)] };
      if (!singles.length) return { pred: friend[0], friend: A.id };
      const twin = hung.find(o => o !== c && [0, 1, 2].filter(f => o.f[f] === c.f[f]).length === 2);
      if (twin) { const d = [0, 1, 2].find(f => twin.f[f] !== c.f[f]), s = singles.find(x => x[0][0] === d); if (s) return { pred: s }; }
      return { pred: singles[Math.floor(r() * singles.length)] };
    } });
  }
  return out;
}
// The next prompt at the counter: { type: 'hang', coat } or { type: 'ticket', coat, pred, friend }; null when the shift is over.
function next(st) {
  if (st.pending || st.done || st.lost) return st.pending;
  const r = st.r, hung = hungCoats(st), load = hung.length, free = st.hooks.length - load;
  const canArrive = st.arrived < st.spec.guests && free > 0;
  const arriveP = load >= st.spec.load ? 0 : st.served === 0 ? 1 : 0.6;
  let ev = null;
  if (canArrive && r() < arriveP) ev = 'arrive';
  else {
    const deps = departures(st);
    if (deps.length) {
      let x = r() * deps.reduce((s, d) => s + d.w, 0), d = deps[0];
      for (const o of deps) { x -= o.w; if (x <= 0) { d = o; break; } }
      const t = d.pick(); st.tickets++;
      st.pending = { type: 'ticket', coat: d.coat, pred: t.pred, friend: t.friend || 0 };
      return st.pending;
    }
    if (canArrive) ev = 'arrive';
    else if (hung.some(c => !c.stay)) {   // nobody can be named by the shift's rules: name a pair (or the whole coat)
      const c = hung.filter(x => !x.stay).sort((a, b) => a.born - b.born)[0];
      const p = uniquePairs(c, hung, [0, 1, 2].slice(0, st.feats))[0];
      st.tickets++; st.fallbacks++;
      st.pending = { type: 'ticket', coat: c, pred: p ? p.map(f => [f, c.f[f]]) : [0, 1, 2].slice(0, st.feats).map(f => [f, c.f[f]]), friend: 0 };
      return st.pending;
    } else { st.done = true; return null; }
  }
  const f = makeCoat(st), coat = { id: st.nextId++, f, arr: st.arrived, born: st.events, stay: st.stays.has(st.arrived), friendOf: 0 };
  if (st.friendNext) { coat.friendOf = st.friendNext; st.friendNext = 0; }
  else if (has(st, 'friends') && st.arrived < st.spec.guests - 1 && !coat.stay && r() < TUNE.friendP) st.friendNext = coat.id;
  st.arrived++;
  st.pending = { type: 'hang', coat };
  return st.pending;
}
function afterEvent(st) {
  st.pending = null; st.events++; st.reshuffled = -1;
  st.maxLoad = Math.max(st.maxLoad, hungCoats(st).length);
  if (st.events >= st.nextRes) {
    const R = st.spec.rows, C = st.spec.cols;
    st.nextRes += TUNE.reshuffle[0] + Math.floor(st.r() * (TUNE.reshuffle[1] - TUNE.reshuffle[0] + 1));
    const occ = row => [...Array(C).keys()].map(c => row * C + c).filter(h => st.hooks[h]);
    let rows = [...Array(R).keys()].filter(w => occ(w).length >= 2);
    const most = Math.max(0, ...rows.map(w => occ(w).length));
    rows = rows.filter(w => occ(w).length === most);
    if (rows.length) {
      const row = rows[Math.floor(st.rr() * rows.length)], hs = occ(row), coats = hs.map(h => st.hooks[h]);
      let perm;
      do { perm = coats.slice(); for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(st.rr() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } }
      while (perm.every((c, i) => c === coats[i]));
      hs.forEach((h, i) => { st.hooks[h] = perm[i]; });
      st.budget += hs.length - 1; st.reshuffles++; st.reshuffled = row;
    }
  }
  if (st.arrived >= st.spec.guests && !hungCoats(st).some(c => !c.stay)) st.done = true;
}
function hang(st, h) {
  const p = st.pending;
  if (!p || p.type !== 'hang' || st.hooks[h]) return false;
  st.hooks[h] = p.coat; st.hung.push([Math.floor(h / st.spec.cols), p.coat.f]);
  afterEvent(st);
  return true;
}
function fetch(st, h) {   // { ok } or { ok: false, coat } (the door shows what it holds)
  const p = st.pending, c = st.hooks[h];
  if (!p || p.type !== 'ticket' || !c) return null;
  if (c === p.coat) { st.ages.push(st.events - c.born); st.hooks[h] = null; st.served++; afterEvent(st); return { ok: true }; }
  if (++st.complaints >= 3) st.lost = true;
  return { ok: false, coat: c };
}
function peek(st, h) { if (st.peeks >= st.budget || !st.hooks[h]) return null; st.peeks++; return st.hooks[h]; }
// Share of coats hung in a row that match that row's most common value of its best feature (0-100).
function purity(st) {
  const rows = new Map();
  for (const [w, f] of st.hung) { if (!rows.has(w)) rows.set(w, []); rows.get(w).push(f); }
  let good = 0, all = 0;
  for (const fs of rows.values()) {
    all += fs.length;
    good += Math.max(...[0, 1, 2].map(k => { const n = [0, 0, 0, 0]; fs.forEach(f => { if (f[k] >= 0) n[f[k]]++; }); return Math.max(...n); }));
  }
  return all ? Math.round(100 * good / all) : 100;
}
// § end sim

// Lever sweeps (not game rules): COAT_VARIANT="slack=1,load=+1,guests=+2,res=4-6,friend=0.2" node scripts/balance-coat-check.mjs
for (const kv of (process.env.COAT_VARIANT || '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  if (k === 'slack') CAMPAIGN.forEach(c => { c.slack = +v; });
  else if (k === 'load') CAMPAIGN.forEach((c, i) => { if (i) c.load = Math.min(c.rows * c.cols - 1, c.load + +v); });
  else if (k === 'guests') CAMPAIGN.forEach((c, i) => { if (i) c.guests += +v; });
  else if (k === 'res') TUNE.reshuffle = v.split('-').map(Number);
  else if (k === 'friend') TUNE.friendP = +v;
  else throw new Error('unknown lever ' + k);
}
if (process.env.COAT_VARIANT) console.log('variant  ' + process.env.COAT_VARIANT);

// § bots
const CFG = {
  perfect: { k: Infinity, place: 'seq', peek: 'tier' },
  random: { k: 0, place: 'random', peek: 'never', randomDoor: true },
  peekOnly: { k: 0, place: 'random', peek: 'tier' },
  scatter: { k: 4, place: 'random', peek: 'tier' },
  encode: { k: 4, place: 'scheme', peek: 'tier' },
  novice: { k: 3, place: 'seq', peek: 'tier', slip: 0.08 },
  habit: { k: 4, place: 'habit', peek: 'stuck' },
  noPeek: { k: 7, place: 'scheme', peek: 'never' },
};
for (let k = 3; k <= 7; k++) CFG['cap' + k] = { k, place: 'scheme', peek: 'tier' };

function makeBot(name, seed) {
  const cfg = CFG[name], r = rng32(seed);
  const pickOf = a => a[Math.floor(r() * a.length)];
  let mem, tick, colOK, R, C;
  const rowVals = (h, n) => new Set([0, 1, 2, 3].filter(v => v % n === h));
  const hintScore = (h, pred) => {
    let s = 0;
    for (const [f, v] of pred) {
      if (f === 0 && (cfg.place === 'scheme' || cfg.place === 'habit')) s += v % R === Math.floor(h / C) ? 1 : -1;
      if (f === 1 && cfg.place === 'scheme' && colOK[h]) s += v % C === h % C ? 1 : -1;
    }
    return s;
  };
  const learn = (coat, h) => {
    mem.set(coat.id, { coat, hooks: new Set([h]), t: ++tick });
    while (mem.size > cfg.k) { let old = null; for (const e of mem.values()) if (!old || e.t < old.t) old = e; mem.delete(old.coat.id); }
  };
  const refine = st => {   // drop freed hooks; a hook known to hold one coat can't hold another
    for (const [id, e] of mem) { e.hooks = new Set([...e.hooks].filter(h => st.hooks[h])); if (!e.hooks.size) mem.delete(id); }
    for (let pass = 0; pass < 3; pass++) {
      const exact = new Map();
      for (const e of mem.values()) if (e.hooks.size === 1) exact.set([...e.hooks][0], e.coat.id);
      for (const e of mem.values()) if (e.hooks.size > 1) e.hooks = new Set([...e.hooks].filter(h => !exact.has(h)));
    }
  };
  const place = (st, coat) => {
    const free = h => !st.hooks[h], all = [...st.hooks.keys()].filter(free);
    if (cfg.place === 'seq') return all[0];
    if (cfg.place === 'random') return pickOf(all);
    const r0 = coat.f[0] % R, inRow = w => [...Array(C).keys()].map(c => w * C + c).filter(free);
    const c0 = cfg.place === 'scheme' ? coat.f[1] % C : 0;
    const near = hs => hs.sort((a, b) => Math.abs(a % C - c0) - Math.abs(b % C - c0) || a - b)[0];
    if (inRow(r0).length) return near(inRow(r0));
    const rows = [...Array(R).keys()].sort((a, b) => inRow(b).length - inRow(a).length || a - b);
    return near(inRow(rows[0]));
  };
  // Doors worth opening for this ticket, best tier only.
  const candidates = (st, t, tried) => {
    refine(st);
    const occ = [...st.hooks.keys()].filter(h => st.hooks[h] && !tried.has(h));
    if (cfg.randomDoor) return { cs: occ, id: 0 };
    const es = [...mem.values()], excl = new Set();
    let bonus = -1;
    if (t.friend) {
      const A = es.find(e => predOK(e.coat, t.pred));
      if (A) {
        const B = es.find(e => e.coat.arr === A.coat.arr + 1);
        if (B) { const hs = [...B.hooks].filter(h => !tried.has(h)); if (hs.length) return { cs: hs, id: B.coat.id }; }
        for (const e of es) if (e.hooks.size === 1 && e !== B) excl.add([...e.hooks][0]);
        if (cfg.place === 'seq' && A.hooks.size === 1) { const a = [...A.hooks][0]; bonus = occ.find(h => h > a && !excl.has(h)) ?? -1; }
      }
    } else {
      const m = es.find(e => predOK(e.coat, t.pred));
      if (m) { const hs = [...m.hooks].filter(h => !tried.has(h)); if (hs.length) return { cs: hs, id: m.coat.id }; }
      const groups = new Map();
      for (const e of es) {
        if (e.hooks.size === 1) excl.add([...e.hooks][0]);
        else { const key = [...e.hooks].sort((a, b) => a - b).join(','); groups.set(key, (groups.get(key) || 0) + 1); }
      }
      for (const [key, n] of groups) { const hs = key.split(',').map(Number); if (n >= hs.length) hs.forEach(h => excl.add(h)); }
    }
    let pool = occ.filter(h => !excl.has(h));
    if (!pool.length) pool = occ;
    const sc = pool.map(h => (t.friend ? 0 : hintScore(h, t.pred)) + (h === bonus ? 1 : 0)), top = Math.max(...sc);
    return { cs: pool.filter((h, i) => sc[i] === top), id: 0 };
  };
  return {
    name,
    start(st) {
      R = st.spec.rows; C = st.spec.cols; mem = new Map(); tick = 0; colOK = st.hooks.map(() => true);
      st.hooks.forEach((c, h) => { if (c) learn(c, h); });   // the recap showed the regulars
    },
    place,
    hung(st, coat, h) { learn(coat, h); colOK[h] = true; },
    reshuffled(st, row) {
      const hs = [...Array(C).keys()].map(c => row * C + c), occ = hs.filter(h => st.hooks[h]);
      hs.forEach(h => { colOK[h] = false; });
      for (const e of mem.values()) if ([...e.hooks].some(h => hs.includes(h))) e.hooks = new Set(occ);
    },
    // Serve one ticket; returns { actions, wrong, peeks }.
    serve(st, t) {
      const tried = new Set();
      let actions = 0, wrong = 0, peeks = 0;
      while (!st.lost) {
        let { cs, id } = candidates(st, t, tried);
        if (!cs.length) cs = [...st.hooks.keys()].filter(h => st.hooks[h]);
        // a peek settles it if the bot can tell the coat on sight: the ticket names it, or memory knows the friend's coat
        const isIt = c => t.friend ? c.id === id : predOK(c, t.pred);
        const mayPeek = (!t.friend || id) && cs.length > 1 && st.peeks < st.budget &&
          (cfg.peek === 'tier' || (cfg.peek === 'stuck' && wrong > 0));
        if (mayPeek) {
          const h = pickOf(cs), c = peek(st, h); actions++; peeks++;
          learn(c, h); tried.add(h);
          if (isIt(c)) { tried.delete(h); const res = fetch(st, h); actions++; if (res.ok) { mem.delete(c.id); return { actions, wrong, peeks }; } }
          continue;
        }
        let h = pickOf(cs);
        if (cfg.slip && r() < cfg.slip) { const o = [...st.hooks.keys()].filter(x => st.hooks[x] && x !== h); if (o.length) h = pickOf(o); }
        const res = fetch(st, h); actions++;
        if (res.ok) { mem.delete(t.coat.id); return { actions, wrong, peeks }; }
        wrong++; tried.add(h); learn(res.coat, h);
      }
      return { actions, wrong, peeks };
    },
  };
}

// One shift. carry: [{ f, hook? }] (a carry without hook is placed by the bot, for standalone shifts).
function playShift(name, spec, seed, carry = [], bonus = 0, pace = 4) {
  const bot = makeBot(name, seed * 31 + 7);
  const placed = carry.filter(c => c.hook != null);
  const st = newShift(spec, seed, placed, bonus);
  bot.start(st);
  for (const c of carry.filter(c => c.hook == null)) {   // regulars from a previous shift this harness didn't play
    const coat = { id: st.nextId++, f: c.f.slice(), arr: -50 - st.nextId, born: -10, stay: false, carried: true };
    st.pending = { type: 'hang', coat }; const h = bot.place(st, coat); st.hooks[h] = coat; st.pending = null; bot.hung(st, coat, h);
  }
  let actions = 0, wrong = 0, peeks = 0, clock = 0;
  for (let ev = next(st); ev; ev = next(st)) {
    if (ev.type === 'hang') { const h = bot.place(st, ev.coat); hang(st, h); bot.hung(st, ev.coat, h); actions++; clock += pace; }
    else {
      const res = bot.serve(st, ev); actions += res.actions; wrong += res.wrong; peeks += res.peeks; clock += pace * res.actions;
      if (st.lost) break;
    }
    if (st.reshuffled >= 0) bot.reshuffled(st, st.reshuffled);
  }
  const win = st.done && !st.lost;
  const carryOut = win ? st.hooks.map((c, h) => c ? { f: c.f, hook: h } : null).filter(Boolean) : [];
  return { win, coats: st.served, actions, wrong, peeks, budget: st.budget, peeksLeft: st.budget - st.peeks, clock,
    reshuffles: st.reshuffles, tickets: st.tickets, fallbacks: st.fallbacks, ages: st.ages, purity: purity(st), maxLoad: st.maxLoad,
    carry: carryOut, carryPeeks: win && spec.rules.includes('regulars') ? Math.min(2, st.budget - st.peeks) : 0 };
}
// Standalone shift i: if shift i-1 had regulars, 1-2 of them are on the hooks (placed by the bot).
function standaloneCarry(spec, prev, seed) {
  if (!prev || !prev.rules.includes('regulars')) return [];
  const r = rng32(seed + 99), n = 1 + (r() < 0.5), out = [];
  while (out.length < n) { const f = [0, 1, 2].map(() => Math.floor(r() * NV)); if (!out.some(o => o.f.join() === f.join())) out.push({ f }); }
  return out;
}

// A whole run: campaign (one free retry per shift, a second loss ends the run), then Endless until a lost shift.
function playRun(name, runSeed, pace = 4) {
  let coats = 0, actions = 0, wrong = 0, peeks = 0, shifts = 0, pur = [], carry = [], bonus = 0, toS8 = null, campaign = false, endless = 0, reached = 0;
  const one = (spec, seed) => {
    const res = playShift(name, spec, seed, carry, bonus, pace);
    coats += res.coats; actions += res.actions; wrong += res.wrong; peeks += res.peeks; shifts++; pur.push(res.purity);
    return res;
  };
  for (let i = 0; i < CAMPAIGN.length; i++) {
    if (i === 7) toS8 = actions;
    reached = i + 1;
    let res = one(CAMPAIGN[i], runSeed * 1000 + i * 2);
    if (!res.win) res = one(CAMPAIGN[i], runSeed * 1000 + i * 2 + 1);   // free retry, new coats
    if (!res.win) return { coats, actions, wrong, peeks, shifts, pur, toS8, campaign, endless, reached };
    carry = res.carry; bonus = res.carryPeeks;
  }
  campaign = true;
  const before = actions;
  for (let e = 0; e < ENDLESS_CAP; e++) {
    reached = CAMPAIGN.length + e + 1;
    const res = one(endlessSpec(e, runSeed), runSeed * 1000 + 500 + e);
    if (!res.win) break;
    endless++; carry = res.carry; bonus = res.carryPeeks;
  }
  return { coats, actions, wrong, peeks, shifts, pur, toS8, campaign, endless, reached, endActions: actions - before };
}

const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

// § stream: generator health, seen through the perfect bot
{
  let tickets = 0, fall = 0, ages = [], bad = 0, budgets = [];
  for (let i = 0; i < CAMPAIGN.length; i++) for (let s = 0; s < 100; s++) {
    const res = playShift('perfect', CAMPAIGN[i], 7000 + s * 17 + i, standaloneCarry(CAMPAIGN[i], CAMPAIGN[i - 1], s));
    tickets += res.tickets; fall += res.fallbacks; ages.push(...res.ages);
    if (CAMPAIGN[i].rules.includes('reshuffle')) budgets.push(res.budget);
    if (!res.win || res.wrong) bad++;
  }
  ages.sort((a, b) => a - b);
  const q = p => ages[Math.floor(p * (ages.length - 1))];
  console.log(`stream   fallback tickets ${(100 * fall / tickets).toFixed(1)}% | retention (events hung) p10 ${q(0.1)}, median ${q(0.5)}, p90 ${q(0.9)}, max ${q(1)} | ` +
    `reshuffle-shift budget median ${median(budgets)} | perfect: ${bad} of ${CAMPAIGN.length * 100} shifts lost or with a wrong door`);
}

// § bots: one line each
const OUT = {};
for (const name of BOTS) {
  if (!CFG[name]) { console.log(`${name.padEnd(9)}unknown bot`); continue; }
  const rates = CAMPAIGN.map((spec, i) => {
    let w = 0;
    for (let s = 0; s < RUNS; s++) if (playShift(name, spec, 5000 + s * 13 + i, standaloneCarry(spec, CAMPAIGN[i - 1], s)).win) w++;
    return pct(w, RUNS);
  });
  let ew = 0, en = 0;
  for (let s = 0; s < Math.ceil(RUNS / 5); s++) for (let e = 0; e < 10; e++) { en++; if (playShift(name, endlessSpec(e, 300 + s), 9000 + s * 11 + e).win) ew++; }
  const runs = [];
  for (let s = 0; s < Math.ceil(RUNS / 3); s++) runs.push(playRun(name, 1 + s));
  const toS8 = runs.filter(x => x.toS8 != null).map(x => x.toS8);
  const camp = runs.filter(x => x.campaign);
  OUT[name] = { rates, runs };
  const min = s => (median(runs.map(x => x.actions)) * s / 60).toFixed(0);
  console.log(`${name.padEnd(9)}S1-12 ${rates.join(' ')} | E1-10 ${pct(ew, en)}% | run: coats ${median(runs.map(x => x.coats))}, reach S${median(runs.map(x => x.reached))}` +
    `, endless +${median(camp.map(x => x.endless))} | per shift wrong ${mean(runs.map(x => x.wrong / x.shifts)).toFixed(1)} peeks ${mean(runs.map(x => x.peeks / x.shifts)).toFixed(1)}` +
    `, purity ${median(runs.flatMap(x => x.pur))} | campaign ${pct(camp.length, runs.length)}% | to S8 ${toS8.length ? (median(toS8) * 4 / 60).toFixed(1) + ' min' : 'never'} (${pct(toS8.length, runs.length)}%)` +
    ` | run ${min(3)}/${min(4)}/${min(6)} min`);
}

// § checks: the brief's go/no-go targets
const ok = (b, s) => console.log(`check    ${b ? 'PASS' : 'FAIL'} ${s}`);
const reach = n => median(OUT[n].runs.map(x => x.reached));
const coats = n => median(OUT[n].runs.map(x => x.coats));
{   // nothing reads the clock: the same runs at 1, 4 and 10 s per action
  const sig = pace => Array.from({ length: 8 }, (_, s) => { const x = playRun('cap4', 50 + s, pace); return [x.coats, x.actions, x.wrong, x.peeks, x.reached].join(); }).join('|');
  ok(sig(1) === sig(4) && sig(4) === sig(10), 'clock: identical runs at 1, 4 and 10 s per action');
}
if (OUT.encode && OUT.scatter) {
  const e = coats('encode'), s = coats('scatter');
  ok(e >= 2 * Math.max(1, s), `encode vs scatter (k = 4): median coats ${e} vs ${s} (${s ? (e / s).toFixed(1) : '∞'}x, target 2x)`);
  ok(reach('scatter') <= 3, `scatter dies by rule 3: median shift reached S${reach('scatter')}`);
}
if (OUT.noPeek) {
  const rs = CAMPAIGN.map((sp, i) => sp.rules.includes('reshuffle') ? i : -1).filter(i => i >= 0);
  const np = rs.map(i => OUT.noPeek.rates[i]), c7 = OUT.cap7 ? rs.map(i => OUT.cap7.rates[i]) : null;
  const other = OUT.noPeek.rates.filter((_, i) => !rs.includes(i));
  ok(np.every(x => x <= 25), `noPeek fails reshuffle shifts (${rs.map(i => 'S' + (i + 1)).join(', ')}): ${np.join('/')}%` +
    (c7 ? ` vs cap7 ${c7.join('/')}%` : '') + `; other shifts median ${median(other)}% (target ≤ 25)`);
}
if (OUT.habit) {
  const r = OUT.habit.rates;
  ok(r[0] >= 90, `habit clears S1: ${r[0]}%`);
  for (let i = 1; i <= 7; i++) ok(r[i] <= 40, `habit on rule ${i + 1} (${CAMPAIGN[i].name}): ${r[i]}% (target ≤ 40)`);
}
if (OUT.peekOnly) ok(reach('peekOnly') <= 3, `peekOnly dies by shift 3: median reached S${reach('peekOnly')}`);
if (OUT.random) ok(reach('random') <= 2, `random dies in shift 2: median reached S${reach('random')}`);
if (OUT.perfect) ok(OUT.perfect.rates.every(x => x === 100) && OUT.perfect.runs.every(x => x.wrong === 0), `perfect clears every shift with no wrong door: ${OUT.perfect.rates.join(' ')}`);
if (OUT.cap3) ok(OUT.cap3.rates.slice(0, 3).every(x => x >= 70) && reach('cap3') <= 6, `cap3 clears S1-3 (${OUT.cap3.rates.slice(0, 3).join('/')}%) and dies around rule 4-5 (reached S${reach('cap3')})`);
if (OUT.cap4) { const c = pct(OUT.cap4.runs.filter(x => x.campaign).length, OUT.cap4.runs.length); ok(c >= 30 && c <= 70, `cap4 clears the campaign about half the time: ${c}%`); }
if (OUT.cap7) {
  const runs = OUT.cap7.runs, c = runs.filter(x => x.campaign), ends = c.filter(x => x.endless < ENDLESS_CAP).length;
  const m = median(c.map(x => x.endless));
  ok(pct(c.length, runs.length) >= 80 && m >= 6 && m <= 12 && ends === c.length, `cap7 clears the campaign (${pct(c.length, runs.length)}%), Endless median +${m} shifts (target 6-12), runs that end ${ends}/${c.length}`);
}
if (OUT.novice) {
  const r = OUT.novice.rates, a = [];
  for (let s = 0; s < 100; s++) a.push(playShift('novice', CAMPAIGN[0], 6000 + s).actions);
  ok(r[0] >= 90 && median(a) * 3 <= 40 && r[1] >= 50, `novice wins S1 (${r[0]}%, ${median(a) * 3} s at 3 s/action) and usually S2 (${r[1]}%)`);
}
for (const n of ['novice', 'cap4']) if (OUT[n]) {
  const t = OUT[n].runs.filter(x => x.toS8 != null).map(x => x.toS8 * 4 / 60);
  ok(t.length && median(t) >= 10, `depth: ${n} needs 10+ min at 4 s/action to reach shift 8: ${t.length ? median(t).toFixed(1) : '-'} min (${t.length}/${OUT[n].runs.length} runs get there)`);
}
if (OUT.cap5) {
  const e = OUT.cap5.runs.filter(x => x.campaign), m = median(e.map(x => x.endActions * 4 / 60));
  ok(e.length && m >= 5 && e.every(x => x.endless < ENDLESS_CAP), `cap5 Endless adds 5+ min and ends: ${e.length}/${OUT.cap5.runs.length} runs reach it, median +${median(e.map(x => x.endless))} shifts, ${m.toFixed(1)} min at 4 s/action`);
}
