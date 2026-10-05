#!/usr/bin/env node
// Accessibility audit (Playwright + Chromium, no other dependencies). Checks
// every game and the gallery, cabinet and teacher page for:
//
//   motion    prefers-reduced-motion: does the screen keep moving when the
//             setting is on (pixels changed while idle, with and without it)?
//   contrast  WCAG AA text contrast (4.5:1, 3:1 for large text), sampled from
//             the screenshot behind every DOM text and every canvas fillText
//             call; the gallery side also checks form-field borders and the
//             focus ring against the page (3:1, non-text contrast).
//   colour    colour-blind safety: the screen's main colours, simulated for
//             deuteranopia and protanopia (Machado 2009, full severity). A
//             pair that is clearly different in colour but merges in the
//             simulation is told apart only by hue.
//   keyboard  games: key handlers, the manifest's keyboard line and whether
//             the screen answers keys more than it moves on its own. Gallery
//             side: Tab reaches every control with a visible focus ring, a
//             game opens and gets focus with the keyboard alone.
//   label     games: the main canvas has role="img" and an aria-label naming
//             the game and its verbs. Gallery side: every control, frame and
//             dialog has an accessible name; the page has a lang.
//   text      the smallest text on screen at 360×740 (DOM and canvas, in CSS
//             px): pass at 12 px and up, partial from 10 px.
//
// One line per target per check. Exit code 1 if a gallery-side check fails;
// game checks only report (each game's fixes are its own revision). CI runs
// it (.github/workflows/pages.yml); results in docs/accessibility.md.
//
//   node scripts/a11y-audit.mjs [<id> ...] [--gallery] [--games] [--jobs 4] [--table]
//
// --gallery / --games run only that half. --table also prints the Markdown
// rows for docs/accessibility.md. Screenshots stay in memory.
import http from "node:http";
import zlib from "node:zlib";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};
const JOBS = opt("jobs", 4);
const ids = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1] === "--jobs"));
const doGallery = !flag("games") && !ids.length || flag("gallery");
const doGames = !flag("gallery") || flag("games");

const manifest = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8"));
const games = manifest.games.filter((g) => !ids.length || ids.includes(g.id));
if (ids.length && games.length !== ids.length) {
  console.error(`Unknown game id in: ${ids.join(", ")}`);
  process.exit(1);
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (_) {
    const require = createRequire(import.meta.url);
    return require(join(execSync("npm root -g").toString().trim(), "playwright"));
  }
}
const { chromium } = await loadPlaywright();

// § server: the repo; the feedback endpoint answers locally, never the real one.

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__endpoint") {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end('{"ok":true}');
    });
    return;
  }
  const rel = normalize(decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)).replace(/^([/\\])+/, "");
  const file = join(root, rel);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  let body = readFileSync(file);
  if (rel === join("assets", "config.js")) {
    body = body.toString().replace(/feedbackEndpoint:\s*"[^"]*"/, `feedbackEndpoint: "http://127.0.0.1:${server.address().port}/__endpoint"`);
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(req.method === "HEAD" ? undefined : body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

// § png: decode Playwright's screenshots (8-bit RGB/RGBA, not interlaced).

function decodePng(buf) {
  let pos = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[out + x - bpp] : 0;
      const b = y ? px[out - stride + x] : 0;
      const c = x >= bpp && y ? px[out - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[out + x] = v & 255;
    }
  }
  const at = (x, y) => { const i = (y * w + x) * bpp; return [px[i], px[i + 1], px[i + 2]]; };
  return { w, h, at };
}
const shot = async (page, o) => decodePng(await page.screenshot(o || {}));

// Share of pixels that changed between two screenshots.
function diff(a, b) {
  let n = 0, total = 0;
  for (let y = 0; y < a.h; y += 2) for (let x = 0; x < a.w; x += 2) {
    const p = a.at(x, y), q = b.at(x, y);
    total++;
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > 24) n++;
  }
  return n / total;
}

// § colour: WCAG luminance, Lab, colour-blind simulation.

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const unlin = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function lab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), Y = f(0.2126 * R + 0.7152 * G + 0.0722 * B), Z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const SIM = {
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};
function simulate(c, kind) {
  const l = c.map(lin), m = SIM[kind];
  return m.map((row) => Math.max(0, Math.min(255, unlin(Math.max(0, Math.min(1, row[0] * l[0] + row[1] * l[1] + row[2] * l[2]))))));
}
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
function parseColor(s) {
  if (!s || typeof s !== "string") return null;
  if (s[0] === "#") {
    const h = s.length === 4 ? s.slice(1).split("").map((d) => d + d).join("") : s.slice(1);
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  const n = (s.match(/-?[\d.]+/g) || []).map(Number);
  if (s.startsWith("color(srgb")) return { rgb: n.slice(0, 3).map((v) => v * 255), a: n.length > 3 ? n[3] : 1 };
  if (s.startsWith("rgb")) return { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 };
  return null;
}
const blend = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a));

