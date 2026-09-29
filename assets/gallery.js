// The gallery: the catalog of cards (search, sort, verb filter, continue
// playing, archive), the site header (achievement total, settings, about the
// arcade) and routing. The cabinet itself is assets/cabinet.js.
//
// Routes:  #/play/<id>                     a game's cabinet (shareable)
//          #/?sort=updated&verb=drag&q=ant  the gallery, with its view state
(function () {
  const UI = window.ArcadeUI;
  const { el } = UI;
  const config = window.ARCADE_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const telemetry = window.ArcadeTelemetry;
  const Progress = window.ArcadeProgress;
  const Ach = window.ArcadeAchievements;
  const Cabinet = window.ArcadeCabinet;
  const Wording = window.ArcadeWording;

  const galleryView = $("galleryView");
  const gameList = $("gameList");
  const galleryStatus = $("galleryStatus");
  const search = $("search");
  const sortSelect = $("sort");

  const SORTS = ["new", "updated", "title", "left"];

  let games = [];
  let state = { q: "", sort: "", verb: "" };
  let galleryHash = "#/";
  let galleryScroll = 0;
  let pendingOpen = null;
  let searchTimer = null;

  if (config.repo) {
    const repo = `https://github.com/${config.repo}`;
    $("repoLink").href = repo;
    $("sourceLink").href = repo;
    $("findingsLink").href = `${repo}/blob/main/docs/findings.md`;
  }

  // ---------- view state (lives in the hash) ----------

  function parseState(hash) {
    const i = hash.indexOf("?");
    const p = new URLSearchParams(i >= 0 ? hash.slice(i + 1) : "");
    const sort = p.get("sort") || "";
    return { q: (p.get("q") || "").slice(0, 60), sort: SORTS.includes(sort) ? sort : "", verb: p.get("verb") || "" };
  }

  function stateHash() {
    const p = new URLSearchParams();
    if (state.sort) p.set("sort", state.sort);
    if (state.verb) p.set("verb", state.verb);
    if (state.q) p.set("q", state.q);
    const s = p.toString();
    return s ? `#/?${s}` : "#/";
  }

  // Filter changes replace the history entry instead of adding one, so Back
  // still leaves the page rather than stepping through every keystroke.
  function commitState() {
    galleryHash = stateHash();
    if ((location.hash || "#/") !== galleryHash) history.replaceState(null, "", galleryHash);
    renderGallery();
  }

  const filtering = () => !!(state.q || state.verb);

  function matches(g) {
    if (state.verb && !g.mechanics.some((m) => m.verb === state.verb)) return false;
    if (!state.q) return true;
    const hay = [g.title, g.blurb, ...g.mechanics.flatMap((m) => [m.name, m.verb, Wording.verb(m.verb)])].join(" ").toLowerCase();
    return state.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  }

  function sorted(list) {
    if (!state.sort) return list;
    // Ties fall back to the newest manifest entry first.
    const order = (a, b) => games.indexOf(b) - games.indexOf(a);
    const left = (g) => (g.achievements || []).length - Ach.count(g);
    const by = {
      new: (a, b) => b.added.localeCompare(a.added) || order(a, b),
      updated: (a, b) => b.updated.localeCompare(a.updated) || order(a, b),
      title: (a, b) => a.title.localeCompare(b.title),
      left: (a, b) => left(b) - left(a) || a.title.localeCompare(b.title),
    }[state.sort];
    return [...list].sort(by);
  }

  // ---------- cards ----------

  // Card art: the game's own picture from assets/thumbs.js if it has one,
  // else a deterministic little pixel pattern in its accent color.
  function thumb(game, small) {
    const cls = `thumb${small ? " small" : ""}`;
    const art = window.ArcadeThumbs && window.ArcadeThumbs[game.id];
    if (art) {
      const box = el("div", { className: `${cls} art`, ariaHidden: "true" });
      box.innerHTML = art();
      return box;
    }
    let seed = 0;
    for (const ch of game.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const cells = [];
    for (let i = 0; i < 16; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const span = document.createElement("span");
      span.style.opacity = (0.15 + ((seed >>> 16) % 85) / 100).toFixed(2);
      cells.push(span);
    }
    return el("div", { className: cls, ariaHidden: "true" }, cells);
  }

  function pills(game) {
    const out = [];
    const badge = Progress.badge(game);
    if (badge) out.push(el("span", { className: `pill ${badge}`, textContent: badge === "new" ? "New" : "Updated" }));
    if (game.status === "archived") out.push(el("span", { className: "pill archived", textContent: "Archived" }));
    return out;
  }

  function trophies(game) {
    const total = (game.achievements || []).length;
    return total ? `🏆 ${Ach.count(game)}/${total}` : "";
  }

  function card(game, from, index) {
    const chips = game.mechanics.map((m) =>
      el("span", { className: "chip" }, [el("b", { textContent: m.name }), ` · ${Wording.verb(m.verb)}`])
    );
    const meta = el("div", { className: "card-meta" }, [
      el("span", { textContent: `v${game.version} · updated ${UI.shortDate(game.updated)}` }),
      el("span", { textContent: trophies(game) }),
    ]);
    const link = el("a", { className: "game-card", href: `#/play/${game.id}` }, [
      thumb(game),
      el("div", { className: "card-body" }, [
        el("h3", {}, [el("span", { textContent: game.title }), ...pills(game)]),
        el("p", { textContent: game.blurb }),
        el("div", { className: "chips" }, chips),
        meta,
      ]),
    ]);
    link.dataset.id = game.id;
    if (game.accent) link.style.setProperty("--card-accent", game.accent);
    link.addEventListener("click", () => { pendingOpen = { from, position: index + 1 }; });
    return el("li", {}, [link]);
  }

  function renderContinue() {
    const recent = Progress.recent().map((id) => games.find((g) => g.id === id)).filter(Boolean);
    const show = recent.length && !filtering();
    $("continueRow").hidden = !show;
    if (!show) return;
    $("continueList").replaceChildren(
      ...recent.map((game, i) => {
        const link = el("a", { className: "continue-card", href: `#/play/${game.id}` }, [
          thumb(game, true),
          el("span", { className: "continue-title", textContent: game.title }),
          el("span", { className: "continue-meta", textContent: trophies(game) }),
        ]);
        link.dataset.id = game.id;
        if (game.accent) link.style.setProperty("--card-accent", game.accent);
        link.addEventListener("click", () => { pendingOpen = { from: "continue", position: i + 1 }; });
        return el("li", {}, [link]);
      })
    );
  }

  function renderChips() {
    const counts = new Map();
    for (const g of games) for (const m of g.mechanics) counts.set(m.verb, (counts.get(m.verb) || 0) + 1);
    const verbs = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
    const chip = (verb, label) => {
      const btn = el("button", { type: "button", className: "verb-chip", textContent: label });
      btn.setAttribute("aria-pressed", String(state.verb === verb));
      btn.addEventListener("click", () => {
        state.verb = state.verb === verb ? "" : verb;
        commitState();
        telemetry.event("filter", { verb: state.verb || "all" });
        const again = [...$("verbChips").children].find((b) => b.textContent === label);
        if (again) again.focus();
      });
      return btn;
    };
    $("verbChips").replaceChildren(chip("", "All verbs"), ...verbs.map((v) => chip(v, Wording.verb(v))));
  }

  function renderHeader() {
    const { got, total } = Progress.totals(games);
    $("trophyTotal").textContent = total ? `🏆 ${got} / ${total}` : "";
    $("trophyTotal").setAttribute("aria-label", `${got} of ${total} achievements unlocked`);
  }

  function renderGallery() {
    // Never rewrite the box while someone is typing in it (that would eat spaces).
    if (document.activeElement !== search) search.value = state.q;
    sortSelect.value = state.sort;
    const active = sorted(games.filter((g) => g.status !== "archived" && matches(g)));
    const archived = sorted(games.filter((g) => g.status === "archived" && matches(g)));
    gameList.replaceChildren(...active.map((g, i) => card(g, "list", i)));
    $("archiveSection").hidden = !archived.length;
    $("archiveList").replaceChildren(...archived.map((g, i) => card(g, "archive", i)));
    renderContinue();
    renderChips();
    renderHeader();

    galleryStatus.className = "status gallery-status";
    galleryStatus.replaceChildren();
    const shown = active.length + archived.length;
    if (!games.length) {
      galleryStatus.textContent = "No games yet.";
    } else if (!shown) {
      const clear = el("button", { type: "button", className: "linkish", textContent: "Show all games" });
      clear.addEventListener("click", () => {
        state = { q: "", sort: state.sort, verb: "" };
        commitState();
        search.focus();
      });
      galleryStatus.append("No games match. ", clear);
    } else if (filtering()) {
      galleryStatus.textContent = `${shown} of ${games.length} games`;
    }
  }

  search.addEventListener("input", () => {
    state.q = search.value.trim().slice(0, 60);
    commitState();
    // Only the length is sent, never the text someone typed.
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (state.q) telemetry.event("search", { query_len: state.q.length, results: gameList.children.length + $("archiveList").children.length });
    }, 1500);
  });
  sortSelect.addEventListener("change", () => {
    state.sort = SORTS.includes(sortSelect.value) ? sortSelect.value : "";
    commitState();
    telemetry.event("sort", { sort: state.sort || "featured" });
  });

  // ---------- routing ----------

  function route() {
    const match = location.hash.match(/^#\/play\/([a-z0-9-]+)/);
    const game = match && games.find((g) => g.id === match[1]);
    if (game) {
      const open = Cabinet.current();
      if (!open) galleryScroll = window.scrollY;
      if (!open || open.id !== game.id) {
        const src = pendingOpen || { from: "link" };
        const row = { game_id: game.id, game_version: game.version, from: src.from, sort: state.sort || "featured" };
        if (src.position) row.position = src.position;
        if (state.verb) row.verb = state.verb;
        if (state.q) row.searching = true;
        telemetry.event("open", row);
      }
      pendingOpen = null;
      $("backLink").href = galleryHash;
      galleryView.hidden = true;
      Cabinet.open(game);
      return;
    }
    const closing = Cabinet.current();
    Cabinet.close();
    galleryView.hidden = false;
    state = parseState(location.hash);
    galleryHash = stateHash();
    renderGallery();
    if (match) {
      galleryStatus.className = "status gallery-status err";
      galleryStatus.textContent = `There's no game called "${match[1]}". Here are all of them.`;
    }
    if (closing) {
      // Back where the player left off, with focus on the card they opened.
      window.scrollTo(0, galleryScroll);
      const back = document.querySelector(`.game-card[data-id="${closing.id}"]`);
      if (back) back.focus({ preventScroll: true });
    }
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("arcade:progress", renderHeader);

  // ---------- dialogs: settings and about the arcade ----------

  function openDialog(dialog, opener) {
    dialog.showModal();
    dialog.addEventListener("close", () => opener && opener.focus(), { once: true });
  }
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("click", (evt) => {
      if (evt.target === dialog) dialog.close(); // backdrop
      if (evt.target.closest("[data-close]")) dialog.close();
    });
  }

  // Shares the arcade itself, the same way the cabinet shares a game.
  const galleryToast = UI.toaster($("galleryToasts"), 3);
  $("shareArcadeBtn").addEventListener("click", async () => {
    const url = config.siteUrl || `${location.origin}${location.pathname}`;
    const method = await UI.share({ title: "Emergent Arcade", text: $("tagline").textContent, url }, galleryToast);
    if (method) telemetry.event("share", { method, from: "gallery" });
  });

  $("arcadeInfoBtn").addEventListener("click", () => {
    openDialog($("arcadeInfoDialog"), $("arcadeInfoBtn"));
    telemetry.event("about_arcade");
  });

  const settings = $("settingsDialog");
  let importData = null;

  function settingsStatus(text, kind) {
    $("settingsStatus").textContent = text;
    $("settingsStatus").className = `status${kind ? " " + kind : ""}`;
  }

  function renderSettings() {
    const { got, total } = Progress.totals(games);
    const played = games.filter((g) => Ach.count(g) > 0).length;
    $("settingsSummary").textContent = `🏆 ${got} of ${total} achievements, in ${played} of ${games.length} games.`;
    $("resetAchBtn").disabled = got === 0;
    const toggle = $("statsToggle");
    toggle.disabled = !telemetry.enabled;
    toggle.checked = telemetry.enabled && !Progress.telemetryOptedOut();
    $("statsNote").textContent = telemetry.enabled
      ? "Time played, wins and losses, achievements, and which gallery buttons get used. No names, no cookies. Turning it off only affects this browser."
      : "Play stats are switched off for the whole site.";
    $("clientIdText").textContent = `${Progress.clientIdShort() || "none yet"}…`;
    $("telemetryNote").hidden = !telemetry.active();
  }

  function hideConfirms() {
    for (const c of settings.querySelectorAll(".confirm")) c.hidden = true;
    for (const b of ["resetAchBtn", "resetAllBtn"]) $(b).hidden = false;
    importData = null;
  }

  function openSettings(opener, focusId) {
    hideConfirms();
    settingsStatus("");
    renderSettings();
    openDialog(settings, opener);
    if (focusId) $(focusId).focus();
  }

  $("settingsBtn").addEventListener("click", () => openSettings($("settingsBtn")));
  $("telemetryNoteBtn").addEventListener("click", () => openSettings($("settingsBtn"), "statsToggle"));

  function refreshAll() {
    renderSettings();
    if (!Cabinet.current()) renderGallery();
    else renderHeader();
  }

  $("exportBtn").addEventListener("click", () => {
    const data = Progress.exportData();
    const n = Object.values(data.achievements).reduce((s, got) => s + Object.keys(got).length, 0);
    UI.saveFile("arcade-progress.json", JSON.stringify(data, null, 2), "application/json");
    settingsStatus(`Saved arcade-progress.json (${n} achievement${n === 1 ? "" : "s"}). Import it on another device.`, "ok");
    telemetry.event("settings", { setting: "export", achievements: n });
  });

  $("importBtn").addEventListener("click", () => {
    $("importFile").value = "";
    $("importFile").click();
  });
  $("importFile").addEventListener("change", async () => {
    const file = $("importFile").files[0];
    if (!file) return;
    hideConfirms();
    try {
      if (file.size > 1e6) throw new Error("That file is too big to be a progress file.");
      const preview = Progress.parseImport(await file.text(), games);
      importData = preview.data;
      const when = preview.exportedAt ? ` (exported ${UI.shortDate(String(preview.exportedAt).slice(0, 10))})` : "";
      $("importText").textContent =
        `${preview.achievements} achievement${preview.achievements === 1 ? "" : "s"} across ${preview.games} game${preview.games === 1 ? "" : "s"}${when}. ` +
        `${preview.fresh} ${preview.fresh === 1 ? "is" : "are"} new to this browser. Nothing here is removed.`;
      $("importPreview").hidden = false;
      settingsStatus("");
      $("importYes").focus();
    } catch (err) {
      settingsStatus(err.message, "err");
    }
  });
  $("importYes").addEventListener("click", () => {
    if (!importData) return;
    Progress.applyImport(importData);
    hideConfirms();
    refreshAll();
    settingsStatus("Progress imported.", "ok");
    telemetry.event("settings", { setting: "import" });
    $("importBtn").focus();
  });
  $("importNo").addEventListener("click", () => {
    hideConfirms();
    $("importBtn").focus();
  });

  function confirmStep(btnId, boxId) {
    $(btnId).addEventListener("click", () => {
      hideConfirms();
      $(btnId).hidden = true;
      $(boxId).hidden = false;
      $(boxId).querySelector("[data-cancel]").focus();
    });
    $(boxId).querySelector("[data-cancel]").addEventListener("click", () => {
      hideConfirms();
      $(btnId).focus();
    });
  }
  confirmStep("resetAchBtn", "resetAchConfirm");
  confirmStep("resetAllBtn", "resetAllConfirm");

  $("resetAchYes").addEventListener("click", () => {
    Progress.resetAchievements();
    hideConfirms();
    refreshAll();
    settingsStatus("All achievements erased.", "ok");
    telemetry.event("settings", { setting: "reset_achievements" });
    $("resetAllBtn").focus();
  });
  $("resetAllYes").addEventListener("click", () => {
    Progress.resetEverything();
    hideConfirms();
    refreshAll();
    settingsStatus("Everything erased. The arcade is new again.", "ok");
    telemetry.event("settings", { setting: "reset_all" });
    $("resetAllBtn").focus();
  });
  $("newIdBtn").addEventListener("click", () => {
    Progress.newClientId();
    renderSettings();
    settingsStatus("New anonymous id created.", "ok");
  });
  $("statsToggle").addEventListener("change", () => {
    const on = $("statsToggle").checked;
    Progress.setTelemetryOptOut(!on);
    renderSettings();
    // Opting out sends nothing, not even the fact of opting out.
    if (on) telemetry.event("settings", { setting: "stats_on" });
    settingsStatus(on ? "Play stats are on for this browser. Thanks!" : "Play stats are off for this browser.", "ok");
  });

  // ---------- boot ----------

  $("telemetryNote").hidden = !telemetry.active();
  for (const span of document.querySelectorAll("[data-verb]")) span.textContent = Wording.verb(span.dataset.verb);
  galleryStatus.textContent = "Loading games…";

  fetch("games/games.json", { cache: "no-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      // {tap}-style placeholders become "tap" or "click" (assets/wording.js).
      games = (data.games || []).map((g) => Wording.game(g));
      route();
    })
    .catch((err) => {
      galleryStatus.textContent = `Couldn't load the game list (${err.message}). If you opened this file directly, serve the folder instead: python3 -m http.server`;
      galleryStatus.className = "status gallery-status err";
    });
})();
