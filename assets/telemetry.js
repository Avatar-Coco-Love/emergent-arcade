// Anonymous play telemetry. The gallery keeps one "session" per visit to a
// game's cabinet and sends it to the same Apps Script as feedback, which
// stores it in the "telemetry" tab (see docs/telemetry.md).
//
//   start(game)        cabinet opened (or the tab came back into view)
//   pause() / resume() a panel covers the game, or it's uncovered
//   result(msg)        the game posted { type: "arcade:result", outcome, time }
//                      (optionally level, run, attempt, reason, stats: see
//                      docs/telemetry.md)
//   achievement(id)    a new achievement was unlocked this session
//   end()              cabinet closed, game switched, or the tab was hidden
//   event(action, f)   a gallery-level action (card opened, share, download,
//                      sort/filter, settings), sent as a kind "gallery" row
//
// A player can turn all of it off for their browser in the gallery's
// settings (arcade.telemetryOptOut, see assets/progress.js), and classroom
// mode (assets/classroom.js) turns it off while it's on.
//
// Each round result is sent right away (so a closed tab loses nothing), and
// end() sends one session summary. No personal data: the only id is the
// random per-browser client id that feedback already uses.
window.ArcadeTelemetry = (function () {
  const config = window.ARCADE_CONFIG || {};
  const enabled = !!(config.telemetry && config.feedbackEndpoint);
  let s = null;

  function randomId() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
  }

  function device() {
    return window.matchMedia && matchMedia("(pointer: coarse)").matches ? "touch" : "mouse";
  }

  // Classroom mode (assets/classroom.js) sends nothing, like the opt-out.
  function active() {
    if (window.ArcadeClassroom && window.ArcadeClassroom.on()) return false;
    return enabled && !(window.ArcadeProgress && window.ArcadeProgress.telemetryOptedOut());
  }

  function send(payload) {
    if (!active()) return;
    const body = JSON.stringify(Object.assign(payload, {
      client_id: window.ArcadeFeedback.clientId(),
      device: device(),
      submitted_at: new Date().toISOString(),
    }));
    // sendBeacon survives the page closing; text/plain keeps it a CORS simple
    // request, which Apps Script requires. We never need the response.
    try {
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon && navigator.sendBeacon(config.feedbackEndpoint, blob)) return;
    } catch (_) {}
    fetch(config.feedbackEndpoint, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    }).catch(() => {});
  }

  function playSeconds() {
    const ms = s.playMs + (s.runningSince ? Date.now() - s.runningSince : 0);
    return Math.round(ms / 100) / 10;
  }

  function start(game, paused) {
    if (s) end();
    s = {
      game,
      id: randomId(),
      openedAt: Date.now(),
      playMs: 0,
      runningSince: paused ? 0 : Date.now(),
      rounds: 0,
      wins: 0,
      achievements: [],
    };
  }

  function pause() {
    if (!s || !s.runningSince) return;
    s.playMs += Date.now() - s.runningSince;
    s.runningSince = 0;
  }

  function resume() {
    if (s && !s.runningSince) s.runningSince = Date.now();
  }

  function base(kind) {
    return { kind, game_id: s.game.id, game_version: s.game.version, session_id: s.id };
  }

  function result(msg) {
    if (!s) return;
    const outcome = /^[a-z0-9-]{1,16}$/.test(String(msg.outcome || "")) ? msg.outcome : "";
    const time = Number(msg.time);
    if (!outcome || !(time >= 0)) return;
    s.rounds++;
    if (outcome === "win") s.wins++;
    const row = Object.assign(base("round"), {
      round: s.rounds,
      outcome,
      seconds: Math.round(time * 10) / 10,
    });
    // Optional detail for games with levels (days, stages...). Anything
    // malformed is dropped here and again by the server.
    const int = (v) => Number.isInteger(v) && v >= 0 && v < 100000;
    if (int(msg.level)) row.level = msg.level;
    if (/^[a-z0-9]{1,16}$/.test(String(msg.run || ""))) row.run = msg.run;
    if (int(msg.attempt)) row.attempt = msg.attempt;
    if (/^[a-z0-9-]{1,24}$/.test(String(msg.reason || ""))) row.reason = msg.reason;
    if (msg.stats && typeof msg.stats === "object") {
      const stats = {};
      for (const k of Object.keys(msg.stats).slice(0, 16)) {
        const v = Number(msg.stats[k]);
        if (/^[a-z][a-z0-9_]{0,15}$/.test(k) && Number.isFinite(v)) stats[k] = Math.round(v * 10) / 10;
      }
      row.stats = stats;
    }
    // Any other field a game adds (score, moves...) is passed through as is:
    // the server keeps well-formed extras without needing a redeploy.
    for (const k of Object.keys(msg)) {
      if (!(k in row) && !["type", "game", "time", "stats"].includes(k) && /^[a-z][a-z0-9_]{0,31}$/.test(k)) row[k] = msg[k];
    }
    send(row);
  }

  function achievement(id) {
    if (s && !s.achievements.includes(id)) s.achievements.push(id);
  }

  function end() {
    if (!s) return;
    pause();
    const play = playSeconds();
    // A cabinet opened and closed without playing isn't a session.
    if (play >= 3 || s.rounds) {
      send(Object.assign(base("session"), {
        rounds: s.rounds,
        wins: s.wins,
        seconds: play,
        wall_seconds: Math.round((Date.now() - s.openedAt) / 1000),
        achievements: s.achievements.join(" "),
        achievements_total: window.ArcadeAchievements.count(s.game),
      }));
    }
    s = null;
  }

  // Gallery rows land in the backend's "events" tab (backend v3 keeps any
  // new kind and any extra field; docs/backend-api.md).
  function event(action, fields) {
    send(Object.assign({ kind: "gallery", action }, fields || {}));
  }

  // Uncaught errors, from a game (its crash-report snippet posts
  // arcade:error, forwarded by cabinet.js) or from the gallery itself. Kind
  // "error" lands in the events tab; at most 5 distinct ones per page load.
  const reported = new Set();
  function error(source, e) {
    const message = String((e && e.message) || "").slice(0, 300);
    const key = `${source}|${message}|${e && e.line}`;
    if (!message || reported.has(key) || reported.size >= 5) return;
    reported.add(key);
    const int = (v) => (Number.isInteger(v) && v >= 0 && v < 1e7 ? v : 0);
    const row = { kind: "error", source, message, line: int(e.line), col: int(e.col), file: String((e && e.file) || "").slice(0, 120) };
    if (s) Object.assign(row, { game_id: s.game.id, game_version: s.game.version, session_id: s.id });
    send(row);
  }

  // "Script error." is a cross-origin script (a browser extension) with no
  // detail to act on.
  window.addEventListener("error", (e) => {
    if (!e.message || /^Script error\.?$/.test(e.message)) return;
    error("gallery", { message: e.message, line: e.lineno, col: e.colno, file: String(e.filename || "").replace(/^.*\//, "") });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    error("gallery", { message: `Unhandled rejection: ${r && r.message ? r.message : r}` });
  });

  return { start, pause, resume, result, achievement, end, event, error, enabled, active };
})();
