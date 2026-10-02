// Everything the arcade remembers per browser, in one place:
//   arcade.achievements.<id>   { achievementId: ISO date }   (assets/achievements.js)
//   arcade.seenIntro.<id>      "1" once the intro panel was shown
//   arcade.seenVersion.<id>    the last manifest version this browser opened
//   arcade.rated.<id>.v<n>     "1" after rating that version
//   arcade.nudged.<id>.v<n>    "1" after the "Rate this game?" nudge
//   arcade.best.<id>           { "e<epoch>:<board>": { score, at, version } } (assets/scores.js)
//   arcade.handle              random leaderboard name, from assets/scores.js word lists (kept on reset)
//   arcade.name                typed leaderboard name, assets/names.js rules (kept on reset)
//   arcade.leaderboardOptOut   "1" = send scores without a name, off the leaderboard (kept on reset)
//   arcade.recent              [ids], most recently opened first
//   arcade.clientId            anonymous id for feedback/telemetry (kept on reset)
//   arcade.telemetryOptOut     "1" = don't send play stats (kept on reset)
// Progress is per browser, so export/import is the only way to move it.
window.ArcadeProgress = (function () {
  const store = window.ArcadeUI.store;
  const Ach = window.ArcadeAchievements;
  const FORMAT = "emergent-arcade-progress";
  const ID = /^[a-z0-9-]{1,64}$/;
  const RESETTABLE = /^arcade\.(achievements|best|seenIntro|seenVersion|rated|nudged)\.|^arcade\.recent$/;

  // 0 = never opened. Browsers that opened a game before versions were
  // remembered count as having seen the current one (no badge).
  function seenVersion(game) {
    const v = Number(store.get(`arcade.seenVersion.${game.id}`));
    if (v > 0) return v;
    return store.get(`arcade.seenIntro.${game.id}`) ? game.version : 0;
  }

  function markSeen(game) {
    store.set(`arcade.seenVersion.${game.id}`, String(game.version));
  }

  // "new" | "updated" | ""
  function badge(game) {
    const seen = seenVersion(game);
    if (!seen) return "new";
    return seen < game.version ? "updated" : "";
  }

  function recent() {
    const list = store.json("arcade.recent", []);
    return Array.isArray(list) ? list.filter((id) => typeof id === "string") : [];
  }

  function pushRecent(id) {
    store.set("arcade.recent", JSON.stringify([id, ...recent().filter((x) => x !== id)].slice(0, 3)));
  }

  function totals(games) {
    let got = 0;
    let total = 0;
    for (const g of games) {
      got += Ach.count(g);
      total += (g.achievements || []).length;
    }
    return { got, total };
  }

  function exportData() {
    const achievements = {};
    const seen = {};
    const intro = [];
    const bests = {};
    for (const key of store.keys()) {
      let m;
      if ((m = /^arcade\.achievements\.(.+)$/.exec(key))) {
        const got = Ach.load(m[1]);
        if (Object.keys(got).length) achievements[m[1]] = got;
      } else if ((m = /^arcade\.seenVersion\.(.+)$/.exec(key))) {
        seen[m[1]] = Number(store.get(key)) || 0;
      } else if ((m = /^arcade\.seenIntro\.(.+)$/.exec(key))) {
        intro.push(m[1]);
      } else if ((m = /^arcade\.best\.(.+)$/.exec(key))) {
        const all = window.ArcadeScores.load(m[1]);
        if (Object.keys(all).length) bests[m[1]] = all;
      }
    }
    return {
      format: FORMAT,
      version: 1,
      exported_at: new Date().toISOString(),
      achievements,
      seenVersion: seen,
      seenIntro: intro.sort(),
      bests,
    };
  }

  // Checks an imported file. Returns { data, achievements, games, fresh } or
  // throws with a message a player can read.
  function parseImport(text, games) {
    let raw;
    try { raw = JSON.parse(text); } catch (_) { throw new Error("That file isn't valid JSON."); }
    if (!raw || raw.format !== FORMAT || typeof raw.achievements !== "object") {
      throw new Error("That isn't an Emergent Arcade progress file.");
    }
    const data = { achievements: {}, seenVersion: {}, seenIntro: [], bests: {} };
    let count = 0;
    let fresh = 0;
    for (const [gameId, got] of Object.entries(raw.achievements || {})) {
      if (!ID.test(gameId) || !got || typeof got !== "object") continue;
      const game = games.find((g) => g.id === gameId);
      const mine = Ach.load(gameId);
      const clean = {};
      for (const [achId, when] of Object.entries(got)) {
        if (!ID.test(achId) || typeof when !== "string" || isNaN(Date.parse(when))) continue;
        clean[achId] = when;
        // Only achievements the current manifest still has count in the preview.
        if (!game || (game.achievements || []).some((a) => a.id === achId)) {
          count++;
          if (!mine[achId]) fresh++;
        }
      }
      if (Object.keys(clean).length) data.achievements[gameId] = clean;
    }
    for (const [gameId, v] of Object.entries(raw.seenVersion || {})) {
      if (ID.test(gameId) && Number.isInteger(v) && v > 0) data.seenVersion[gameId] = v;
    }
    for (const gameId of Array.isArray(raw.seenIntro) ? raw.seenIntro : []) {
      if (ID.test(gameId)) data.seenIntro.push(gameId);
    }
    for (const [gameId, all] of Object.entries(raw.bests || {})) {
      if (ID.test(gameId) && all && typeof all === "object") data.bests[gameId] = all;
    }
    const gamesWith = Object.keys(data.achievements).length;
    return { data, achievements: count, games: gamesWith, fresh, exportedAt: raw.exported_at };
  }

  // Merges: nothing already in this browser is lost; the earliest unlock
  // date and the highest seen version win.
  function applyImport(data, games) {
    for (const [gameId, got] of Object.entries(data.achievements)) {
      const mine = Ach.load(gameId);
      for (const [achId, when] of Object.entries(got)) {
        if (!mine[achId] || Date.parse(when) < Date.parse(mine[achId])) mine[achId] = when;
      }
      store.set(`arcade.achievements.${gameId}`, JSON.stringify(mine));
    }
    for (const [gameId, v] of Object.entries(data.seenVersion)) {
      const key = `arcade.seenVersion.${gameId}`;
      if (v > (Number(store.get(key)) || 0)) store.set(key, String(v));
    }
    for (const gameId of data.seenIntro) store.set(`arcade.seenIntro.${gameId}`, "1");
    // Best scores merge too: the better one per board wins (assets/scores.js).
    for (const [gameId, all] of Object.entries(data.bests || {})) {
      window.ArcadeScores.merge(gameId, all, (games || []).find((g) => g.id === gameId));
    }
  }

  function resetAchievements() {
    for (const key of store.keys()) if (key.startsWith("arcade.achievements.")) store.remove(key);
  }

  function resetEverything() {
    for (const key of store.keys()) if (RESETTABLE.test(key)) store.remove(key);
  }

  function clientIdShort() {
    return (store.get("arcade.clientId") || "").slice(0, 8);
  }

  function newClientId() {
    store.remove("arcade.clientId");
    return window.ArcadeFeedback.clientId();
  }

  function telemetryOptedOut() {
    return store.get("arcade.telemetryOptOut") === "1";
  }

  function setTelemetryOptOut(off) {
    if (off) store.set("arcade.telemetryOptOut", "1");
    else store.remove("arcade.telemetryOptOut");
  }

  return {
    seenVersion, markSeen, badge, recent, pushRecent, totals,
    exportData, parseImport, applyImport, resetAchievements, resetEverything,
    clientIdShort, newClientId, telemetryOptedOut, setTelemetryOptOut,
  };
})();