// The background behind a box: the most common colour around and inside it,
// leaving out pixels close to the text colour.
function bgBehind(img, [x, y, w, h], text) {
  const x0 = Math.max(0, Math.floor(x) - 3), y0 = Math.max(0, Math.floor(y) - 3);
  const x1 = Math.min(img.w - 1, Math.ceil(x + w) + 3), y1 = Math.min(img.h - 1, Math.ceil(y + h) + 3);
  const buckets = new Map();
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const p = img.at(xx, yy);
    if (text && Math.abs(p[0] - text[0]) + Math.abs(p[1] - text[1]) + Math.abs(p[2] - text[2]) < 60) continue;
    const k = (p[0] >> 3) * 1024 + (p[1] >> 3) * 32 + (p[2] >> 3);
    const b = buckets.get(k) || { n: 0, s: [0, 0, 0] };
    b.n++; b.s[0] += p[0]; b.s[1] += p[1]; b.s[2] += p[2];
    buckets.set(k, b);
  }
  let best = null;
  for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
  return best && best.s.map((v) => v / best.n);
}

// Main colours of a screenshot, clustered in Lab, with their screen share.
function palette(img) {
  const buckets = new Map();
  let total = 0;
  for (let y = 0; y < img.h; y += 2) for (let x = 0; x < img.w; x += 2) {
    const p = img.at(x, y);
    const k = (p[0] >> 3) * 1024 + (p[1] >> 3) * 32 + (p[2] >> 3);
    const b = buckets.get(k) || { n: 0, s: [0, 0, 0], x: 0, y: 0 };
    b.n++; b.s[0] += p[0]; b.s[1] += p[1]; b.s[2] += p[2]; b.x += x; b.y += y;
    buckets.set(k, b);
    total++;
  }
  const clusters = [];
  for (const b of [...buckets.values()].sort((p, q) => q.n - p.n)) {
    const c = b.s.map((v) => v / b.n);
    const near = clusters.find((k) => dE(k.c, c) < 10);
    if (near) { near.n += b.n; near.x += b.x; near.y += b.y; }
    else if (clusters.length < 40) clusters.push({ c, n: b.n, x: b.x, y: b.y });
  }
  return clusters.map((k) => ({ c: k.c, share: k.n / total, at: [Math.round(k.x / k.n), Math.round(k.y / k.n)] })).filter((k) => k.share >= 0.001);
}

// Pairs that differ clearly (ΔE ≥ 20) but merge (ΔE < 7) for a colour-blind eye.
function hueOnly(img) {
  const pal = palette(img);
  const hits = [];
  for (let i = 0; i < pal.length; i++) for (let j = i + 1; j < pal.length; j++) {
    const a = pal[i], b = pal[j];
    if (dE(a.c, b.c) < 20) continue;
    for (const kind of ["deutan", "protan"]) {
      const d = dE(simulate(a.c, kind), simulate(b.c, kind));
      if (d < 7) hits.push({ kind, a: hex(a.c), b: hex(b.c), share: Math.min(a.share, b.share), d, at: (a.share < b.share ? a : b).at });
    }
  }
  return hits.sort((p, q) => q.share - p.share);
}
function colourVerdict(hits) {
  // Under 0.2% of the screen is mostly anti-aliased edges blending two colours.
  const big = hits.filter((h) => h.share >= 0.005), some = hits.filter((h) => h.share >= 0.002);
  const say = (h) => `${h.kind} ${h.a}≈${h.b} (${(h.share * 100).toFixed(1)}%${h.at ? ` near ${h.at.join(",")}` : ""})`;
  if (big.length) return ["fail", `${say(big[0])}${big.length > 1 ? ` +${big.length - 1}` : ""}`];
  if (some.length) return ["partial", `small areas: ${say(some[0])}`];
  return ["pass", "no colours merge"];
}

// § page helpers (run in the browser).

// Canvas text, matchMedia and key-listener spies, before any game script.
const SPY = () => {
  const A = (window.__a11y = { texts: [], frame: 0, mq: [], keys: 0 });
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = (cb) => raf.call(window, (t) => { A.frame++; cb(t); });
  const mm = window.matchMedia;
  window.matchMedia = function (q) { A.mq.push(String(q)); return mm.call(window, q); };
  const ael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, ...rest) {
    if (/^key/.test(type)) A.keys++;
    return ael.call(this, type, ...rest);
  };
  const P = CanvasRenderingContext2D.prototype;
  const drew = new WeakMap(); // canvas -> frame of its last full clear
  for (const name of ["clearRect", "fillRect"]) {
    const orig = P[name];
    P[name] = function (x, y, w, h) {
      if (w >= this.canvas.width * 0.9 && h >= this.canvas.height * 0.9) drew.set(this.canvas, A.frame);
      return orig.apply(this, arguments);
    };
  }
  const fill = P.fillText;
  P.fillText = function (text, x, y) {
    try {
      const m = this.measureText(text);
      A.texts.push({ canvas: this.canvas, frame: A.frame, text: String(text), x, y, font: this.font, fill: typeof this.fillStyle === "string" ? this.fillStyle : null, alpha: this.globalAlpha, t: this.getTransform(), m: [m.actualBoundingBoxLeft, m.actualBoundingBoxRight, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent] });
      if (A.texts.length > 2000) A.texts.splice(0, 1000);
    } catch (_) {}
    return fill.apply(this, arguments);
  };
  // Canvas text drawn since each canvas was last cleared, in CSS px.
  A.canvasTexts = () => {
    const out = [];
    const last = new Map();
    for (const t of A.texts) last.set(t.canvas, Math.max(last.get(t.canvas) || 0, t.frame));
    for (const t of A.texts) {
      const cleared = drew.get(t.canvas) || 0;
      if (t.frame < cleared || t.frame < last.get(t.canvas) - 2) continue;
      if (!t.canvas.isConnected) continue;
      const r = t.canvas.getBoundingClientRect();
      if (!r.width || !t.canvas.width) continue;
      const k = r.width / t.canvas.width;
      const [L, R, Asc, D] = t.m;
      const pts = [[t.x - L, t.y - Asc], [t.x + R, t.y - Asc], [t.x - L, t.y + D], [t.x + R, t.y + D]].map(([px, py]) => t.t.transformPoint(new DOMPoint(px, py)));
      const xs = pts.map((p) => r.left + p.x * k), ys = pts.map((p) => r.top + p.y * k);
      const fontPx = parseFloat((t.font.match(/([\d.]+)px/) || [])[1] || "10");
      const size = fontPx * Math.sqrt(Math.abs(t.t.a * t.t.d - t.t.b * t.t.c)) * k;
      const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
      if (box[2] < 1 || box[0] > innerWidth || box[1] > innerHeight || box[0] + box[2] < 0 || box[1] + box[3] < 0) continue;
      out.push({ text: t.text.slice(0, 30), color: t.fill, alpha: t.alpha, size, bold: /bold|[6-9]00/.test(t.font), box, src: "canvas" });
    }
    const seen = new Set();
    return out.filter((t) => { const k = t.text + t.box.map(Math.round).join(","); if (seen.has(k)) return false; seen.add(k); return true; });
  };
};

