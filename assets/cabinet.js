// The cabinet: the full-screen view of one game, with its toolbar, panels
// (how to play, achievements, rating), toasts, share and download.
// assets/gallery.js routes to it with ArcadeCabinet.open(game) / close().
window.ArcadeCabinet = (function () {
  const UI = window.ArcadeUI;
  const { el, icon, store } = UI;
  const $ = (id) => document.getElementById(id);
  const telemetry = window.ArcadeTelemetry;
  const Progress = window.ArcadeProgress;
  const Ach = window.ArcadeAchievements;
  const Scores = window.ArcadeScores;

  const cabinet = $("cabinet");
  const frame = $("gameFrame");
  const panel = $("panel");
  const menu = $("moreMenu");
  const moreBtn = $("moreBtn");
  const stars = $("stars");
  const tags = $("tags");
  const comment = $("comment");
  const submitBtn = $("submitBtn");
  const feedbackStatus = $("feedbackStatus");
  const loadState = $("loadState");
  const toolbarBtn = (name) => document.querySelector(`.toolbar [data-panel="${name}"]`);

  const PANEL_TITLES = { about: "How to play", achievements: "Achievements", rate: "Rate this game" };
  const ICONS = {
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
    download: '<path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/><path d="M7 11l5 5 5-5"/><path d="M12 4v12"/>',
    fullscreen: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  };
  const ROUNDS_BEFORE_NUDGE = 3;

  let current = null;
  let openPanelName = null;
  let returnFocus = null;
  let releaseTrap = null;
  let rating = 0;
  const picked = new Set();
  let rounds = 0;
  let loadToken = 0;
  let loadTimer = null;
  let loadFailed = false;
  let recordsBoard = null; // board shown in the Records panel

  const toast = UI.toaster($("toasts"), 3);
  const clearToasts = () => $("toasts").replaceChildren();

  // Icons for the toolbar and menu buttons.
  for (const btn of document.querySelectorAll(".toolbar [data-action]")) {
    btn.replaceChildren(icon(ICONS[btn.dataset.action]));
  }
  for (const item of menu.querySelectorAll("[data-action]")) item.prepend(icon(ICONS[item.dataset.action]));

  const progressChanged = () => window.dispatchEvent(new Event("arcade:progress"));

  // ---------- open / close ----------

  function open(game) {
    const switching = !current || current.id !== game.id;
    current = game;
    document.title = `${game.title} v${game.version} · Emergent Arcade`;
    $("cabTitle").textContent = game.title;
    $("cabVersion").textContent = `v${game.version}`;
    if (game.accent) cabinet.style.setProperty("--game-accent", game.accent);
    else cabinet.style.removeProperty("--game-accent");
    frame.title = game.title;
    const src = `games/${game.file}?v=${game.version}`;
    if (frame.getAttribute("src") !== src) load(src);
    renderAbout();
    renderAchievements();
    if (switching) {
      resetFeedback();
      clearToasts();
      rounds = 0;
      recordsBoard = null;
      telemetry.start(game);
    }
    document.body.classList.add("playing");
    cabinet.hidden = false;

    const seen = Progress.seenVersion(game);
    Progress.markSeen(game);
    Progress.pushRecent(game.id);
    const introKey = `arcade.seenIntro.${game.id}`;
    if (!store.get(introKey)) {
      store.set(introKey, "1");
      openPanel("about", null);
    } else {
      closePanel(null);
      syncToolbar();
      frame.focus();
      if (switching && seen && seen < game.version) whatsNew(game, seen);
    }
  }

  function close() {
    if (current) telemetry.end();
    current = null;
    loadToken++;
    clearTimeout(loadTimer);
    loadState.hidden = true;
    frame.removeAttribute("src"); // stop the running game
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    closeMenu(false);
    closePanel(null);
    clearToasts();
    document.body.classList.remove("playing");
    cabinet.hidden = true;
  }

  // ---------- loading and errors ----------

  // The iframe's load event fires even for a 404 or an offline error page,
  // so a HEAD request tells whether the file really arrived.
  function load(src) {
    const token = ++loadToken;
    loadFailed = false;
    showLoad("loading");
    frame.src = src;
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      if (token === loadToken && !loadState.hidden) showLoad("slow");
    }, 15000);
    fetch(src, { method: "HEAD", cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })
      .catch(() => {
        if (token !== loadToken) return;
        loadFailed = true;
        showLoad("error");
      });
  }

  function showLoad(state) {
    const name = current ? current.title : "the game";
    loadState.hidden = false;
    loadState.dataset.state = state;
    $("loadText").textContent =
      state === "error" ? `Couldn't load ${name}. Check your connection and try again.`
      : state === "slow" ? `Still loading ${name}…`
      : `Loading ${name}…`;
    $("retryBtn").hidden = state === "loading";
  }

  frame.addEventListener("load", () => {
    if (!frame.getAttribute("src")) return;
    if (!loadFailed) loadState.hidden = true;
    clearTimeout(loadTimer);
    // A game that loads while a panel is open (first-time intro) starts paused.
    if (openPanelName) tellGame("arcade:pause");
    tellBest();
  });

  $("retryBtn").addEventListener("click", () => {
    if (current) load(`games/${current.file}?v=${current.version}`);
  });

  // Games listen for these to freeze while a panel covers them.
  function tellGame(type, fields) {
    if (frame.contentWindow) frame.contentWindow.postMessage(Object.assign({ type }, fields), "*");
  }

  // Games may show the player's best as a target (optional: docs/scores.md).
  function tellBest() {
    const sp = current && Scores.spec(current);
    if (!sp) return;
    const bests = {};
    for (const [board, b] of Object.entries(Scores.bests(current))) bests[board] = b.score;
    tellGame("arcade:best", { game: current.id, better: sp.better, bests });
  }

  // ---------- panels ----------

  // The toolbar works like tabs: ▶ is pressed while playing, otherwise the
  // button of the open panel is.
  function syncToolbar() {
    $("playBtn").setAttribute("aria-pressed", String(!openPanelName));
    for (const btn of document.querySelectorAll(".toolbar [data-panel]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.panel === openPanelName));
    }
  }

  // `opener` gets focus back when the panel closes (null: the game does).
  function openPanel(name, opener) {
    closeMenu(false);
    if (!openPanelName) {
      returnFocus = opener;
      releaseTrap = UI.trapFocus(panel);
    } else if (opener) {
      returnFocus = opener;
    }
    openPanelName = name;
    $("panelTitle").textContent = name === "achievements" && Scores.spec(current) ? "Records" : PANEL_TITLES[name];
    for (const body of panel.querySelectorAll("[data-body]")) body.hidden = body.dataset.body !== name;
    syncToolbar();
    if (name === "achievements") {
      renderRecords();
      renderAchievements();
      hideResetConfirm();
    }
    panel.hidden = false;
    panel.querySelector(".panel-body").scrollTop = 0;
    tellGame("arcade:pause");
    telemetry.pause();
    // Opened from a button: focus Play, so Enter starts the game. Opened on
    // its own (first-time intro): focus the panel, which shows no ring on phones.
    (name === "about" && opener ? $("aboutPlay") : panel).focus({ preventScroll: true });
  }

  // how: "opener" returns focus to the button that opened the panel, "game"
  // to the game, null leaves focus alone.
  function closePanel(how) {
    if (!openPanelName) return;
    openPanelName = null;
    panel.hidden = true;
    if (releaseTrap) releaseTrap();
    releaseTrap = null;
    syncToolbar();
    tellGame("arcade:resume");
    telemetry.resume();
    let target = frame;
    if (how === "opener" && returnFocus && returnFocus.offsetParent !== null) target = returnFocus;
    else if (how === "opener" && returnFocus && menu.contains(returnFocus)) target = moreBtn;
    returnFocus = null;
    if (how) target.focus();
  }

  function togglePanel(name, opener) {
    if (openPanelName === name) closePanel("opener");
    else openPanel(name, opener);
  }

  for (const btn of document.querySelectorAll(".toolbar [data-panel]")) {
    btn.addEventListener("click", () => togglePanel(btn.dataset.panel, btn));
  }
  $("playBtn").addEventListener("click", () => closePanel("game"));
  $("panelClose").addEventListener("click", () => closePanel("opener"));
  $("aboutPlay").addEventListener("click", () => closePanel("game"));

  // ---------- "more" menu (narrow screens) ----------

  function openMenu() {
    menu.hidden = false;
    moreBtn.setAttribute("aria-expanded", "true");
    const first = menu.querySelector("button:not([hidden])");
    if (first) first.focus();
  }

  function closeMenu(focusButton) {
    if (menu.hidden) return;
    menu.hidden = true;
    moreBtn.setAttribute("aria-expanded", "false");
    if (focusButton) moreBtn.focus();
  }

  moreBtn.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu(true)));
  document.addEventListener("pointerdown", (evt) => {
    if (!menu.hidden && !menu.contains(evt.target) && !moreBtn.contains(evt.target)) closeMenu(false);
  });
  // Tapping the game moves focus into the iframe, which the page sees as a blur.
  window.addEventListener("blur", () => closeMenu(false));
  menu.addEventListener("keydown", (evt) => {
    if (evt.key !== "ArrowDown" && evt.key !== "ArrowUp") return;
    evt.preventDefault();
    const items = [...menu.querySelectorAll("button:not([hidden])")];
    const i = items.indexOf(document.activeElement);
    items[(i + (evt.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  });

  // ---------- actions: share, download, full screen ----------

  cabinet.addEventListener("click", (evt) => {
    const btn = evt.target.closest("[data-action]");
    if (!btn || !current) return;
    const from = menu.contains(btn) ? "menu" : panel.contains(btn) ? "about" : "toolbar";
    if (from === "menu") closeMenu(true);
    const action = btn.dataset.action;
    if (action === "share") share(from);
    else if (action === "download") download(from);
    else if (action === "fullscreen") toggleFullscreen();
  });

  // On the published site, share play/<id>/: link previews ignore "#", so
  // that page carries the game's own preview card and forwards to
  // #/play/<id>. Elsewhere (local, playtest copies) it doesn't exist.
  function playUrl(game) {
    const site = (window.ARCADE_CONFIG || {}).siteUrl;
    const here = `${location.origin}${location.pathname}`;
    if (site && here.startsWith(site)) return `${site}play/${game.id}/`;
    return `${here}#/play/${game.id}`;
  }

  async function share(from) {
    const game = current;
    const method = await UI.share({ title: `${game.title} · Emergent Arcade`, text: game.blurb, url: playUrl(game) }, toast);
    if (!method) return;
    telemetry.event("share", { game_id: game.id, game_version: game.version, method, from });
  }

  async function download(from) {
    const game = current;
    try {
      const name = await window.ArcadeDownload.save(game, playUrl(game));
      toast(`Downloading ${name}. It plays offline, in any browser.`, { ms: 5000 });
      telemetry.event("download", { game_id: game.id, game_version: game.version, from });
    } catch (err) {
      toast(`Couldn't download the game (${err.message}).`, { kind: "err" });
    }
  }

  // iPhone Safari has no element full screen, so it only appears where it works.
  for (const btn of document.querySelectorAll('[data-action="fullscreen"]')) btn.hidden = !document.fullscreenEnabled;
  function toggleFullscreen() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else cabinet.requestFullscreen().catch(() => {});
  }
  document.addEventListener("fullscreenchange", () => {
    const on = !!document.fullscreenElement;
    for (const btn of document.querySelectorAll('[data-action="fullscreen"]')) {
      btn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
      const label = btn.querySelector(".menu-label");
      if (label) label.textContent = on ? "Exit full screen" : "Full screen";
    }
  });

  // ---------- keyboard ----------

  document.addEventListener("keydown", (evt) => {
    if (!current) return;
    if (evt.key === "Escape") {
      if (!menu.hidden) closeMenu(true);
      else if (openPanelName) closePanel("opener");
      else return;
      evt.preventDefault();
      return;
    }
    if (UI.typing(evt) || evt.ctrlKey || evt.metaKey || evt.altKey) return;
    if (evt.key === "f" || evt.key === "F") {
      toggleFullscreen();
      evt.preventDefault();
    } else if (evt.key === "?") {
      togglePanel("about", toolbarBtn("about"));
      evt.preventDefault();
    }
  });

  // ---------- about ----------

  function changesSince(game, version) {
    return (game.changes || []).filter((c) => c.version > version).sort((a, b) => b.version - a.version);
  }

  // The newest CHANGES_SHOWN versions, with a toggle for the full list.
  const CHANGES_SHOWN = 3;
  let showAllChanges = false;

  function renderChanges() {
    const all = changesSince(current, 0);
    const changes = showAllChanges ? all : all.slice(0, CHANGES_SHOWN);
    $("aboutChanges").hidden = !all.length;
    $("aboutChangeList").replaceChildren(
      ...changes.map((c) =>
        el("li", {}, [el("b", { textContent: `v${c.version}` }), el("span", { className: "muted", textContent: ` · ${UI.shortDate(c.date)}` }), el("p", { textContent: c.text })])
      )
    );
    const toggle = $("aboutChangesAll");
    toggle.hidden = all.length <= CHANGES_SHOWN;
    toggle.textContent = showAllChanges ? "Show fewer" : `Show all ${all.length} versions`;
    toggle.setAttribute("aria-expanded", String(showAllChanges));
  }

  $("aboutChangesAll").addEventListener("click", () => {
    showAllChanges = !showAllChanges;
    renderChanges();
  });

  function renderAbout() {
    const g = current;
    $("aboutGoal").textContent = g.goal;
    $("aboutControls").replaceChildren(
      ...g.mechanics.map((m) =>
        el("li", { className: "verb-row" }, [
          el("span", { className: "verb-tag", textContent: window.ArcadeWording.verb(m.verb) }),
          el("div", {}, [el("b", { textContent: m.name }), el("span", { className: "desc", textContent: m.description })]),
        ])
      ),
      // Desktop-only key controls (the manifest's "keyboard"; dropped on touch).
      ...(g.keyboard ? [el("li", { className: "verb-row keys" }, [
        el("span", { className: "verb-tag", textContent: "keys" }),
        el("div", {}, [el("span", { className: "desc", textContent: g.keyboard })]),
      ])] : [])
    );
    $("aboutBlurb").textContent = g.blurb;
    $("aboutHow").textContent = g.howToPlay || "";
    showAllChanges = false;
    renderChanges();
    const archived = g.status === "archived" ? " · archived (still playable)" : "";
    $("aboutMeta").textContent = `Version ${g.version} · added ${UI.shortDate(g.added)} · updated ${UI.shortDate(g.updated)}${archived}`;
    $("aboutState").textContent = `Shared state: ${g.sharedState}`;
    $("aboutPlays").hidden = true;
    Scores.leaderboards().then((data) => {
      if (current === g) renderPlays(g, Scores.plays(data, g));
    });
  }

  // Plays by version, newest first (docs/scores.md, "Play counts"). Versions
  // from before counting began (no plays, released on or before its first
  // day) are folded into one row, so a v1-v5 with no data doesn't read as
  // "nobody played it".
  function renderPlays(g, p) {
    $("aboutPlays").hidden = !p;
    if (!p) return;
    const released = (v) => (v === 1 ? g.added : ((g.changes || []).find((c) => c.version === v) || {}).date) || "";
    const firstCounted = p.versions.findIndex(([v, n]) => n > 0 || (p.since && released(v) > p.since));
    // The current version is live while counting, so it's never folded.
    const untracked = p.since ? Math.min(p.versions.length - 1, firstCounted < 0 ? p.versions.length : firstCounted) : 0;
    const max = Math.max(1, ...p.versions.map(([, n]) => n));
    const row = (label, n, isCurrent) => {
      const bar = el("span", { className: "plays-bar" });
      bar.style.width = n == null ? "0" : `${Math.max(n ? 4 : 0, (n / max) * 100)}%`;
      const tr = el("tr", { className: isCurrent ? "current" : "" }, [
        el("td", { textContent: label }),
        el("td", { className: "num", textContent: n == null ? "–" : Scores.count(n) }),
        el("td", { className: "bar-cell" }, [bar]),
      ]);
      return tr;
    };
    const rows = p.versions.slice(untracked).reverse().map(([v, n]) => row(`v${v}${v === g.version ? " (current)" : ""}`, n, v === g.version));
    if (untracked) {
      const span = untracked === 1 ? "v1" : `v1–v${untracked}`;
      rows.push(row(`${span} · before counting`, null, false));
    }
    $("aboutPlaysRows").replaceChildren(...rows);
    const since = p.since ? ` since ${UI.shortDate(p.since)}` : "";
    $("aboutPlaysNote").textContent = p.total
      ? `${Scores.count(p.total)} play${p.total === 1 ? "" : "s"}${since}. A play is a finished round, or at least 30 seconds of play. Players who turned off play stats aren't counted. Updated hourly.`
      : "No plays counted yet. Counts update hourly.";
  }

  // A one-time note the first time an updated version is opened.
  function whatsNew(game, seen) {
    const list = changesSince(game, seen);
    const more = list.length > 1 ? ` (+${list.length - 1} earlier)` : "";
    const text = list.length ? `Updated to v${game.version}: ${list[0].text}${more}` : `Updated to v${game.version} since you last played.`;
    toast(text, {
      ms: 12000,
      actions: [
        { label: "Details", onClick: () => {
          openPanel("about", toolbarBtn("about"));
          // Scroll only the panel (scrollIntoView could shift the cabinet too).
          const body = panel.querySelector(".panel-body");
          body.scrollTop = $("aboutChanges").offsetTop - body.offsetTop;
        } },
        { label: "OK", primary: true, onClick: () => frame.focus() },
      ],
    });
  }

  // ---------- achievements ----------

  function renderAchievements() {
    const list = current.achievements || [];
    const got = Ach.load(current.id);
    const n = Ach.count(current);
    $("achBadge").textContent = list.length ? `${n}/${list.length}` : "";
    $("achSummary").textContent = `${n} of ${list.length} unlocked. Saved in this browser.`;
    $("achList").replaceChildren(
      ...list.map((a) =>
        el("li", { className: `ach${got[a.id] ? " got" : ""}` }, [
          el("span", { className: "icon", textContent: "🏆", ariaHidden: "true" }),
          el("div", {}, [
            el("b", { textContent: a.title }),
            el("span", { className: "desc", textContent: a.description }),
          ]),
        ])
      )
    );
    $("achReset").disabled = n === 0;
  }

  function hideResetConfirm() {
    $("achConfirm").hidden = true;
    $("achReset").hidden = false;
  }

  $("achReset").addEventListener("click", () => {
    $("achReset").hidden = true;
    $("achConfirm").hidden = false;
    $("achResetNo").focus();
  });
  $("achResetNo").addEventListener("click", () => {
    hideResetConfirm();
    $("achReset").focus();
  });
  $("achResetYes").addEventListener("click", () => {
    Ach.reset(current.id);
    hideResetConfirm();
    renderAchievements();
    progressChanged();
    telemetry.event("settings", { setting: "reset_game_achievements", game_id: current.id, game_version: current.version });
    // The running game remembers what it already announced; reload it so
    // achievements can be earned again right away.
    load(frame.getAttribute("src"));
    $("achReset").focus();
  });

  window.addEventListener("message", (evt) => {
    const data = evt.data;
    if (!current || evt.source !== frame.contentWindow) return;
    if (!data || data.game !== current.id) return;
    if (data.type === "arcade:result") {
      const sc = Scores.record(current, data);
      telemetry.result(sc ? Object.assign({}, data, scoreFields(sc)) : data);
      if (sc) announceScore(sc);
      if (++rounds === ROUNDS_BEFORE_NUDGE) nudge();
    }
    if (data.type !== "arcade:achievement") return;
    if (!Ach.unlock(current, data.id)) return;
    telemetry.achievement(data.id);
    const a = current.achievements.find((x) => x.id === data.id);
    toast(`🏆 Achievement unlocked: ${a.title}`, { kind: "ach" });
    renderAchievements();
    progressChanged();
  });

  // ---------- records: best score and leaderboard ----------

  // Sent with the telemetry round row; scripts/build-leaderboards.mjs reads them.
  function scoreFields(sc) {
    const out = { score: sc.value, board: sc.board, score_epoch: Scores.spec(current).epoch, lb: Scores.listed() ? 1 : 0 };
    if (Scores.listed()) out.handle = Scores.handle();
    return out;
  }

  function scoreText(sp, board, value) {
    const where = Scores.boardName(board);
    return `${where ? where + " · " : ""}${sp.label}: ${Scores.format(sp, value)}`;
  }

  function announceScore(sc) {
    const game = current;
    const sp = Scores.spec(game);
    recordsBoard = sc.board;
    if (sc.isBest) {
      tellBest();
      progressChanged();
      if (openPanelName === "achievements") renderRecords();
    }
    Scores.leaderboards().then((data) => {
      if (current !== game) return;
      const entries = Scores.top(data, game, sc.board);
      const place = Scores.rank(game, entries, sc.isBest ? sc.value : sc.prev);
      const onBoard = data && Scores.listed() && telemetry.active() && place <= 10 ? ` · #${place} on the leaderboard` : "";
      if (sc.isBest && sc.prev != null) {
        toast(`🥇 New best! ${scoreText(sp, sc.board, sc.value)} (was ${Scores.format(sp, sc.prev)})${onBoard}`, { kind: "ach", ms: 5000 });
      } else if (sc.isBest) {
        toast(`${scoreText(sp, sc.board, sc.value)}. Your first best: beat it next time${onBoard}`, { ms: 4500 });
      } else {
        toast(`${scoreText(sp, sc.board, sc.value)} · your best ${Scores.format(sp, sc.prev)}`, { ms: 3500 });
      }
    });
  }

  function recordBoards(game) {
    const sp = Scores.spec(game);
    const mine = Object.keys(Scores.bests(game));
    const boards = new Set(sp.boards ? [] : ["main"]);
    for (const b of (game.score && game.score.boardList) || []) boards.add(b);
    for (const b of mine) boards.add(b);
    return [...boards];
  }

  function renderRecords() {
    const game = current;
    const sp = game && Scores.spec(game);
    $("records").hidden = !sp;
    if (!sp) return;
    const boards = recordBoards(game);
    if (!boards.includes(recordsBoard)) recordsBoard = boards[0] || null;
    const pick = $("boardPick");
    $("boardPickRow").hidden = boards.length < 2;
    pick.replaceChildren(...boards.map((b) => el("option", { value: b, textContent: Scores.boardName(b) || "Main", selected: b === recordsBoard })));
    const best = recordsBoard && Scores.bests(game)[recordsBoard];
    $("bestLine").replaceChildren(
      best
        ? el("span", {}, [`${sp.label}: `, el("b", { textContent: Scores.format(sp, best.score) }), ` · ${UI.shortDate(best.at.slice(0, 10))}`])
        : el("span", { className: "muted", textContent: sp.wins ? "No best yet: win a round to set one." : "No best yet: finish a round to set one." })
    );
    const listed = Scores.listed();
    $("lbListed").checked = listed;
    $("lbHandle").textContent = Scores.handle();
    $("lbList").replaceChildren(el("li", { className: "gap", textContent: "Loading…" }));
    Scores.leaderboards().then((data) => {
      if (current !== game) return;
      renderBoard(game, sp, data, best);
    });
  }

  // Top 10 of the published board, with this browser's best merged in right
  // away (the published file only catches up at the next hourly build).
  function renderBoard(game, sp, data, best) {
    const me = Scores.me();
    const sending = Scores.listed() && telemetry.active();
    let rows = Scores.top(data, game, recordsBoard).filter((e) => !(sending && e.p === me));
    const published = Scores.top(data, game, recordsBoard).find((e) => e.p === me);
    let mine = null;
    if (sending && (best || published)) {
      const s = best && (!published || Scores.beats(sp, best.score, published.s)) ? best.score : published.s;
      mine = { h: Scores.handle(), s, me: true };
    }
    if (mine) rows.push(mine);
    rows.sort((a, b) => (a.s === b.s ? 0 : Scores.beats(sp, a.s, b.s) ? -1 : 1));
    const items = [];
    let prev = null;
    let place = 0;
    rows.forEach((e, i) => {
      if (e.s !== prev) place = i + 1;
      prev = e.s;
      e.place = place;
    });
    const shown = rows.slice(0, 10);
    for (const e of shown) items.push(lbRow(sp, e));
    if (mine && !shown.includes(mine)) {
      items.push(el("li", { className: "gap", textContent: "…" }), lbRow(sp, mine));
    }
    if (!items.length) items.push(el("li", { className: "gap", textContent: data ? "No scores yet. Be the first." : "The leaderboard isn't available here." }));
    $("lbList").replaceChildren(...items);
    const when = data && data.updated_at ? new Date(data.updated_at) : null;
    $("lbNote").textContent = !telemetry.active()
      ? "Play stats are off (⚙ settings), so your scores stay in this browser."
      : `Updates about once an hour${when ? `, last ${when.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}. Your own best shows here right away.`;
  }

  function lbRow(sp, e) {
    return el("li", { className: e.me ? "me" : "" }, [
      el("span", { className: "rank", textContent: `#${e.place}` }),
      el("span", { textContent: e.me ? `${e.h} (you)` : e.h }),
      el("span", { className: "val", textContent: Scores.format(sp, e.s) }),
    ]);
  }

  $("boardPick").addEventListener("change", () => {
    recordsBoard = $("boardPick").value;
    renderRecords();
  });
  // A name change or opt-out reaches the leaderboard at the next hourly
  // build, without another round (scripts/build-leaderboards.mjs reads it).
  function sendHandle() {
    telemetry.event("handle", Scores.listed() ? { handle: Scores.handle(), lb: 1 } : { lb: 0 });
  }
  $("lbListed").addEventListener("change", () => {
    Scores.setListed($("lbListed").checked);
    sendHandle();
    renderRecords();
  });
  $("lbRename").addEventListener("click", () => {
    Scores.newHandle();
    sendHandle();
    renderRecords();
  });

  // ---------- rating ----------

  function ratedKey(game) {
    return `arcade.rated.${game.id}.v${game.version}`;
  }

  // After a few finished rounds, once per game version, if not rated yet.
  function nudge() {
    const game = current;
    const key = `arcade.nudged.${game.id}.v${game.version}`;
    if (store.get(key) || store.get(ratedKey(game)) || openPanelName) return;
    store.set(key, "1");
    const answer = (result) => telemetry.event("nudge", { game_id: game.id, game_version: game.version, result });
    toast(`Enjoying ${game.title}? A quick rating helps tune it.`, {
      ms: 20000,
      actions: [
        { label: "Rate it", primary: true, onClick: () => { answer("rate"); openPanel("rate", toolbarBtn("rate")); } },
        { label: "Not now", onClick: () => { answer("dismiss"); frame.focus(); } },
      ],
    });
  }

  function syncSubmit() {
    submitBtn.disabled = !(rating || comment.value.trim());
  }

  function setRating(n) {
    rating = n;
    for (const btn of stars.querySelectorAll("button")) {
      btn.classList.toggle("on", Number(btn.dataset.value) <= n);
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.value) === n));
    }
    syncSubmit();
  }

  function setStatus(text, kind) {
    feedbackStatus.textContent = text;
    feedbackStatus.className = `status${kind ? " " + kind : ""}`;
  }

  function resetFeedback() {
    setRating(0);
    picked.clear();
    for (const btn of tags.querySelectorAll("button")) btn.setAttribute("aria-pressed", "false");
    comment.value = "";
    syncSubmit();
    const already = !!store.get(ratedKey(current));
    setStatus(already ? "You've already rated this version. Feel free to send more." : "");
  }

  for (let i = 1; i <= 5; i++) {
    const btn = el("button", { type: "button", textContent: "★" });
    btn.dataset.value = String(i);
    btn.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
    btn.addEventListener("click", () => setRating(rating === i ? 0 : i));
    stars.append(btn);
  }
  for (const tag of window.ArcadeFeedback.TAGS) {
    const btn = el("button", { type: "button", className: "tag", textContent: tag });
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      if (picked.has(tag)) picked.delete(tag);
      else picked.add(tag);
      btn.setAttribute("aria-pressed", String(picked.has(tag)));
    });
    tags.append(btn);
  }
  comment.addEventListener("input", syncSubmit);

  $("feedbackForm").addEventListener("submit", async (evt) => {
    evt.preventDefault();
    if (!current || !(rating || comment.value.trim())) return;
    const game = current;
    submitBtn.disabled = true;
    setStatus("Sending…");
    const result = await window.ArcadeFeedback.submit(game, rating, comment.value, [...picked]);
    if (result.via === "sheet") {
      if (rating) store.set(ratedKey(game), "1");
      resetFeedback();
      setStatus("Thanks! Feedback recorded.", "ok");
    } else {
      // May be blocked if the endpoint attempt took long enough to lose the
      // click's user activation; the link below covers that case.
      const win = window.open(result.url, "_blank");
      if (win) win.opener = null;
      setStatus("", "");
      feedbackStatus.append(
        win ? "Opened a pre-filled GitHub issue. Submit it there to finish. " : "",
        el("a", { href: result.url, target: "_blank", rel: "noopener", textContent: "Open feedback issue" })
      );
      syncSubmit();
    }
  });

  // ---------- sessions ----------

  // A hidden tab ends the play session (phones rarely fire unload events);
  // coming back starts a new one.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") telemetry.end();
    else if (current) {
      telemetry.start(current);
      if (openPanelName) telemetry.pause();
    }
  });
  window.addEventListener("pagehide", () => telemetry.end());

  return { open, close, current: () => current };
})();
