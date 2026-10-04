#!/usr/bin/env node
// Writes <out>/play/<id>/index.html for every game: a tiny page whose
// Open Graph tags give Facebook and Messenger that game's preview card, and
// which forwards people to the gallery's #/play/<id>. Needed because link
// previews ignore everything after "#", so every #/play/<id> link would
// otherwise show the same arcade card. Runs at deploy (pages.yml).
// Usage: node scripts/build-share-pages.mjs <site dir>
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root, manifest, siteUrl, ogImage } from "./site.mjs";

const out = process.argv[2];
if (!out) {
  console.error("Usage: node scripts/build-share-pages.mjs <site dir>");
  process.exit(1);
}
if (!siteUrl) {
  console.error("assets/config.js has no siteUrl");
  process.exit(1);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let n = 0;
for (const g of manifest.games) {
  if (!existsSync(join(root, ogImage(g.id)))) {
    console.error(`missing ${ogImage(g.id)} (run node scripts/make-og-images.mjs)`);
    process.exit(1);
  }
  const url = `${siteUrl}play/${g.id}/`;
  const title = `${g.title} · Emergent Arcade`;
  // ?v= makes Facebook fetch a fresh image when a revision redraws it.
  const image = `${siteUrl}${ogImage(g.id)}?v=${g.version}`;
  const target = `../../#/play/${g.id}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(g.blurb)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Emergent Arcade">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(g.blurb)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(g.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0b10">
<script>location.replace(${JSON.stringify(target)});</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b10;color:#e8e8ee;font:18px system-ui,sans-serif}a{color:#6fd3ff}</style>
</head>
<body>
<p><a href="${esc(target)}">Play ${esc(g.title)}</a></p>
</body>
</html>
`;
  mkdirSync(join(out, "play", g.id), { recursive: true });
  writeFileSync(join(out, "play", g.id, "index.html"), html);
  n++;
}
// The Daily Challenge link (docs/daily.md): the arcade's card, then #/daily.
// Which game is today's is decided in the browser, so the preview stays general.
{
  const url = `${siteUrl}daily/`;
  const title = "Daily Challenge · Emergent Arcade";
  const blurb = "One game a day, the same run for everyone. Your first run counts. Can you beat my result?";
  const image = `${siteUrl}assets/og/arcade.png`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(blurb)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Emergent Arcade">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(blurb)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Emergent Arcade">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0b10">
<script>location.replace("../#/daily");</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b10;color:#e8e8ee;font:18px system-ui,sans-serif}a{color:#6fd3ff}</style>
</head>
<body>
<p><a href="../#/daily">Play today's Daily Challenge</a></p>
</body>
</html>
`;
  mkdirSync(join(out, "daily"), { recursive: true });
  writeFileSync(join(out, "daily", "index.html"), html);
}
console.log(`share pages: ${n} written to ${join(out, "play")}/, plus daily/`);