// Visible DOM text: colour, opacity, size, first line box (document coords).
const DOM_TEXTS = (opts) => {
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const s = n.nodeValue.trim();
    if (!s || !/[\p{L}\p{N}]/u.test(s)) continue;
    const el = n.parentElement;
    if (!el || el.closest("script,style,noscript,option")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible") continue;
    let op = 1;
    for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
    if (op < 0.05) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = [...range.getClientRects()].find((q) => q.width > 1 && q.height > 1);
    if (!r || r.right < 0 || r.left > innerWidth - 1 || (!opts.full && (r.bottom < 0 || r.top > innerHeight))) continue;
    // Clipped away (visually hidden, scrolled out of a strip)?
    let clipped = false;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const s2 = getComputedStyle(e);
      if (s2.overflow !== "visible" || s2.clip !== "auto") {
        const b = e.getBoundingClientRect();
        if (b.width <= 2 || b.height <= 2 || r.left >= b.right || r.right <= b.left || r.top >= b.bottom || r.bottom <= b.top) { clipped = true; break; }
      }
    }
    if (clipped) continue;
    out.push({
      text: s.slice(0, 30), color: cs.color, alpha: op, size: parseFloat(cs.fontSize), bold: parseInt(cs.fontWeight, 10) >= 700,
      box: [r.left + (opts.full ? scrollX : 0), r.top + (opts.full ? scrollY : 0), r.width, r.height],
      disabled: !!el.closest(":disabled,[aria-disabled='true']"),
      where: (el.id ? "#" + el.id : el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : el.tagName.toLowerCase()),
      src: "dom",
    });
  }
  return out;
};

// Contrast of each text against what the screenshot shows behind it.
function contrastOf(texts, img) {
  const res = [];
  for (const t of texts) {
    if (t.disabled) continue;
    const c = parseColor(t.color);
    if (!c) continue;
    const bg = bgBehind(img, t.box, c.rgb);
    if (!bg) continue;
    const fg = blend(c.rgb, c.a * (t.alpha == null ? 1 : t.alpha), bg);
    const large = t.size >= 24 || (t.size >= 18.66 && t.bold);
    const r = ratio(fg, bg);
    res.push({ ...t, ratio: r, need: large ? 3 : 4.5, fg: hex(fg), bg: hex(bg) });
  }
  return res;
}
function contrastVerdict(res, strict) {
  const low = res.filter((r) => r.ratio < r.need).sort((a, b) => a.ratio - b.ratio);
  if (!res.length) return ["pass", "no text on screen"];
  if (!low.length) return ["pass", `${res.length} texts, lowest ${Math.min(...res.map((r) => r.ratio)).toFixed(1)}:1`];
  const w = low[0];
  const say = `${low.length}/${res.length} below AA, worst ${w.ratio.toFixed(1)}:1 "${w.text}" ${w.where || w.src} ${w.fg} on ${w.bg}`;
  return [strict || w.ratio < 3 ? "fail" : "partial", say];
}
function sizeVerdict(texts) {
  if (!texts.length) return ["pass", "no text on screen"];
  const small = texts.filter((t) => t.size < 12 - 0.01).sort((a, b) => a.size - b.size);
  const min = Math.min(...texts.map((t) => t.size));
  if (!small.length) return ["pass", `smallest ${min.toFixed(1)} px`];
  const w = small[0];
  return [min >= 10 - 0.01 ? "partial" : "fail", `${small.length}/${texts.length} under 12 px, smallest ${min.toFixed(1)} px "${w.text}" (${w.where || w.src})`];
}

// § reporting

