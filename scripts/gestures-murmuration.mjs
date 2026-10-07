// Phone-size gesture check for Murmuration's two verbs (hold = lure, tap = startle).
//
// Usage: node scripts/gestures-murmuration.mjs [CONST=value,...]
//   e.g. node scripts/gestures-murmuration.mjs LURE_SPOOK=0 (try a constant first)
//
// Opens a debug copy of games/murmuration.html at 390x760 with touch, runs the
// real animation loop, and replays press-and-drag gestures with real timing
// (Playwright mouse events become pointer events). One line per gesture: which
// verb the game picked, how often the lure ring was red (birds inside the spook
// radius, the player's warning), and what the flock did (mean fear, birds
// scared, how far the flock's centre moved toward the target).
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

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../games/murmuration.html');

function buildDebug(overrides) {
  let html = fs.readFileSync(SRC, 'utf8');
  for (const [k, v] of Object.entries(overrides)) {
    const re = new RegExp(`(\\b${k} = )[^,;]+`);
    if (!re.test(html)) throw new Error('no const ' + k);
    html = html.replace(re, `$1${v}`);
  }
  const tail = '  newFlock();\n  requestAnimationFrame(frame);\n})();';
  if (!html.includes(tail)) throw new Error('game file layout changed: update buildDebug()');
  html = html.replace(tail, `
  window.__dbg = {
    get birds() { return birds; }, get startles() { return startles; }, get lure() { return lure; },
    W, H, newFlock, LURE_SPOOK_R,
  };
  newFlock();
  requestAnimationFrame(frame);
})();`);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'murm-g-')), 'debug.html');
  fs.writeFileSync(out, html);
  return out;
}

// Gestures, placed relative to the flock's centre c (sky units).
//   ms: press length; at: press point; to: drag end (moved over the press); spot: where the
//   player wants the flock to go (for "toward").
const GESTURES = [
  { name: 'tap 80ms behind flock', ms: 80, at: c => [c.x, c.y + 40] },
  { name: 'tap 150ms, 8px wobble', ms: 150, at: c => [c.x, c.y + 40], wobble: 8 },
  { name: 'press 150ms still (short hold)', ms: 150, at: c => [c.x - 100, c.y - 60] },
  { name: 'press 250ms still', ms: 250, at: c => [c.x - 100, c.y - 60] },
  { name: 'hold 3s ahead (110 away)', ms: 3000, at: c => [c.x - 90, c.y - 64] },
  { name: 'hold 3s far (220 away)', ms: 3000, at: c => [c.x - 180, c.y - 126] },
  { name: 'hold 3s on the flock', ms: 3000, at: c => [c.x, c.y] },
  { name: 'grab flock, drag 150 in 2s', ms: 2000, at: c => [c.x, c.y], to: c => [c.x - 120, c.y - 90] },
  { name: 'press ahead, drag 150 in 3s', ms: 3000, at: c => [c.x - 70, c.y - 50], to: c => [c.x - 190, c.y - 140] },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true });
await page.goto(pathToFileURL(buildDebug(Object.fromEntries((process.argv[2] || '').split(',').filter(Boolean).map(kv => kv.split('='))))).href);
await page.waitForTimeout(300);
{ // how big the lure ring is on this phone, against a ~40 px fingertip
  const box = await page.locator('#sky').boundingBox();
  const r = await page.evaluate(() => window.__dbg.LURE_SPOOK_R);
  console.log(`390x760: lure ring ${(2 * r * box.width / 400).toFixed(0)} CSS px across`);
}

const snap = () => page.evaluate(() => {
  const bs = window.__dbg.birds;
  let x = 0, y = 0; for (const b of bs) { x += b.x; y += b.y; }
  x /= bs.length; y /= bs.length;
  return { x, y, fear: bs.reduce((s, b) => s + b.fear, 0) / bs.length,
    scared: bs.filter(b => b.fear > 0.25).length, startles: window.__dbg.startles };
});
const toPx = (box, [x, y]) => [box.x + x * box.width / 400, box.y + y * box.height / 600];
const clamp = ([x, y]) => [Math.max(20, Math.min(380, x)), Math.max(20, Math.min(580, y))];

for (const g of GESTURES) {
  const results = [];
  for (let rep = 0; rep < 3; rep++) {
    await page.evaluate(() => window.__dbg.newFlock());
    await page.waitForTimeout(1500); // let the flock settle
    const box = await page.locator('#sky').boundingBox();
    const c0 = await snap();
    const a = clamp(g.at(c0)), b = g.to ? clamp(g.to(c0)) : a;
    const [px, py] = toPx(box, a);
    await page.mouse.move(px, py);
    await page.mouse.down();
    const t0 = Date.now();
    let lureSeen = false, frames = 0, red = 0;
    while (Date.now() - t0 < g.ms) {
      const f = Math.min(1, (Date.now() - t0) / g.ms);
      let [mx, my] = toPx(box, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      if (g.wobble) mx += g.wobble * Math.sin(f * Math.PI);
      await page.mouse.move(mx, my);
      const [on, spook] = await page.evaluate(() => {
        const l = window.__dbg.lure;
        return [!!(l && l.on), !!(l && l.on) && window.__dbg.birds.some(b => Math.hypot(l.x - b.x, l.y - b.y) < window.__dbg.LURE_SPOOK_R)];
      });
      lureSeen ||= on; frames++; red += spook;
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    const c1 = await snap();
    const dist0 = Math.hypot(b[0] - c0.x, b[1] - c0.y), dist1 = Math.hypot(b[0] - c1.x, b[1] - c1.y);
    results.push({ verb: c1.startles > c0.startles ? 'startle' : lureSeen ? 'lure' : 'none',
      fear: c1.fear, scared: c1.scared, toward: dist0 - dist1, red: red / frames });
  }
  const verbs = [...new Set(results.map(r => r.verb))].join('/');
  const avg = k => results.reduce((s, r) => s + r[k], 0) / results.length;
  console.log(`${g.name.padEnd(32)} ${verbs.padEnd(8)} ring red ${(100 * avg('red')).toFixed(0).padStart(3)}%  fear ${avg('fear').toFixed(2)}  scared ${avg('scared').toFixed(0).padStart(2)}/40  toward ${avg('toward').toFixed(0).padStart(4)}`);
}
await browser.close();
