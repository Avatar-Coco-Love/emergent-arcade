// "Download": builds a ready-to-play copy of one game. It lives in the
// gallery because the game iframe is sandboxed without allow-downloads, and
// games must never depend on the gallery.
//
// The copy is the game file as served, plus an HTML comment header (title,
// version, date, source) and a small shim before </body>. Games only
// announce achievements to a parent frame (`if (window.parent !== window)`),
// so when the copy runs on its own the shim stands in for that parent: it
// hears arcade:achievement messages, saves them in localStorage (same key and
// format as the gallery), and shows a minimal unlock toast. Inside the
// arcade the shim does nothing.
window.ArcadeDownload = (function () {
  // Kept to the rules scripts/validate.mjs applies to game files: no network,
  // no external files, no imports.
  function shim(game) {
    const data = {
      id: game.id,
      achievements: (game.achievements || []).map((a) => ({ id: a.id, title: a.title })),
    };
    // "<" escaped so nothing in a title can close the script tag.
    const json = JSON.stringify(data).replace(/</g, "\\u003c");
    return `
<script>
/* Emergent Arcade standalone shim: saves achievements when this file is opened on its own. */
(function () {
  if (window.parent !== window) return;
  var GAME = ${json};
  var KEY = 'arcade.achievements.' + GAME.id;
  var box = null;
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function toast(text) {
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('role', 'status');
      box.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;max-width:calc(100% - 24px);font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
      document.body.appendChild(box);
    }
    var t = document.createElement('div');
    t.textContent = text;
    t.style.cssText = 'padding:8px 14px;border-radius:10px;background:#16161d;color:#e8e8ee;border:1px solid #ffcc4d;box-shadow:0 6px 24px rgba(0,0,0,.35)';
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }
  function receive(data) {
    if (!data || data.game !== GAME.id || data.type !== 'arcade:achievement') return;
    var a = GAME.achievements.filter(function (x) { return x.id === data.id; })[0];
    if (!a) return;
    var got = load();
    if (got[a.id]) return;
    got[a.id] = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(got)); } catch (e) {}
    toast('\\uD83C\\uDFC6 Achievement unlocked: ' + a.title);
  }
  // Stand in for the parent frame the game expects (arcade:result is ignored).
  var stand = { postMessage: function (data) { receive(data); } };
  try {
    Object.defineProperty(window, 'parent', { configurable: true, get: function () { return stand; } });
  } catch (e) {}
})();
</script>
`;
  }

  function header(game, sourceUrl) {
    const clean = (s) => String(s).replace(/--/g, "-");
    return [
      "<!--",
      `  ${clean(game.title)} v${game.version} (updated ${game.updated})`,
      `  From Emergent Arcade: ${clean(sourceUrl)}`,
      `  Downloaded ${new Date().toISOString().slice(0, 10)}. Plays offline in any browser;`,
      "  achievements are saved in the browser that opens this file.",
      "-->",
    ].join("\n");
  }

  // Game HTML (as served) -> standalone HTML.
  function build(game, html, sourceUrl) {
    let out = html;
    const doctype = /^\s*<!DOCTYPE html>[^\n]*\n?/i.exec(out);
    const head = header(game, sourceUrl) + "\n";
    out = doctype ? doctype[0] + head + out.slice(doctype[0].length) : head + out;
    const at = out.toLowerCase().lastIndexOf("</body>");
    return at >= 0 ? out.slice(0, at) + shim(game) + out.slice(at) : out + shim(game);
  }

  function fileName(game) {
    return `${game.id}-v${game.version}.html`;
  }

  // Fetches the game file and saves the copy. Resolves to the file name.
  async function save(game, sourceUrl) {
    const res = await fetch(`games/${game.file}?v=${game.version}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    window.ArcadeUI.saveFile(fileName(game), build(game, html, sourceUrl), "text/html");
    return fileName(game);
  }

  return { build, save, fileName };
})();