const results = []; // { target, check, verdict, detail, gallery }
const CHECKS = ["motion", "contrast", "colour", "keyboard", "label", "text"];
function report(target, check, [verdict, detail], gallery) {
  results.push({ target, check, verdict, detail, gallery });
  console.log(`${verdict.padEnd(7)} ${target.padEnd(19)} ${check.padEnd(8)} ${detail}`);
}
async function guard(target, check, gallery, fn) {
  try { report(target, check, await fn(), gallery); }
  catch (err) { report(target, check, ["fail", `audit error: ${String(err.message || err).split("\n")[0]}`], gallery); }
}

const browser = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PHONE = { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1280, height: 800 } };

// § games

// Seeded taps, so each run pokes the same places.
function taps(seed, n, w, h) {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return Array.from({ length: n }, () => [Math.round(w * (0.2 + 0.6 * rnd())), Math.round(h * (0.25 + 0.5 * rnd()))]);
}
async function openGame(context, g) {
  const page = await context.newPage();
  await page.addInitScript(SPY);
  await page.goto(`${base}games/${g.file}`);
  await sleep(1200);
  return page;
}
// Idle motion: the median share of pixels changed between frames 0.4 s apart
// (five pairs over 2 s, so one blink or toast doesn't decide it).
async function idleMotion(page) {
  const frames = [await shot(page)];
  for (let i = 0; i < 5; i++) { await sleep(400); frames.push(await shot(page)); }
  const d = frames.slice(1).map((f, i) => diff(frames[i], f)).sort((a, b) => a - b);
  return d[2];
}

// Words a canvas label may use for each verb.
const VERB_WORDS = { tap: /\b(tap|click|press)/i, drag: /\b(drag|draw|pull|slide|swipe|move|turn)/i, hold: /\b(hold|press and hold)/i, flick: /\b(flick|throw|knock|fling)/i, tilt: /\b(tilt)/i };

// Which verbs each game's keyboard line reaches, read by hand from the line
// and the game's key handler (2026-10-05). When a revision changes the line,
// the keyboard check says "recheck" until this table is updated.
const ALL = "all";
const KEY_COVER = {
  "pressure-grid": ["Arrows move · Enter/Space pump · S then an arrow aims a pour, Enter pours · Z undo · R restart · N next level", ALL],
  "ant-trails": ["Arrows move the cursor · hold Space: trail · hold W: wash · H nest, N next food · F fast-forward · Enter next day", ALL],
  "terrace-garden": ["← → or A / D tilt · ↑ ↓ pick a gate, Enter or G opens or shuts it · 0–4 that gate (0 spring) · S status", ALL],
  "bubble-glass": ["← → or A / D to turn the box", ["drag"]],
  "tidewright": ["← → pick a column, hold and release Space to throw sand (longer = more), 1-4 open or shut a gate", ALL],
  "rail-yard": ["Space picks a car (Shift+Space back) · 1–9, + − speed · arrows flick · A–D switches · Z undo · H hint · X restart", ALL],
  "aqueduct": ["← → turn, Space or 1 / 2 shut and open valves, R restart, L levels", ALL],
  "counterfeit-scale": ["Arrows or 1-9 pick a coin, L / R load it, T back to tray, M mark, Space weigh, A accuse, H hint, Esc clear", ALL],
  "coat-check": ["Arrows pick a hook, Enter hangs the coat or opens the door, hold P to peek, Enter for the next shift", ALL],
  "mycelium": ["Arrows move the cursor, Enter marks a knot then Enter grows to the cursor, Space pulses, X cuts", ALL],
  "lighthouse-keeper": ["← → turn the beam · N next ship in the dark · S shutter · hold Space: flare · I status · Enter next night", ALL],
  "surprise-party": ["Arrows move · Enter whispers, next house · hold O: door · G guest, D door, B birthday · Space wait · U undo · R restart", ALL],
  "geode": ["← → temperature · T switches arrows to a cursor · S/Enter seed · hold C cleave · I foreign ion · H harvest · M sound", ALL],
  "island-census": ["Arrows pick a meadow · Enter/Space release rabbits · F then an arrow picks a path, F fences/unfences it · N next season", ALL],
  "murmuration": ["Arrows move the cursor · hold Space to lure toward it · Enter or X startles at it · Enter flies again after a round", ALL],
  "hourglass-delivery": ["Arrows move the cursor · hold Space pours · K then an arrow knocks · G next glass, L next ledge · Enter plays again", ALL],
  "orbit-garden": ["Arrows move the cursor · Enter places a planet · Space aims (arrows: angle, strength), Space flings · N next planet", ALL],
  "wildfire-line": ["Arrows move the cursor · Space starts or stops cutting along its path · Enter lights a backburn at the cursor", ALL],
  "hot-iron": ["← → move the cursor (Shift: half) · hold Space heats there · Enter or H strikes · O next off the outline · S status", ALL],
  "loom": ["Arrows pick a knot · C next corner · Enter or P pins/unpins · hold Space: arrows pull it · S status · Enter next shape", ALL],
};

