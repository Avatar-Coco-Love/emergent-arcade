// The Daily Challenge (docs/daily.md): one featured game a day, the same
// seeded run for everyone, so a day's players all meet the same levels.
// This file picks the day's game, keeps this browser's daily results, and
// draws the shareable result card. The pick is also run by Node
// (scripts/daily.mjs), so the leaderboard builder agrees on which game a
// date belongs to.
//
// A game joins the rotation with `"daily": { "from": "YYYY-MM-DD" }` in its
// manifest entry. The gallery opens it as games/<file>?daily=<date>; the game
// seeds its run from the game id and the date, adds `daily: <date>` to every
// arcade:result of that run, and posts arcade:final when the run is over.
//
// Storage: arcade.daily = { "<date>": { game, run, cur, runs, first, marks,
// done, best } }, the last 60 days. `first` is the score of the first run of
// the day (the one that counts), `marks` one 🟩/🟥 per level of that run.
window.ArcadeDaily = (function () {
  const START = "2026-10-04"; // Daily #1
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const KEEP_DAYS = 60;
  const MAX_MARKS = 24;
  const KEY = "arcade.daily";

  // ---------- dates and the pick (pure: also run in Node) ----------

  function utc(date) {
    const [y, m, d] = date.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  }
  const dayNumber = (date) => Math.round((utc(date) - utc(START)) / 864e5);
  const number = (date) => dayNumber(date) + 1;
  function addDays(date, n) {
    return new Date(utc(date) + n * 864e5).toISOString().slice(0, 10);
  }
  // The player's own calendar day: a new daily at their midnight.
  function today(now) {
    const d = now || new Date();
    const pad = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function hash32(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
    return h;
  }

  // Games that can be the daily on `date`, sorted by id.
  function pool(games, date) {
    return games
      .filter((g) => g.daily && DATE.test(String(g.daily.from || "")) && g.daily.from <= date && g.status !== "archived")
      .map((g) => g.id)
      .sort();
  }

  // One shuffled order per cycle of n days, so every game comes round once
  // per cycle. A cycle never starts with the game that ended the last one.
  function order(ids, cycle) {
    const out = ids.slice();
    let s = hash32(`daily-cycle:${cycle}:${ids.join(",")}`);
    for (let i = out.length - 1; i > 0; i--) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      const j = s % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function cycleOrder(ids, cycle) {
    if (ids.length <= 2) return ids.slice(); // two games just take turns
    // (n ≥ 3: a swap never moves a cycle's last game, so checking the raw
    // order of the cycle before is enough.)
    const now = order(ids, cycle);
    const before = order(ids, cycle - 1);
    if (now.length > 1 && now[0] === before[before.length - 1]) [now[0], now[1]] = [now[1], now[0]];
    return now;
  }

  // A real calendar day (a challenge's date-shaped code is not one).
  const calendar = (date) => DATE.test(date || "") && addDays(date, 0) === date;

  // The game id for `date`, or null when no game is in the rotation.
  function pick(games, date) {
    if (!calendar(date)) return null;
    const ids = pool(games, date);
    if (!ids.length) return null;
    const day = dayNumber(date);
    const n = ids.length;
    return cycleOrder(ids, Math.floor(day / n))[((day % n) + n) % n];
  }

  // ---------- this browser's results ----------

  const store = () => window.ArcadeUI.store;
  const scores = () => window.ArcadeScores;

  function load() {
    const all = store().json(KEY, {});
    return all && typeof all === "object" ? all : {};
  }
  function save(all) {
    const keep = Object.keys(all).filter((d) => DATE.test(d)).sort().slice(-KEEP_DAYS);
    const out = {};
    for (const d of keep) out[d] = all[d];
    store().set(KEY, JSON.stringify(out));
  }
  const day = (date) => load()[date] || null;

  // A result from the daily cabinet. -> { first, value, day } or null when it
  // isn't the day's daily. `first`: the round belongs to the run that counts.
  // `all[slot]` is the run's entry; `tag` is the game's ?daily= value.
  function track(all, slot, tag, game, msg) {
    if (!msg || msg.daily !== tag || !/^[a-z0-9]{1,16}$/.test(String(msg.run || ""))) return null;
    let d = all[slot];
    if (d && d.game !== game.id) return null;
    if (!d) d = all[slot] = { game: game.id, run: msg.run, cur: msg.run, runs: 1, first: null, marks: "", done: false, best: null };
    if (msg.run !== d.cur) {
      d.cur = msg.run;
      d.runs++;
      d.done = true; // a new run: the first one is over, whatever it reached
    }
    const first = msg.run === d.run && !d.done;
    const got = scores().fromResult(game, msg);
    const value = got ? got.value : null;
    if (first) {
      if ([...d.marks].length < MAX_MARKS) d.marks += msg.outcome === "win" ? "🟩" : "🟥";
      if (value != null) d.first = value;
    }
    const sp = scores().spec(game);
    if (value != null && sp && scores().beats(sp, value, d.best)) d.best = value;
    return { first, value, day: d };
  }
  function record(game, date, msg) {
    const all = load();
    const got = track(all, date, date, game, msg);
    if (got) save(all);
    return got;
  }

  // arcade:final. -> the entry when this ends the run that counts, else null.
  function close(all, slot, tag, game, msg) {
    if (!msg || msg.daily !== tag) return null;
    const d = all[slot];
    if (!d || d.game !== game.id || d.done || msg.run !== d.run) return null;
    d.done = true;
    const v = Number(msg.score);
    const sp = scores().spec(game);
    if (Number.isFinite(v) && v >= 0 && sp && v <= sp.max) d.first = Math.round(v * 10) / 10;
    return d;
  }
  function finish(game, date, msg) {
    const all = load();
    const d = close(all, date, date, game, msg);
    if (d) save(all);
    return d;
  }

  // Days in a row with a daily played, ending today (or yesterday, if today's
  // isn't played yet, so the streak doesn't look lost in the morning).
  function streak(date) {
    const all = load();
    let d = all[date] ? date : addDays(date, -1);
    let n = 0;
    while (all[d] && all[d].run) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }

  // Export/import: a day already in this browser is kept as it is.
  function exportData() {
    return load();
  }
  function merge(incoming) {
    if (!incoming || typeof incoming !== "object") return;
    const all = load();
    for (const [date, d] of Object.entries(incoming)) {
      if (!DATE.test(date) || all[date] || !d || typeof d !== "object") continue;
      if (!/^[a-z0-9-]{1,64}$/.test(String(d.game || ""))) continue;
      all[date] = {
        game: d.game, run: String(d.run || "x"), cur: String(d.cur || d.run || "x"), runs: Number(d.runs) || 1,
        first: Number.isFinite(d.first) ? d.first : null, marks: String(d.marks || "").replace(/[^🟩🟥]/gu, "").slice(0, MAX_MARKS * 2),
        done: true, best: Number.isFinite(d.best) ? d.best : null,
      };
    }
    save(all);
  }

  // ---------- class challenges ----------

  // A code is 5 characters from 31 that can't be misread aloud or on a
  // board (no i, l, o, 0, 1): 28.6 million codes. Links carry it in lower
  // case; it's shown in upper case ("K7M2Q").
  const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
  const CODE = /^[a-hjkmnp-z2-9]{5}$/;
  const CH_KEY = "arcade.challenge";
  const CH_KEEP = 40;
  const isCode = (code) => CODE.test(String(code || ""));
  function newCode() {
    const r = new Uint32Array(5);
    crypto.getRandomValues(r);
    return [...r].map((x) => ALPHABET[x % ALPHABET.length]).join("");
  }

  // The code as the game's ?daily= value, so the game needs no change: the
  // code's number (base 31) written as a date whose month is 13–99, e.g.
  // "0001-17-02". Games seed from GAME_ID + ":" + this, like a Daily. One
  // code always gives the same string, two codes never share one, and no
  // calendar day has month 13+, so a challenge never replays a Daily's run
  // and pick() (and with it the daily board) ignores it.
  function challengeDate(code) {
    let n = 0;
    for (const ch of code) n = n * ALPHABET.length + ALPHABET.indexOf(ch);
    const month = 13 + (n % 87);
    n = Math.floor(n / 87);
    return `${String(Math.floor(n / 100)).padStart(4, "0")}-${month}-${String(n % 100).padStart(2, "0")}`;
  }

  function chLoad() {
    const all = store().json(CH_KEY, {});
    return all && typeof all === "object" ? all : {};
  }
  function chSave(all) {
    const keep = Object.keys(all).filter((k) => /^[a-z0-9-]{1,64}\/[a-z2-9]{5}$/.test(k)).sort((a, b) => (all[a].at || 0) - (all[b].at || 0)).slice(-CH_KEEP);
    const out = {};
    for (const k of keep) out[k] = all[k];
    store().set(CH_KEY, JSON.stringify(out));
  }
  const challengeDay = (gameId, code) => chLoad()[`${gameId}/${code}`] || null;
  // Like record() and finish(): the first run on this browser counts.
  function challengeRecord(game, code, msg) {
    const all = chLoad();
    const got = track(all, `${game.id}/${code}`, challengeDate(code), game, msg);
    if (!got) return null;
    got.day.at = Date.now();
    got.day.date = got.day.date || today();
    chSave(all);
    return got;
  }
  function challengeFinish(game, code, msg) {
    const all = chLoad();
    const d = close(all, `${game.id}/${code}`, challengeDate(code), game, msg);
    if (d) chSave(all);
    return d;
  }

  // ---------- the published board (leaderboards.json `daily`) ----------

  // { game, n, top: [{ h, p, s, at }] } for a date, or null.
  function board(data, date) {
    const b = data && data.daily && data.daily[date];
    return b && Array.isArray(b.top) ? b : null;
  }

  // ---------- sharing ----------

  // The published site when we're on it, else this page.
  function base() {
    const site = (window.ARCADE_CONFIG || {}).siteUrl;
    const here = `${location.origin}${location.pathname}`;
    return site && here.startsWith(site) ? site : null;
  }
  function shareUrl() {
    return base() ? `${base()}daily/` : `${location.origin}${location.pathname}#/daily`;
  }
  // A class challenge's link; `classroom` adds ?class=1 (docs/gallery.md).
  function challengeUrl(gameId, code, classroom) {
    return `${base() || `${location.origin}${location.pathname}`}${classroom ? "?class=1" : ""}#/challenge/${gameId}/${code}`;
  }
  const codeLabel = (code) => code.toUpperCase();

  // "Sat, Oct 4"
  function longDate(date) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  // `code`: a class challenge's card (date is then the day it was played).
  function shareText(game, date, d, code) {
    const sp = scores().spec(game);
    const lines = [code ? `Emergent Arcade class challenge ${codeLabel(code)} · ${game.title}` : `Emergent Arcade Daily #${number(date)} · ${game.title}`];
    lines.push(d.first != null ? `${sp.label}: ${scores().format(sp, d.first)}` : "No score this time");
    if (d.marks) lines.push(d.marks);
    const n = code ? 0 : streak(date);
    if (n > 1) lines.push(`🔥 ${n} days in a row`);
    return lines.join("\n");
  }

  // The result card as a PNG blob (1080×1080): arcade name, daily number and
  // date, the game's card art, the score, the run's marks and the streak.
  // Marks are drawn as squares, not emoji, so they look the same everywhere.
  // A class challenge's card says "Challenge K7M2Q", with no streak.
  async function cardBlob(game, date, d, code) {
    const S = 1080;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const g = c.getContext("2d");
    const accent = game.accent || "#6fd3ff";
    const font = (w, px) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.fillStyle = "#0b0b10";
    g.fillRect(0, 0, S, S);
    g.fillStyle = accent;
    g.fillRect(0, 0, S, 14);

    g.textBaseline = "alphabetic";
    g.fillStyle = "#9a9aae";
    g.font = font(600, 34);
    g.fillText("EMERGENT ARCADE", 80, 110);
    g.textAlign = "right";
    g.fillText(longDate(date), S - 80, 110);
    g.textAlign = "left";
    g.fillStyle = accent;
    g.font = font(800, 76);
    g.fillText(code ? `Challenge ${codeLabel(code)}` : `Daily #${number(date)}`, 80, 200);

    // Card art.
    const art = window.ArcadeThumbs && window.ArcadeThumbs[game.id];
    const ART = 300;
    const ax = 80;
    const ay = 250;
    g.fillStyle = "#16161f";
    g.fillRect(ax, ay, ART, ART);
    if (art) {
      try {
        const url = URL.createObjectURL(new Blob([art()], { type: "image/svg+xml" }));
        const img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
        g.imageSmoothingEnabled = true;
        g.drawImage(img, ax, ay, ART, ART);
        URL.revokeObjectURL(url);
      } catch (_) { /* the card still works without art */ }
    }

    // Title and score, right of the art.
    const tx = ax + ART + 50;
    const tw = S - 80 - tx;
    const fit = (text, weight, px) => {
      g.font = font(weight, px);
      while (px > 28 && g.measureText(text).width > tw) g.font = font(weight, (px -= 4));
    };
    g.fillStyle = "#e8e8ee";
    fit(game.title, 800, 64);
    g.fillText(game.title, tx, ay + 70);
    const sp = scores().spec(game);
    g.fillStyle = "#9a9aae";
    fit(sp.label, 600, 38);
    g.fillText(sp.label, tx, ay + 150);
    g.fillStyle = "#ffffff";
    const value = d.first != null ? scores().format(sp, d.first) : "–";
    fit(value, 800, 150);
    g.fillText(value, tx, ay + 290);

    // Marks: one square per level of the counted run.
    const marks = [...(d.marks || "")];
    if (marks.length) {
      const per = 12;
      const box = Math.min(64, Math.floor((S - 160 - (per - 1) * 14) / per));
      marks.forEach((m, i) => {
        const x = 80 + (i % per) * (box + 14);
        const y = 640 + Math.floor(i / per) * (box + 14);
        g.fillStyle = m === "🟩" ? "#4fc26b" : "#e0574f";
        g.beginPath();
        if (g.roundRect) g.roundRect(x, y, box, box, 10);
        else g.rect(x, y, box, box);
        g.fill();
      });
    }

    const n = code ? 0 : streak(date);
    g.fillStyle = "#e8e8ee";
    g.font = font(700, 44);
    if (n > 1) g.fillText(`🔥 ${n} days in a row`, 80, 860);
    g.fillStyle = "#9a9aae";
    g.font = font(500, 34);
    g.fillText(code ? "Same run for the whole class. Can you beat it?" : "Same run for everyone today. Can you beat it?", 80, 940);
    g.fillStyle = accent;
    const link = (code ? challengeUrl(game.id, code) : shareUrl()).replace(/^https?:\/\//, "");
    fitAt(g, link, 700, 34, S - 160, font);
    g.fillText(link, 80, 1000);

    return new Promise((ok) => c.toBlob((b) => ok(b), "image/png"));
  }

  function fitAt(g, text, weight, px, width, font) {
    g.font = font(weight, px);
    while (px > 20 && g.measureText(text).width > width) g.font = font(weight, (px -= 2));
  }

  // Share sheet with the image where the browser can, else the text and
  // link via ArcadeUI.share. Resolves to the method used, or null.
  async function share(game, date, d, toast, code) {
    const text = shareText(game, date, d, code);
    const url = code ? challengeUrl(game.id, code) : shareUrl();
    const fileName = code ? `challenge-${code}-${game.id}.png` : `daily-${number(date)}-${game.id}.png`;
    if (navigator.share && navigator.canShare && window.ArcadeUI.touch()) {
      try {
        const blob = await cardBlob(game, date, d, code);
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: `${text}\n${url}` });
          return "share-image";
        }
      } catch (err) {
        if (err && err.name === "AbortError") return null;
      }
    }
    if (navigator.share && window.ArcadeUI.touch()) {
      try {
        await navigator.share({ text, url });
        return "share";
      } catch (err) {
        if (err && err.name === "AbortError") return null;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast("Result copied: paste it anywhere");
      return "copy";
    } catch (_) {
      window.prompt("Copy your result:", `${text}\n${url}`);
      return "prompt";
    }
  }

  async function saveImage(game, date, d, code) {
    const blob = await cardBlob(game, date, d, code);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = code ? `challenge-${code}-${game.id}.png` : `daily-${number(date)}-${game.id}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  return {
    START, today, number, addDays, longDate, pick, pool, hash32, calendar,
    load, day, record, finish, streak, exportData, merge, board,
    isCode, newCode, challengeDate, codeLabel, challengeDay, challengeRecord, challengeFinish, challengeUrl,
    shareUrl, shareText, cardBlob, share, saveImage,
  };
})();
