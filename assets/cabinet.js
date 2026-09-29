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
  });

  $("retryBtn").addEventListener("click", () => {
    if (current) load(`games/${current.file}?v=${current.version}`);
  });

  // Games listen for these to freeze while a panel covers them.
  function tellGame(type) {
    if (frame.contentWindow) frame.contentWindow.postMessage({ type }, "*");
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
    $("panelTitle").textContent = PANEL_TITLES[name];
    for (const body of panel.querySelectorAll("[data-body]")) body.hidden = body.dataset.body !== name;
    syncToolbar();
    if (name === "achievements") {
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
    const url = playUrl(game);
    let method = "copy";
    // Phones get the system share sheet; everything else copies the link.
    if (navigator.share && UI.touch()) {
      try {
        await navigator.share({ title: `${game.title} · Emergent Arcade`, text: game.blurb, url });
        method = "share";
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    if (method === "copy") {
      try {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      } catch (_) {
        method = "prompt";
        window.prompt("Copy this link:", url);
      }
    }
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
          el("span", { className: "verb-tag", textContent: m.verb }),
          el("div", {}, [el("b", { textContent: m.name }), el("span", { className: "desc", textContent: m.description })]),
        ])
      )
    );
    $("aboutBlurb").textContent = g.blurb;
    $("aboutHow").textContent = g.howToPlay || "";
    showAllChanges = false;
    renderChanges();
    const archived = g.status === "archived" ? " · archived (still playable)" : "";
    $("aboutMeta").textContent = `Version ${g.version} · added ${UI.shortDate(g.added)} · updated ${UI.shortDate(g.updated)}${archived}`;
    $("aboutState").textContent = `Shared state: ${g.sharedState}`;
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
      telemetry.result(data);
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