async function auditGame(g) {
  const ctxP = await browser.newContext(PHONE);
  const ctxR = await browser.newContext({ ...PHONE, reducedMotion: "reduce" });
  const ctxD = await browser.newContext(DESK);
  try {
    // Phone, with and without the setting: a few taps to start the game, then
    // the motion while nobody touches it.
    const [p, r, d] = await Promise.all([openGame(ctxP, g), openGame(ctxR, g), openGame(ctxD, g)]);
    const poke = async (page) => { for (const [x, y] of taps(g.id.length * 7919, 5, 360, 740)) { await page.mouse.click(x, y); await sleep(150); } await sleep(1500); };
    await Promise.all([poke(p), poke(r)]);
    const [mNormal, mReduced] = await Promise.all([idleMotion(p), idleMotion(r)]);
    const reads = (await r.evaluate(() => window.__a11y.mq.join(" "))).includes("reduced-motion");
    await guard(g.id, "motion", false, () => {
      const pc = (x) => `${(x * 100).toFixed(1)}%`;
      if (mNormal < 0.002 && mReduced < 0.002) return ["pass", "still while idle"];
      if (reads && mReduced < mNormal * 0.6) return ["pass", `reads the setting; idle motion ${pc(mNormal)} → ${pc(mReduced)}`];
      if (reads) return ["partial", `reads the setting, motion unchanged (${pc(mNormal)} → ${pc(mReduced)})`];
      if (mReduced < 0.01) return ["partial", `ignores the setting; small idle motion ${pc(mReduced)}`];
      return ["fail", `ignores the setting; ${pc(mReduced)} of the screen moves while idle`];
    });

    const img = await shot(p);
    const texts = [...(await p.evaluate(() => window.__a11y.canvasTexts())), ...(await p.evaluate(DOM_TEXTS, { full: false }))];
    await guard(g.id, "contrast", false, () => contrastVerdict(contrastOf(texts, img), false));
    await guard(g.id, "colour", false, () => colourVerdict(hueOnly(img)));
    await guard(g.id, "text", false, () => sizeVerdict(texts));

    // Label: the biggest canvas.
    await guard(g.id, "label", false, async () => {
      const c = await p.evaluate(() => {
        const cs = [...document.querySelectorAll("canvas")].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
        return cs ? { label: cs.getAttribute("aria-label") || "", role: cs.getAttribute("role") || "", live: !!document.querySelector("[aria-live],[role=status],[role=alert]") } : null;
      });
      if (!c) return ["fail", "no canvas"];
      if (!c.label) return ["fail", "main canvas has no aria-label"];
      const miss = [];
      const firstWord = g.title.split(/\s+/)[0].toLowerCase();
      if (!c.label.toLowerCase().includes(firstWord)) miss.push("title");
      for (const v of new Set(g.mechanics.map((m) => m.verb))) if (VERB_WORDS[v] && !VERB_WORDS[v].test(c.label)) miss.push(v);
      const notes = [];
      if (!c.role) notes.push('no role="img"');
      if (miss.length) notes.push(`doesn't name ${miss.join(", ")}`);
      if (/\btap\b/i.test(c.label)) notes.push('says "tap" on PC');
      if (!c.live) notes.push("no live region");
      if (!c.role || miss.length) return ["partial", notes.join("; ")];
      return ["pass", notes.length ? notes.join("; ") : "names the game and its verbs"];
    });

    // Keyboard, desktop, no pointer at all.
    await guard(g.id, "keyboard", false, async () => {
      const keys = await d.evaluate(() => window.__a11y.keys + (window.onkeydown || document.onkeydown ? 1 : 0));
      const verbs = [...new Set(g.mechanics.map((m) => m.verb))];
      if (!keys) return ["fail", "no key handlers: every verb needs a pointer"];
      const line = g.keyboard || "";
      if (!line) return ["fail", "key handlers but no keyboard line: every verb needs a pointer"];
      const cover = KEY_COVER[g.id];
      if (!cover || cover[0] !== line) return ["partial", `recheck: keyboard line not in KEY_COVER ("${line}")`];
      const reached = cover[1] === ALL ? verbs : cover[1];
      const missing = verbs.filter((v) => !reached.includes(v));
      // Does the screen answer keys more than it moves on its own?
      const a = await shot(d);
      await sleep(800);
      const b = await shot(d);
      const idle = diff(a, b);
      const press = ["Enter", "Space", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"];
      for (const m of line.matchAll(/\b([A-Z0-9])\b/g)) if (!/[RXL]/.test(m[1])) press.push(/[A-Z]/.test(m[1]) ? `Key${m[1]}` : `Digit${m[1]}`);
      const t = Date.now();
      for (const k of press) {
        if (Date.now() - t > 2500) break;
        await d.keyboard.down(k); await sleep(/Arrow|Space/.test(k) ? 300 : 60); await d.keyboard.up(k); await sleep(60);
      }
      const c = await shot(d);
      const answered = diff(b, c) > idle + 0.0005 && diff(b, c) > idle * 1.3;
      // A game that keeps Tab and Shift+Tab traps keyboard users in the cabinet's frame.
      const tab = await d.evaluate(async () => {
        const got = [];
        const spy = (e) => setTimeout(() => got.push(e.defaultPrevented), 0);
        window.addEventListener("keydown", spy);
        for (const shiftKey of [false, true]) window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", shiftKey, bubbles: true, cancelable: true }));
        await new Promise((r) => setTimeout(r, 20));
        window.removeEventListener("keydown", spy);
        return got;
      });
      const notes = [];
      if (tab.length === 2 && tab[0] && tab[1]) notes.push("takes Tab and Shift+Tab");
      else if (tab.some(Boolean)) notes.push("takes Tab");
      if (!reached.length) return ["fail", `keys only for ${line.replace(/\s+/g, " ")}: every verb needs a pointer`];
      if (missing.length) return ["partial", `keys reach ${reached.join(", ")}; ${missing.join(", ")} need a pointer${notes.length ? "; " + notes.join("; ") : ""}`];
      const trapped = notes.length > 0;
      if (!answered) notes.push("no visible answer to the test keys");
      return [trapped ? "partial" : "pass", `keys cover every verb${notes.length ? "; " + notes.join("; ") : ""}`];
    });
  } finally {
    await Promise.all([ctxP.close(), ctxR.close(), ctxD.close()]);
  }
}

// § gallery side

// Accessible-name problems among visible controls, frames and dialogs.
const NAMES = () => {
  const bad = [];
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility === "visible";
  const name = (e) => {
    const by = e.getAttribute("aria-labelledby");
    if (by) return by.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || "").join(" ").trim();
    if (e.getAttribute("aria-label")) return e.getAttribute("aria-label").trim();
    if (e.labels && e.labels.length) return [...e.labels].map((l) => l.textContent).join(" ").trim();
    if (/^(A|BUTTON|SUMMARY)$/.test(e.tagName) && (e.textContent.trim() || e.querySelector("img[alt]"))) return e.textContent.trim() || "img";
    return (e.getAttribute("title") || e.getAttribute("alt") || "").trim();
  };
  const desc = (e) => e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : ""}`;
  for (const e of document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,iframe,[role=button],[tabindex]:not([tabindex='-1'])")) {
    if (!vis(e)) continue;
    if (!name(e)) bad.push(desc(e));
    else if (e.tagName === "IFRAME" && /^game$/i.test(name(e))) bad.push(`${desc(e)} (generic title)`);
  }
  for (const e of document.querySelectorAll("img")) if (vis(e) && !e.hasAttribute("alt")) bad.push(desc(e) + " (no alt)");
  for (const e of document.querySelectorAll("dialog[open],[role=dialog]:not([hidden])")) if (vis(e) && !name(e)) bad.push(desc(e) + " (dialog)");
  if (!document.documentElement.lang) bad.push("html lang");
  if (!document.querySelector("main")) bad.push("no <main>");
  return bad;
};

// Non-text contrast: form-field borders and the focus ring against the page.
const FIELDS = () => {
  const out = [];
  for (const e of document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea")) {
    if (!e.getClientRects().length) continue;
    const cs = getComputedStyle(e);
    let bg = null;
    for (let p = e.parentElement; p; p = p.parentElement) { const c = getComputedStyle(p).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; } }
    out.push({ where: e.id ? "#" + e.id : e.tagName.toLowerCase(), border: parseFloat(cs.borderTopWidth) ? cs.borderTopColor : null, fill: cs.backgroundColor, bg: bg || getComputedStyle(document.body).backgroundColor });
  }
  return out;
};
function fieldVerdictLines(fields) {
  const low = [];
  for (const f of fields) {
    const bg = parseColor(f.bg).rgb;
    const fill = parseColor(f.fill);
    const fillRgb = fill && fill.a > 0 ? blend(fill.rgb, fill.a, bg) : bg;
    const border = f.border && parseColor(f.border);
    const best = Math.max(ratio(fillRgb, bg), border ? ratio(blend(border.rgb, border.a, fillRgb), bg) : 1);
    if (best < 3) low.push(`${f.where} ${best.toFixed(1)}:1`);
  }
  return low;
}

// Tab through a view: every stop visible, with a focus ring that changes the
// pixels around it (3:1 against what was there).
async function tabWalk(page, max) {
  const out = { stops: 0, noRing: [], hidden: [], trapped: false };
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const seen = new Set();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      e.scrollIntoView({ block: "nearest", inline: "nearest" });
      const r = e.getBoundingClientRect();
      const tag = e.id ? "#" + e.id : `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : ""}`;
      return { key: tag + ":" + Math.round(r.left) + "," + Math.round(r.top + scrollY), tag, frame: e.tagName === "IFRAME", r: [r.left, r.top, r.width, r.height], vw: innerWidth, vh: innerHeight };
    });
    if (!info) break;
    if (seen.has(info.key)) break;
    seen.add(info.key);
    out.stops++;
    if (info.frame) continue;
    const [x, y, w, h] = info.r;
    if (w < 1 || h < 1 || x + w < 0 || y + h < 0 || x > info.vw || y > info.vh) { out.hidden.push(info.tag); continue; }
    const clip = { x: Math.max(0, x - 6), y: Math.max(0, y - 6), width: Math.min(info.vw, x + w + 6) - Math.max(0, x - 6), height: Math.min(info.vh, y + h + 6) - Math.max(0, y - 6) };
    if (clip.width < 1 || clip.height < 1) continue;
    const on = await shot(page, { clip });
    await page.evaluate(() => { const e = document.activeElement; window.__refocus = e; e.blur(); });
    const off = await shot(page, { clip });
    await page.evaluate(() => window.__refocus.focus({ preventScroll: true }));
    let best = 1, changed = 0;
    for (let yy = 0; yy < on.h; yy++) for (let xx = 0; xx < on.w; xx++) {
      const a = on.at(xx, yy), b = off.at(xx, yy);
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 30) { changed++; best = Math.max(best, ratio(a, b)); }
    }
    if (changed < Math.min(20, (w + h)) || best < 3) out.noRing.push(`${info.tag}${changed ? ` ${best.toFixed(1)}:1` : " none"}`);
  }
  return out;
}

async function domContrast(page, full) {
  const img = await shot(page, { fullPage: full });
  const texts = await page.evaluate(DOM_TEXTS, { full });
  return { res: contrastOf(texts, img), texts, img };
}

async function auditGallery() {
  const g0 = games[0] || manifest.games[0];
  // The cabinet is checked in each of its states: intro, Records, rating, playing.
  const panel = (name) => async (page) => {
    await page.keyboard.press("Escape");
    await page.evaluate((n) => document.querySelector(`.toolbar [data-panel="${n}"]`).click(), name);
    await page.waitForSelector("#panel:not([hidden])");
  };
  const views = [
    { target: "gallery", url: `${base}#/`, full: true, ready: ".game-card" },
    { target: "cabinet", url: `${base}#/play/${g0.id}`, full: false, ready: "#panel:not([hidden])",
      states: [async () => {}, panel("achievements"), panel("rate"), async (page) => { await page.keyboard.press("Escape"); await sleep(300); }] },
    { target: "teacher page", url: `${base}#/teachers`, full: true, ready: "#teachTopicRows tr" },
    { target: "classroom note", url: `${base}?class=1#/`, full: false, ready: "#classroomNote:not([hidden])" },
  ];
  // Runs fn(page) once per state of the view (once for views without states).
  async function eachState(v, ctxOpts, fn) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    try {
      await page.goto(v.url);
      await page.waitForSelector(v.ready);
      await sleep(300);
      for (const setup of v.states || [async () => {}]) {
        await setup(page);
        await sleep(200);
        await fn(page);
      }
    } finally {
      await ctx.close();
    }
  }
  for (const v of views) {
    // Motion: CSS animations and transitions still running with the setting on.
    await guard(v.target, "motion", true, async () => {
      const ctx = await browser.newContext({ ...DESK, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.goto(v.url);
      await page.waitForSelector(v.ready);
      const found = await page.evaluate(() => {
        const moving = document.getAnimations().filter((a) => a.playState === "running").length;
        let slow = 0, smooth = getComputedStyle(document.documentElement).scrollBehavior === "smooth";
        for (const e of document.querySelectorAll("*")) {
          const cs = getComputedStyle(e);
          if (cs.transitionDuration.split(",").some((s) => parseFloat(s) > 0.01) || cs.animationName !== "none") slow++;
        }
        return { moving, slow, smooth };
      });
      await ctx.close();
      if (found.moving || found.slow || found.smooth) return ["fail", `${found.moving} running animations, ${found.slow} elements still transition${found.smooth ? ", smooth scroll" : ""}`];
      return ["pass", "no animations or transitions with the setting on"];
    });

    // Contrast, light and dark, text at desktop and phone width, plus fields.
    await guard(v.target, "contrast", true, async () => {
      const lines = [], fieldLow = [];
      let worst = null, count = 0;
      for (const scheme of ["light", "dark"]) {
        for (const size of [DESK, PHONE]) {
          await eachState(v, { ...size, colorScheme: scheme, reducedMotion: "reduce" }, async (page) => {
            const { res } = await domContrast(page, v.full);
            count += res.length;
            for (const r of res) if (r.ratio < r.need && (!worst || r.ratio < worst.ratio)) worst = { ...r, scheme };
            lines.push(...res.filter((r) => r.ratio < r.need).map((r) => `${scheme} ${r.where} "${r.text}"`));
            if (size === DESK) for (const f of fieldVerdictLines(await page.evaluate(FIELDS))) fieldLow.push(`${scheme} ${f}`);
          });
        }
      }
      const uniq = [...new Set(lines)];
      if (!uniq.length && !fieldLow.length) return ["pass", `${count} texts in light and dark, all AA; field borders 3:1`];
      const bits = [];
      if (uniq.length) bits.push(`${uniq.length} texts below AA, worst ${worst.ratio.toFixed(1)}:1 ${worst.scheme} ${worst.where} "${worst.text}" ${worst.fg} on ${worst.bg}`);
      if (fieldLow.length) bits.push(`field borders under 3:1: ${[...new Set(fieldLow)].slice(0, 4).join(", ")}`);
      return ["fail", bits.join("; ")];
    });

    // Colour: the view's screenshot, light and dark.
    await guard(v.target, "colour", true, async () => {
      const hits = [];
      for (const scheme of ["light", "dark"]) {
        const ctx = await browser.newContext({ ...DESK, colorScheme: scheme, reducedMotion: "reduce" });
        const page = await ctx.newPage();
        await page.goto(v.url);
        await page.waitForSelector(v.ready);
        await sleep(300);
        // The game frame's own colours belong to the game's row.
        await page.evaluate(() => { const f = document.getElementById("gameFrame"); if (f) f.style.visibility = "hidden"; });
        hits.push(...hueOnly(await shot(page)));
        // Pressed vs not pressed chips must differ by more than hue.
        const chips = await page.evaluate(() => {
          const on = document.querySelector(".verb-chip[aria-pressed=true]"), off = document.querySelector(".verb-chip[aria-pressed=false]");
          return on && off ? [getComputedStyle(on).backgroundColor, getComputedStyle(off).backgroundColor] : null;
        });
        if (chips) {
          const [a, b] = chips.map((c) => parseColor(c).rgb);
          if (ratio(a, b) < 1.5) for (const kind of ["deutan", "protan"]) if (dE(simulate(a, kind), simulate(b, kind)) < 10) hits.push({ kind, a: hex(a), b: hex(b), share: 1, d: 0, chip: true });
        }
        await ctx.close();
      }
      return colourVerdict(hits);
    });

    // Keyboard: Tab order and focus rings at desktop size, light theme.
    await guard(v.target, "keyboard", true, async () => {
      const ctx = await browser.newContext({ ...DESK, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.goto(v.url);
      await page.waitForSelector(v.ready);
      const walk = await tabWalk(page, v.target === "cabinet" ? 40 : 160);
      const notes = [];
      if (v.target === "gallery") {
        // Open the first card with Enter: the game (or its intro) gets focus.
        await page.evaluate(() => document.querySelector(".game-card a, a.game-card, .game-card").focus());
        await page.keyboard.press("Enter");
        await page.waitForSelector("#cabinet:not([hidden])", { timeout: 5000 });
        await sleep(300);
        const where = await page.evaluate(() => { const e = document.activeElement; return e.id || e.tagName; });
        if (!/panel|aboutPlay|gameFrame/.test(where)) notes.push(`Enter on a card leaves focus on ${where}`);
      }
      if (v.target === "cabinet") {
        // Play from the intro by keyboard: focus must land in the game.
        await page.evaluate(() => document.getElementById("aboutPlay").focus());
        await page.keyboard.press("Enter");
        await sleep(200);
        const where = await page.evaluate(() => document.activeElement.id);
        if (where !== "gameFrame") notes.push(`Play leaves focus on ${where || "body"}`);
        // Shift+Tab leaves the game for the toolbar (the first press may
        // land on the game's own document).
        let back = "";
        for (let i = 0; i < 3 && back !== "toolbar"; i++) {
          await page.keyboard.press("Shift+Tab");
          back = await page.evaluate(() => document.activeElement.closest(".toolbar") ? "toolbar" : document.activeElement.id || document.activeElement.tagName);
        }
        if (back !== "toolbar") notes.push(`3 × Shift+Tab from the game reaches ${back}, not the toolbar`);
      }
      await ctx.close();
      if (walk.noRing.length) notes.push(`${walk.noRing.length} stops without a visible ring: ${walk.noRing.slice(0, 4).join(", ")}`);
      if (walk.hidden.length) notes.push(`${walk.hidden.length} hidden stops: ${walk.hidden.slice(0, 3).join(", ")}`);
      if (notes.length) return ["fail", notes.join("; ")];
      return ["pass", `${walk.stops} Tab stops, all with a focus ring`];
    });

    // Names.
    await guard(v.target, "label", true, async () => {
      const bad = [];
      await eachState(v, DESK, async (page) => bad.push(...(await page.evaluate(NAMES))));
      return bad.length ? ["fail", `${bad.length} unnamed: ${[...new Set(bad)].slice(0, 5).join(", ")}`] : ["pass", "every control, frame and dialog named; lang set"];
    });

    // Text size at 360 px.
    await guard(v.target, "text", true, async () => {
      const texts = [];
      await eachState(v, PHONE, async (page) => texts.push(...(await page.evaluate(DOM_TEXTS, { full: v.full }))));
      const [verdict, detail] = sizeVerdict(texts);
      return [verdict === "partial" ? "fail" : verdict, detail];
    });
  }
}

// § run

const t0 = Date.now();
try {
  if (doGallery) await auditGallery();
  if (doGames) {
    const queue = [...games];
    await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
      while (queue.length) await auditGame(queue.shift());
    }));
  }
} finally {
  await browser.close();
  server.close();
}

const gal = results.filter((r) => r.gallery && r.verdict === "fail");
const tally = (v) => results.filter((r) => !r.gallery && r.verdict === v).length;
console.log(`${((Date.now() - t0) / 1000).toFixed(0)} s · gallery side: ${gal.length} failing · games: ${tally("pass")} pass, ${tally("partial")} partial, ${tally("fail")} fail`);

if (flag("table")) {
  const cell = (r) => (r ? `${r.verdict}${r.verdict === "pass" ? "" : `: ${r.detail.replace(/\|/g, "/").slice(0, 60)}`}` : "");
  const targets = [...new Set(results.map((r) => r.target))];
  console.log(`\n| | ${CHECKS.join(" | ")} |\n|---|${CHECKS.map(() => "---").join("|")}|`);
  for (const t of targets) console.log(`| ${t} | ${CHECKS.map((c) => cell(results.find((r) => r.target === t && r.check === c))).join(" | ")} |`);
}
process.exit(gal.length ? 1 : 0);
