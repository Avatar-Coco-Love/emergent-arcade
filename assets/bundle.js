// "Download all <topic> games": one zip for offline lab computers (teacher
// idea 5, docs/gallery.md "Topic download"). Inside, a folder
// emergent-arcade-<topic>/ with each game as the same standalone file the
// cabinet's Download makes (assets/download.js) and an index.html that lists
// them and opens each by a relative link, from file:// with no network.
//
// A zip, not several files: one download, no "allow multiple downloads"
// prompt, and the files stay together so the relative links work. Store-only
// (no compression) is a few lines of plain JS and the archive stays small.
window.ArcadeBundle = (function () {
  const Wording = window.ArcadeWording;
  const Topics = window.ArcadeTopics;
  const Download = window.ArcadeDownload;

  // § zip: store-only (method 0), UTF-8 names, no data descriptors.

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // [{ name, data: string | Uint8Array }] (a name ending in "/" is a folder)
  // -> Uint8Array of the whole archive.
  function zip(files, date = new Date()) {
    const enc = new TextEncoder();
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    const locals = [], centrals = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === "string" ? enc.encode(f.data) : f.data || new Uint8Array(0);
      const crc = crc32(data);
      const dir = f.name.endsWith("/");
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true); // version needed: 2.0
      local.setUint16(6, 0x0800, true); // names are UTF-8
      local.setUint16(8, 0, true); // stored
      local.setUint16(10, time, true);
      local.setUint16(12, day, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      locals.push(new Uint8Array(local.buffer), name, data);
      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014b50, true);
      central.setUint16(4, 20, true); // made by: 2.0, MS-DOS attributes
      central.setUint16(6, 20, true);
      central.setUint16(8, 0x0800, true);
      central.setUint16(10, 0, true);
      central.setUint16(12, time, true);
      central.setUint16(14, day, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, data.length, true);
      central.setUint32(24, data.length, true);
      central.setUint16(28, name.length, true);
      central.setUint32(38, dir ? 0x10 : 0, true); // directory attribute
      central.setUint32(42, offset, true);
      centrals.push(new Uint8Array(central.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = centrals.reduce((n, b) => n + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
    const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }

  // § index page: plain HTML and inline CSS, no script, a CSP that allows no
  // network at all. Manifest text keeps both wordings ({tap} -> tap / click)
  // and CSS picks one by the computer's main input, like the gallery.

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function words(s) {
    const touch = Wording.text(s, true), mouse = Wording.text(s, false);
    if (touch === mouse) return esc(touch);
    return `<span class="w-touch">${esc(touch)}</span><span class="w-mouse">${esc(mouse)}</span>`;
  }
  const prose = (v) => (Array.isArray(v) ? v.map(words).join(" ") : words(v || ""));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const CSS = `
:root{--bg:#f4f4f7;--panel:#fff;--text:#16161d;--muted:#5d5d6b;--border:#d9d9e2;--accent:#006fa6;--on-accent:#fff;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b10;--panel:#16161d;--text:#e8e8ee;--muted:#9a9aa5;--border:#2a2a34;--accent:#6fd3ff;--on-accent:#0b0b10;color-scheme:dark}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 32px}
h1{margin:0 0 6px;font-size:1.6rem;line-height:1.2}
h2{margin:0 0 4px;font-size:1.2rem}
a{color:var(--accent)}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.kicker{margin:0 0 2px;font-size:.85rem;color:var(--muted);font-weight:600}
.lede{margin:0 0 10px}
.note{margin:0 0 18px;padding:8px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;font-size:.9rem}
ul.games{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.game{padding:14px 16px;background:var(--panel);border:1px solid var(--border);border-left:5px solid var(--game,var(--accent));border-radius:12px}
.ver{font-size:.85rem;font-weight:400;color:var(--muted)}
.blurb{margin:0 0 8px}
dl{margin:0 0 10px;display:grid;grid-template-columns:7.5em 1fr;gap:4px 12px;font-size:.95rem}
dt{font-weight:700}
dd{margin:0}
@media (max-width:520px){dl{grid-template-columns:1fr}dd{margin-bottom:6px}}
.play{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:8px;background:var(--accent);color:var(--on-accent);font-weight:700;text-decoration:none}
footer{margin-top:24px;font-size:.85rem;color:var(--muted)}
footer p{margin:0 0 6px}
.w-touch{display:none}
@media (pointer:coarse){.w-touch{display:inline}.w-mouse,.keys{display:none}}
`;

  function indexPage(topic, list, files, opts) {
    const n = list.length;
    const items = list.map((g, i) => {
      const keys = g.keyboard ? `<dt class="keys">Keys</dt><dd class="keys">${esc(g.keyboard)}</dd>` : "";
      const topics = Topics.of(g).map((t) => esc(t.label)).join(", ");
      const accent = /^#[0-9a-f]{3,8}$/i.test(g.accent || "") ? ` style="--game:${g.accent}"` : "";
      return `<li class="game"${accent}>
<h2 id="g-${esc(g.id)}">${esc(g.title)} <span class="ver">v${esc(g.version)}</span></h2>
<p class="blurb">${prose(g.blurb)}</p>
<dl>
<dt>Goal</dt><dd>${prose(g.goal)}</dd>
<dt>How to play</dt><dd>${prose(g.howToPlay)}</dd>
${keys}${topics ? `<dt>Topics</dt><dd>${topics}</dd>` : ""}
</dl>
<a class="play" href="${esc(files[i])}">Play ${esc(g.title)}</a>
</li>`;
    }).join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(cap(topic.label))} games · Emergent Arcade offline</title>
<!--
  Emergent Arcade: ${esc(topic.label).replace(/--/g, "-")} games, saved ${opts.date}. ${esc(opts.source).replace(/--/g, "-")}
  (c) 2026 Cody Joshua Clements. MIT License: free to use, copy and change, keep this notice.
  https://github.com/Avatar-Coco-Love/emergent-arcade/blob/main/LICENSE
-->
<style>${CSS}</style>
</head>
<body>
<main>
<p class="kicker">Emergent Arcade · offline copy</p>
<h1>${esc(cap(topic.label))} games</h1>
<p class="lede">${esc(topic.about)} ${n} ${n === 1 ? "game" : "games"}, saved ${opts.date}. Each one is a single file in this folder that plays in this browser with no network. Keep the files together.</p>
<p class="note">Offline, nothing is sent: no scores, leaderboards or play stats. Achievements are kept only in the browser that opens the game.</p>
<ul class="games">
${items}
</ul>
<footer>
<p>More games, updates and the teacher guide: <a href="${esc(opts.site)}">Emergent Arcade</a> (online).</p>
<p>&copy; 2026 Cody Joshua Clements. MIT License: free to use, copy and change, keep the notice.</p>
</footer>
</main>
</body>
</html>
`;
  }

  // § build and save

  // Playable games with the topic, by title.
  const gamesOf = (manifest, topicId) =>
    manifest.filter((g) => g.status !== "archived" && (g.topics || []).includes(topicId)).sort((a, b) => a.title.localeCompare(b.title));

  const folder = (topicId) => `emergent-arcade-${topicId}`;
  const fileName = (topicId, date) => `${folder(topicId)}-${date}.zip`;

  // Fetches the raw manifest (both wordings) and every game file, then
  // builds the archive. Resolves to { name, bytes, games }.
  async function build(topicId, now = new Date()) {
    const topic = Topics.get(topicId);
    if (!topic) throw new Error(`unknown topic ${topicId}`);
    const res = await fetch("games/games.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = gamesOf((await res.json()).games || [], topicId);
    if (!list.length) throw new Error(`no games tagged ${topic.label}`);
    const html = await Promise.all(list.map((g) => Download.fetchHtml(g)));
    const dir = folder(topicId) + "/";
    const names = list.map((g) => Download.fileName(g));
    const date = now.toISOString().slice(0, 10);
    const config = window.ARCADE_CONFIG || {};
    const site = config.siteUrl || `${location.origin}${location.pathname}`;
    const files = [
      { name: dir },
      { name: dir + "index.html", data: indexPage(topic, list, names, { date, site, source: `${site}#/?topic=${topicId}` }) },
      // The cabinet's own standalone copy, worded for this device like its Download.
      ...list.map((g, i) => ({ name: dir + names[i], data: Download.build(Wording.game(g), html[i], Download.playUrl(g)) })),
    ];
    return { name: fileName(topicId, date), bytes: zip(files, now), games: list };
  }

  async function save(topicId) {
    const out = await build(topicId);
    window.ArcadeUI.saveFile(out.name, out.bytes, "application/zip");
    return out;
  }

  const kb = (n) => `${Math.max(1, Math.round(n / 1024))} KB`;

  // A "Download all" button's click: busy state, a status line, telemetry.
  async function run(btn, statusEl, topicId, from) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    statusEl.className = "status bundle-status";
    statusEl.textContent = "Preparing the zip…";
    try {
      const out = await save(topicId);
      statusEl.textContent = `Saved ${out.name} (${out.games.length} ${out.games.length === 1 ? "game" : "games"}, ${kb(out.bytes.length)}). Unzip it, then open index.html.`;
      statusEl.className = "status bundle-status ok";
      window.ArcadeTelemetry.event("download_topic", { topic: topicId, games: out.games.length, from });
    } catch (err) {
      statusEl.textContent = `Couldn't make the zip (${err.message}).`;
      statusEl.className = "status bundle-status err";
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  }

  return { crc32, zip, indexPage, gamesOf, fileName, build, save, run };
})();
