#!/usr/bin/env node
// Draws the link-preview images (1200x630 PNG, what Facebook and Messenger
// show above a shared link): assets/og/arcade.png for the gallery and
// assets/og/<id>.png for each game, from the gallery card art
// (assets/thumbs.js), title, blurb and accent color. Rerun after adding a
// game or changing its card art or blurb, and commit the PNGs.
// Usage: node scripts/make-og-images.mjs [id ...]   (default: all)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { root, manifest, ogImage } from "./site.mjs";

// Playwright may only be installed globally.
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (_) {
    const require = createRequire(import.meta.url);
    return require(join(execSync("npm root -g").toString().trim(), "playwright"));
  }
}
const { chromium } = await loadPlaywright();

const only = process.argv.slice(2);
const games = manifest.games;
const active = games.filter((g) => g.status !== "archived");
const thumbsJs = readFileSync(join(root, "assets/thumbs.js"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const css = `
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{background:#0b0b10;color:#e8e8ee;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;display:flex;align-items:center;gap:64px;padding:0 72px;position:relative}
  .art{flex:none;border-radius:36px;overflow:hidden;box-shadow:0 0 0 3px var(--accent),0 24px 60px rgba(0,0,0,.6)}
  .art svg{display:block;width:100%;height:100%}
  .text{flex:1;min-width:0}
  .brand{font-size:28px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:20px}
  h1{font-size:84px;line-height:1.02;font-weight:700;margin-bottom:26px}
  p{font-size:32px;line-height:1.3;color:#b4b4c0}
  .foot{position:absolute;left:0;right:0;bottom:0;height:12px;background:var(--accent)}
  .grid{flex:none;display:grid;grid-template-columns:repeat(3,142px);gap:14px}
  .grid .art{width:142px;height:142px;border-radius:20px;box-shadow:none}
  .fill{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:14px;background:#16161d;width:100%;height:100%}
  .fill span{background:var(--accent);border-radius:4px}`;

// Same fallback pattern as thumb() in assets/gallery.js, for games without
// card art.
function fallback(id) {
  let seed = 0;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  let cells = "";
  for (let i = 0; i < 16; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    cells += `<span style="opacity:${(0.15 + ((seed >>> 16) % 85) / 100).toFixed(2)}"></span>`;
  }
  return `<div class="fill">${cells}</div>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(`<!DOCTYPE html><html><head><style>${css}</style></head><body></body></html>`);
await page.addScriptTag({ content: thumbsJs });
const hasArt = await page.evaluate(() => Object.keys(window.ArcadeThumbs));
const artFor = async (g) =>
  hasArt.includes(g.id) ? page.evaluate((id) => window.ArcadeThumbs[id](), g.id) : fallback(g.id);

async function render(body, accent, file) {
  await page.evaluate(([b, a]) => {
    document.body.innerHTML = b;
    document.body.style.setProperty("--accent", a);
  }, [body, accent]);
  await page.screenshot({ path: join(root, file), type: "png" });
  console.log(`wrote ${file}`);
}

if (!only.length || only.includes("arcade")) {
  const cells = [];
  for (const g of active.slice(0, 9)) cells.push(`<div class="art" style="--accent:${g.accent || "#6fd3ff"}">${await artFor(g)}</div>`);
  await render(
    `<div class="text"><div class="brand">Free browser games</div><h1>Emergent Arcade</h1><p>Tiny games, two or three verbs each, all tangled in the same state. No installs.</p></div><div class="grid">${cells.join("")}</div><div class="foot"></div>`,
    "#6fd3ff",
    ogImage("arcade"),
  );
}
for (const g of games) {
  if (only.length && !only.includes(g.id)) continue;
  await render(
    `<div class="art" style="width:420px;height:420px">${await artFor(g)}</div><div class="text"><div class="brand">Emergent Arcade</div><h1>${esc(g.title)}</h1><p>${esc(g.blurb)}</p></div><div class="foot"></div>`,
    g.accent || "#6fd3ff",
    ogImage(g.id),
  );
}
await browser.close();
