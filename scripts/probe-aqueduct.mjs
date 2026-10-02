// Quick probes for the Aqueduct prototype (prototypes/aqueduct.html).
//   node scripts/probe-aqueduct.mjs float          bead dropped 55-60 px under the surface: does it rise? (one line per case)
//   node scripts/probe-aqueduct.mjs trace '[[-120,0],[-180,1]]'   replay a plan [[angle,valve bits],...] (1 s each), print every 0.25 s
//   LEVEL=i picks the level (default 1); EXIT=x,y overrides its exit.
//   node scripts/probe-aqueduct.mjs fillmap [-180,...,180]  each cup's reading 3 s after turning to each angle (PRE=a: hold a first)
//   node scripts/probe-aqueduct.mjs publish-copy OUT.html          write the file without <html>/<head>/<body> for the Artifact tool
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
const SRC = process.env.SRC || path.join(path.dirname(fileURLToPath(import.meta.url)), '../prototypes/aqueduct.html');   // SRC: try a scratch copy
const [mode, arg] = process.argv.slice(2);
if (mode === 'publish-copy') {
  let s = fs.readFileSync(SRC, 'utf8');
  s = s.replace('<!doctype html>\n<html lang="en">\n<head>\n', '').replace('<meta charset="utf-8">\n', '')
    .replace('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n', '')
    .replace('</head>\n<body>\n', '').replace('</body>\n</html>\n', '')
    .replace('html,body{margin:0;height:100%;background:#0b1320;', 'html,body{margin:0;height:100%;background:#0b1320;color-scheme:dark;');
  fs.writeFileSync(arg, s); console.log('wrote', arg); process.exit(0);
}
let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  const root = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(pathToFileURL(path.join(root, 'playwright/index.mjs'))));
}
const b = await chromium.launch(); const p = await b.newPage();
if (process.env.EXIT) { const [x, y] = process.env.EXIT.split(',').map(Number); await p.addInitScript(e => { window.__EXIT = e; }, { x, y }); }   // same override as balance-aqueduct.mjs
await p.goto(pathToFileURL(SRC).href + '?nostart');
await p.evaluate(l => window.__dbg.load(l), process.env.LEVEL === undefined ? 1 : +process.env.LEVEL);   // LEVEL=i, default 1 (one cup)
if (mode === 'float') {
  const rows = await p.evaluate(() => { const D = window.__dbg, out = [];
    for (const ang of [0, 30, 60, 90, 120]) for (const [bx, by] of [[-100, 140], [-100, 100]]) {
      D.reset(1000); D.setAngle(ang); for (let k = 0; k < 120; k++) D.step(1 / 60);
      const a = ang * Math.PI / 180, gx = Math.sin(a), gy = Math.cos(a);
      D.bead.x = bx; D.bead.y = by; D.bead.vx = D.bead.vy = 0;
      const depth = () => { let top = 1e9; for (let i = 0; i < D.N; i++) { const h = D.px[i] * gx + D.py[i] * gy;
        if (Math.hypot(D.px[i] - D.bead.x, D.py[i] - D.bead.y) < 60 && h < top) top = h; } return D.bead.x * gx + D.bead.y * gy - top; };
      const d0 = depth(), t = [];
      for (let k = 1; k <= 180; k++) { D.step(1 / 60); if (k % 60 === 0) t.push(depth().toFixed(0)); }
      out.push(`ang ${ang} start (${bx},${by}): ${d0.toFixed(0)} -> ${t.join(', ')} px below surface at 1s,2s,3s`); }
    return out; });
  console.log(rows.join('\n'));
} else if (mode === 'trace') {
  const plan = JSON.parse(arg);
  const rows = await p.evaluate(plan => { const D = window.__dbg; D.reset(1000); const out = [];
    for (let t = 0; t < plan.length * 60 && D.state === 'playing'; t++) {
      if (t % 60 === 0) { D.setTarget(plan[t / 60][0]); const b = plan[t / 60][1]; D.cups.forEach((c, k) => D.setValve(b >> k & 1, k)); }
      D.step(1 / 60);
      if (t % 15 === 14) out.push(`${(t / 60).toFixed(2)}s ang ${((D.angle % 360 + 360) % 360).toFixed(0)} valves ${D.valves.join('')} fill ${D.fill.map(f => (f * 100).toFixed(0) + '%').join(' ')} door ${D.doorOpen ? 'OPEN' : '-'} pearls ${D.got.join('')} bead ${D.bead.x.toFixed(0)},${D.bead.y.toFixed(0)} ${D.state}`); }
    return out; }, plan);
  console.log(rows.join('\n'));
} else if (mode === 'fillmap') {   // each cup's reading vs held angle, valves open: from upright, or after PRE=a (e.g. PRE=180) held 2 s
  const pre = process.env.PRE === undefined ? null : +process.env.PRE;
  const rows = await p.evaluate(({ pre, list }) => { const D = window.__dbg, out = [];
    for (const a of list) {
      D.reset(1000);
      const hold = (t, s) => { D.setTarget(t); for (let k = 0; k < s * 60; k++) D.step(1 / 60); };
      if (pre !== null) hold(pre, 2);
      hold(a, 3);
      let b = 0; for (let i = 0; i < D.N; i++) if (D.px[i] > 25) b++;
      out.push(`${pre !== null ? pre + '->' : ''}${a}: ${D.fill.map((f, k) => D.cups[k].name + ' ' + (f * 100).toFixed(0) + '%').join(' ')} | B ${b} | bead ${D.bead.x.toFixed(0)},${D.bead.y.toFixed(0)}`); }
    return out; }, { pre, list: (arg || '-180,-150,-120,-90,-60,-30,0,30,60,90,120,150,180').split(',').map(Number) });
  console.log(rows.join('\n'));
} else { console.log('modes: float | trace <plan json> | fillmap [angles] | publish-copy <out.html>'); }
await b.close();
