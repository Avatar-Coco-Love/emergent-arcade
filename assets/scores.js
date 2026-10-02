// Scores, personal bests and leaderboards, for every game through its
// manifest (docs/scores.md). A game's `score` entry in games/games.json says
// what its number is and where to read it in an arcade:result message:
//
//   "score": { "label": "eruptions", "better": "higher", "from": "stats.eruptions" }
//
// A game can also post its own `score` (and `board`) in arcade:result, which
// wins over `from`. The gallery keeps each browser's best per board in
// localStorage, shows it in the cabinet, and sends it with the telemetry
// round row; scripts/build-leaderboards.mjs turns those rows into the public
// leaderboards.json at deploy (hourly). Also run by Node scripts through
// scripts/scores.mjs, so the rules live in one place.
window.ArcadeScores = (function () {
  const BOARD = /^[a-z0-9-]{1,24}$/;
  const FROM = /^(score|time|level|stats\.[a-z][a-z0-9_]{0,15})$/;

  // Random public names are made from these two lists. A player can also
  // type a name (assets/names.js, checked again by the builder); it shows
  // with a tag, and this random one stays as the fallback. Append words;
  // never reorder them (a handle's default is its position in the lists).
  const ADJ = ["Amber", "Brisk", "Coral", "Dusky", "Ember", "Fern", "Gilded", "Hazel",
    "Indigo", "Jade", "Keen", "Lunar", "Mossy", "Nimble", "Ochre", "Pearl",
    "Quiet", "Russet", "Sable", "Tidal", "Umber", "Velvet", "Windy", "Young",
    "Zesty", "Bright", "Cloudy", "Dappled", "Frosty", "Glassy", "Humming", "Misty"];
  const NOUN = ["Otter", "Heron", "Badger", "Comet", "Finch", "Gecko", "Hare", "Ibis",
    "Jackal", "Koi", "Lynx", "Moth", "Newt", "Owl", "Puffin", "Quail",
    "Raven", "Seal", "Tern", "Urchin", "Vole", "Wren", "Yak", "Zebu",
    "Beetle", "Crane", "Dingo", "Egret", "Ferret", "Gull", "Marten", "Plover"];

  // FNV-1a, 2 × 32 bits. The same in the browser and in Node, so the
  // leaderboard can mark "you" without ever publishing the client id.
  function hash(text) {
    let a = 0x811c9dc5;
    let b = 0x01000193 ^ 0x5bd1e995;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193) >>> 0;
      b = Math.imul(b ^ c, 0x01000193 + 2 * i + 1) >>> 0;
    }
    return a.toString(36).padStart(7, "0") + b.toString(36).padStart(7, "0");
  }

  function defaultHandle(clientId) {
    const h = hash(`handle:${clientId}`);
    const n = parseInt(h.slice(0, 7), 36);
    return `${ADJ[n % ADJ.length]} ${NOUN[Math.floor(n / ADJ.length) % NOUN.length]}`;
  }

  function isHandle(text) {
    const m = /^([A-Z][a-z]+) ([A-Z][a-z]+)$/.exec(String(text || ""));
    return !!m && ADJ.includes(m[1]) && NOUN.includes(m[2]);
  }

  function randomHandle() {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    return `${pick(ADJ)} ${pick(NOUN)}`;
  }

  // The manifest entry with defaults filled in, or null.
  function spec(game) {
    const s = game && game.score;
    if (!s || typeof s !== "object") return null;
    return {
      label: String(s.label || "points"),
      better: s.better === "lower" ? "lower" : "higher",
      format: s.format === "time" ? "time" : "count",
      from: FROM.test(s.from || "") ? s.from : "score",
      wins: !!s.wins,
      boards: s.boards === "level" || s.boards === "level_id" ? s.boards : "",
      epoch: Number.isInteger(s.epoch) && s.epoch > 0 ? s.epoch : 1,
      max: Number(s.max) > 0 ? Number(s.max) : Infinity,
    };
  }

  // arcade:result -> { board, value } or null (no score for this round).
  function fromResult(game, msg) {
    const sp = spec(game);
    if (!sp || !msg) return null;
    if (sp.wins && msg.outcome !== "win") return null;
    let value;
    if (typeof msg.score === "number") value = msg.score;
    else {
      if (sp.from === "time") value = msg.time;
      else if (sp.from === "level") value = msg.level;
      else if (sp.from.startsWith("stats.")) value = msg.stats && msg.stats[sp.from.slice(6)];
    }
    value = Number(value);
    if (!Number.isFinite(value) || value < 0 || value > sp.max) return null;
    value = Math.round(value * 10) / 10;
    let board = "main";
    if (BOARD.test(String(msg.board || ""))) board = msg.board;
    else if (sp.boards === "level_id" && BOARD.test(String(msg.level_id || ""))) board = msg.level_id;
    else if (sp.boards === "level" && Number.isInteger(msg.level)) board = `level-${msg.level}`;
    return { board, value };
  }

  const beats = (sp, a, b) => b == null || (sp.better === "lower" ? a < b : a > b);

  function format(sp, value) {
    if (value == null) return "–";
    if (sp.format === "time") {
      if (value < 60) return `${value.toFixed(1)} s`;
      const m = Math.floor(value / 60);
      return `${m}:${(value - 60 * m).toFixed(1).padStart(4, "0")}`;
    }
    return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toFixed(1);
  }

  // "first-turn" -> "First turn", "level-3" -> "Level 3", "main" -> "".
  function boardName(board) {
    if (board === "main") return "";
    const t = board.replace(/-/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ---------- per-browser bests (browser only) ----------

  const store = () => window.ArcadeUI.store;
  const key = (id) => `arcade.best.${id}`;

  // -> { "e<epoch>:<board>": { score, at, version } }
  function load(id) {
    const all = store().json(key(id), {});
    return all && typeof all === "object" && !Array.isArray(all) ? all : {};
  }

  // The current epoch's bests, { board: { score, at, version } }.
  function bests(game) {
    const sp = spec(game);
    if (!sp) return {};
    const out = {};
    const prefix = `e${sp.epoch}:`;
    for (const [k, v] of Object.entries(load(game.id))) {
      if (k.startsWith(prefix) && v && typeof v.score === "number") out[k.slice(prefix.length)] = v;
    }
    return out;
  }

  // Records a round. -> { board, value, prev, isBest } or null.
  function record(game, msg) {
    const got = fromResult(game, msg);
    if (!got) return null;
    const sp = spec(game);
    const all = load(game.id);
    const k = `e${sp.epoch}:${got.board}`;
    const prev = all[k] ? all[k].score : null;
    const isBest = beats(sp, got.value, prev);
    if (isBest) {
      all[k] = { score: got.value, at: new Date().toISOString(), version: game.version };
      store().set(key(game.id), JSON.stringify(all));
    }
    return Object.assign(got, { prev, isBest });
  }

  // Import merges: the better score per board wins.
  function merge(gameId, incoming, game) {
    const sp = spec(game) || { better: "higher" };
    const all = load(gameId);
    let fresh = 0;
    for (const [k, v] of Object.entries(incoming || {})) {
      if (!/^e\d{1,4}:[a-z0-9-]{1,24}$/.test(k) || !v || typeof v.score !== "number" || !Number.isFinite(v.score)) continue;
      if (all[k] && !beats(sp, v.score, all[k].score)) continue;
      all[k] = { score: v.score, at: String(v.at || ""), version: Number(v.version) || 0 };
      fresh++;
    }
    if (fresh) store().set(key(gameId), JSON.stringify(all));
    return fresh;
  }

  // ---------- public name ----------

  function handle() {
    const saved = store().get("arcade.handle");
    return isHandle(saved) ? saved : defaultHandle(window.ArcadeFeedback.clientId());
  }

  // "Pick another name": a new random name, and no typed one.
  function newHandle() {
    let h = randomHandle();
    while (h === handle()) h = randomHandle();
    store().set("arcade.handle", h);
    store().remove("arcade.name");
    return h;
  }

  // The typed name, cleaned, or "" (the random one is used).
  function typedName() {
    const N = window.ArcadeNames;
    return N ? N.clean(store().get("arcade.name") || "").slice(0, 32) : "";
  }

  function setTypedName(text) {
    const n = window.ArcadeNames.clean(text);
    if (n) store().set("arcade.name", n);
    else store().remove("arcade.name");
  }

  // Who holds a typed name, by its key, in leaderboards.json's `names`
  // block (built by scripts/build-leaderboards.mjs): a player hash or "".
  function nameOwner(data, nameKey) {
    const book = data && data.names && typeof data.names === "object" ? data.names : {};
    for (const [p, c] of Object.entries(book)) {
      if (c && typeof c.n === "string" && window.ArcadeNames.key(c.n) === nameKey) return p;
    }
    return "";
  }

  // The name the leaderboard shows: "Coco ·4F2A" for a typed name (unless
  // the published file says another player holds it), else the random one.
  function publicName(data) {
    const n = typedName();
    if (!n) return handle();
    const owner = nameOwner(data, window.ArcadeNames.key(n));
    return owner && owner !== me() ? handle() : window.ArcadeNames.display(n, me());
  }

  // The word lists for instant feedback (the builder checks again):
  // { reserved, blocked }, or {} offline.
  let listsPromise = null;
  function nameLists() {
    if (!listsPromise) {
      const get = (file) => fetch(file, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      listsPromise = Promise.all([get("assets/name-reserved.json"), get("assets/name-blocked.json")])
        .then(([reserved, blocked]) => ({ reserved, blocked }));
    }
    return listsPromise;
  }

  const listed = () => store().get("arcade.leaderboardOptOut") !== "1";
  function setListed(on) {
    if (on) store().remove("arcade.leaderboardOptOut");
    else store().set("arcade.leaderboardOptOut", "1");
  }

  const me = () => hash(`player:${window.ArcadeFeedback.clientId()}`);

  // ---------- leaderboards.json (built at deploy) ----------

  let boardsPromise = null;
  function leaderboards() {
    if (!boardsPromise) {
      boardsPromise = fetch("leaderboards.json", { cache: "no-cache" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => (data && data.format === "emergent-arcade-leaderboards" ? data : null))
        .catch(() => null);
    }
    return boardsPromise;
  }

  // Top entries of one board of the current epoch: [{ h, p, s, at, v }].
  function top(data, game, board) {
    const sp = spec(game);
    const g = data && data.games && data.games[game.id];
    if (!sp || !g || g.epoch !== sp.epoch || !g.boards) return [];
    return Array.isArray(g.boards[board]) ? g.boards[board] : [];
  }

  // Play counts of a game from leaderboards.json (built hourly from session
  // rows, docs/scores.md): { total, current, since, versions: [[v, n]] } with
  // every version 1..current, or null when the file has no counts (an old
  // file, offline, a standalone copy). Versions newer than the manifest
  // (a stale gallery) are left out.
  function plays(data, game) {
    const p = data && data.plays;
    if (!p || !p.games || typeof p.games !== "object") return null;
    const counts = p.games[game.id] || {};
    const versions = [];
    let total = 0;
    for (let v = 1; v <= game.version; v++) {
      const n = Math.max(0, Math.floor(Number(counts[v]) || 0));
      versions.push([v, n]);
      total += n;
    }
    const last = versions[versions.length - 1];
    return { total, current: last ? last[1] : 0, since: String(p.since || ""), versions };
  }

  // "18", "1,240", "12k": compact past 9,999 so a card line stays short.
  function count(n) {
    return n >= 10000
      ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n).toLowerCase()
      : n.toLocaleString("en-US");
  }

  // Where a score would place on a board (1-based).
  function rank(game, entries, value) {
    const sp = spec(game);
    const mine = me();
    return entries.filter((e) => e.p !== mine && beats(sp, e.s, value)).length + 1;
  }

  // The boards a game shows in Records, in order: "main" for a one-board
  // game, the manifest's boardList, boards this browser has a best on, and
  // (with data) boards someone published a score on.
  function boardsOf(game, data) {
    const sp = spec(game);
    if (!sp) return [];
    const boards = new Set(sp.boards ? [] : ["main"]);
    for (const b of (game.score && game.score.boardList) || []) boards.add(b);
    for (const b of Object.keys(bests(game))) boards.add(b);
    const g = data && data.games && data.games[game.id];
    if (g && g.epoch === sp.epoch && g.boards) for (const b of Object.keys(g.boards)) if (BOARD.test(b)) boards.add(b);
    return [...boards];
  }

  // The board a game leads with in the gallery's Records view: the one with
  // the most published scores (ties: list order), else one this browser has
  // a best on, else the first.
  function headline(data, game) {
    const boards = boardsOf(game, data);
    let pick = null;
    let most = 0;
    for (const b of boards) {
      const n = top(data, game, b).length;
      if (n > most) { pick = b; most = n; }
    }
    if (pick) return pick;
    const mine = bests(game);
    return boards.find((b) => mine[b]) || boards[0] || null;
  }

  // One board's standings: the published entries, with this browser's best
  // merged in right away (the file only catches up at the next hourly
  // build). `sending` = listed and play stats on; otherwise this browser's
  // published row is left as is and nothing is added.
  // -> { rows: [{ h, s, place, me? }] best first, mine: that row or null }
  function standings(data, game, board, sending) {
    const sp = spec(game);
    const id = me();
    const published = top(data, game, board);
    const rows = published.filter((e) => !(sending && e.p === id)).map((e) => ({ h: e.h, s: e.s }));
    const best = bests(game)[board];
    const pub = published.find((e) => e.p === id);
    let mine = null;
    if (sending && (best || pub)) {
      const s = best && (!pub || beats(sp, best.score, pub.s)) ? best.score : pub.s;
      mine = { h: publicName(data), s, me: true };
      rows.push(mine);
    }
    rows.sort((a, b) => (a.s === b.s ? 0 : beats(sp, a.s, b.s) ? -1 : 1));
    let prev = null;
    let place = 0;
    rows.forEach((e, i) => {
      if (e.s !== prev) place = i + 1;
      prev = e.s;
      e.place = place;
    });
    return { rows, mine };
  }

  return {
    ADJ, NOUN, hash, defaultHandle, isHandle, spec, fromResult, beats, format, boardName,
    load, bests, record, merge, handle, newHandle, typedName, setTypedName, nameOwner, publicName, nameLists,
    listed, setListed, me, leaderboards, top, rank, plays, count, boardsOf, headline, standings,
  };
})();
