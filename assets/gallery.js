(function () {
  const config = window.ARCADE_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const galleryView = $("galleryView");
  const gameList = $("gameList");
  const galleryStatus = $("galleryStatus");
  const cabinet = $("cabinet");
  const frame = $("gameFrame");
  const panel = $("panel");
  const stars = $("stars");
  const comment = $("comment");
  const submitBtn = $("submitBtn");
  const feedbackStatus = $("feedbackStatus");

  const telemetry = window.ArcadeTelemetry;
  const PANEL_TITLES = { about: "How to play", achievements: "Achievements", rate: "Rate this game" };

  let games = [];
  let current = null;
  let openPanelName = null;
  let rating = 0;
  let toastTimer = null;

  if (window.ArcadeTelemetry.enabled) $("telemetryNote").hidden = false;
  if (config.repo) $("repoLink").href = `https://github.com/${config.repo}`;

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    for (const child of children || []) {
      node.append(child);
    }
    return node;
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  // ---------- gallery ----------

  // Card art: the game's own picture from assets/thumbs.js if it has one,
  // else a deterministic little pixel pattern in its accent color.
  function thumb(game) {
    const art = window.ArcadeThumbs && window.ArcadeThumbs[game.id];
    if (art) {
      const box = el("div", { className: "thumb art", ariaHidden: "true" });
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
    return el("div", { className: "thumb", ariaHidden: "true" }, cells);
  }

  function cardMeta(game) {
    const total = (game.achievements || []).length;
    const text = total ? `🏆 ${window.ArcadeAchievements.count(game)}/${total} achievements` : "";
    return el("div", { className: "card-meta", textContent: text });
  }

  function renderGallery() {
    gameList.replaceChildren();
    for (const game of games) {
      const chips = game.mechanics.map((m) =>
        el("span", { className: "chip" }, [el("b", { textContent: m.name }), ` · ${m.verb}`])
      );
      const card = el("a", { className: "game-card", href: `#/play/${game.id}` }, [
        thumb(game),
        el("div", {}, [
          el("h2", { textContent: game.title }),
          el("p", { textContent: game.blurb }),
          el("div", { className: "chips" }, chips),
          cardMeta(game),
        ]),
      ]);
      if (game.accent) card.style.setProperty("--card-accent", game.accent);
      gameList.append(el("li", {}, [card]));
    }
    galleryStatus.textContent = games.length ? "" : "No games yet.";
  }

  // ---------- cabinet ----------

  function openCabinet(game) {
    const src = `games/${game.file}?v=${game.version}`;
    const switching = !current || current.id !== game.id;
    current = game;
    document.title = `${game.title} · Emergent Arcade`;
    $("cabTitle").textContent = game.title;
    frame.title = game.title;
    if (frame.getAttribute("src") !== src) frame.src = src;
    renderAbout();
    renderAchievements();
    if (switching) {
      resetFeedback();
      telemetry.start(game);
    }
    document.body.classList.add("playing");
    cabinet.hidden = false;
    galleryView.hidden = true;

    const introKey = `arcade.seenIntro.${game.id}`;
    if (!storageGet(introKey)) {
      storageSet(introKey, "1");
      openPanel("about");
    } else {
      closePanel();
      syncToolbar();
    }
  }

  function closeCabinet() {
    telemetry.end();
    current = null;
    document.title = "Emergent Arcade";
    frame.removeAttribute("src"); // stop the running game
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    closePanel();
    document.body.classList.remove("playing");
    cabinet.hidden = true;
    galleryView.hidden = false;
    renderGallery(); // refresh achievement counts
  }

  function route() {
    const match = location.hash.match(/^#\/play\/([a-z0-9-]+)/);
    const game = match && games.find((g) => g.id === match[1]);
    if (game) openCabinet(game);
    else closeCabinet();
  }

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

  function openPanel(name) {
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
  }

  function closePanel() {
    if (!openPanelName) return;
    openPanelName = null;
    panel.hidden = true;
    syncToolbar();
    tellGame("arcade:resume");
    telemetry.resume();
    frame.focus();
  }

  for (const btn of document.querySelectorAll(".toolbar [data-panel]")) {
    btn.addEventListener("click", () => {
      if (openPanelName === btn.dataset.panel) closePanel();
      else openPanel(btn.dataset.panel);
    });
  }
  $("playBtn").addEventListener("click", closePanel);
  $("panelClose").addEventListener("click", closePanel);
  $("aboutPlay").addEventListener("click", closePanel);
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && openPanelName) closePanel();
  });

  // A game that loads while a panel is open (first-time intro) starts paused.
  frame.addEventListener("load", () => {
    if (openPanelName) tellGame("arcade:pause");
  });

  // ---------- full screen ----------

  const fullscreenBtn = $("fullscreenBtn");
  // iPhone Safari has no element full screen, so the button only appears where it works.
  fullscreenBtn.hidden = !document.fullscreenEnabled;
  fullscreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else cabinet.requestFullscreen().catch(() => {});
  });

  // ---------- about ----------

  function renderAbout() {
    $("aboutBlurb").textContent = current.blurb;
    $("aboutHow").textContent = current.howToPlay || "";
    $("aboutControls").replaceChildren(
      ...current.mechanics.map((m) =>
        el("li", {}, [el("span", { className: "verb", textContent: m.verb }), el("b", { textContent: m.name }), ` ${m.description}`])
      )
    );
    $("aboutGoal").textContent = current.goal;
    $("aboutState").textContent = `Shared state: ${current.sharedState}`;
  }

  // ---------- achievements ----------

  function renderAchievements() {
    const list = current.achievements || [];
    const got = window.ArcadeAchievements.load(current.id);
    const n = window.ArcadeAchievements.count(current);
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
  });
  $("achResetNo").addEventListener("click", hideResetConfirm);
  $("achResetYes").addEventListener("click", () => {
    window.ArcadeAchievements.reset(current.id);
    hideResetConfirm();
    renderAchievements();
    // The running game remembers what it already announced; reload it so
    // achievements can be earned again right away.
    frame.src = frame.getAttribute("src");
  });

  function showToast(text) {
    const toast = $("toast");
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  }

  window.addEventListener("message", (evt) => {
    const data = evt.data;
    if (!current || evt.source !== frame.contentWindow) return;
    if (!data || data.game !== current.id) return;
    if (data.type === "arcade:result") telemetry.result(data);
    if (data.type !== "arcade:achievement") return;
    if (!window.ArcadeAchievements.unlock(current, data.id)) return;
    telemetry.achievement(data.id);
    const a = current.achievements.find((x) => x.id === data.id);
    showToast(`🏆 Achievement unlocked: ${a.title}`);
    renderAchievements();
  });

  // ---------- rating ----------

  function ratedKey(game) {
    return `arcade.rated.${game.id}.v${game.version}`;
  }

  function setRating(n) {
    rating = n;
    for (const btn of stars.querySelectorAll("button")) {
      const on = Number(btn.dataset.value) <= n;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.value) === n));
    }
    submitBtn.disabled = n === 0;
  }

  function setStatus(text, kind) {
    feedbackStatus.textContent = text;
    feedbackStatus.className = `status${kind ? " " + kind : ""}`;
  }

  function resetFeedback() {
    setRating(0);
    comment.value = "";
    const already = !!storageGet(ratedKey(current));
    setStatus(already ? "You've already rated this version. Feel free to send more." : "");
  }

  for (let i = 1; i <= 5; i++) {
    const btn = el("button", { type: "button", textContent: "★" });
    btn.dataset.value = String(i);
    btn.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
    btn.addEventListener("click", () => setRating(i));
    stars.append(btn);
  }

  $("feedbackForm").addEventListener("submit", async (evt) => {
    evt.preventDefault();
    if (!current || !rating) return;
    const game = current;
    submitBtn.disabled = true;
    setStatus("Sending…");
    const result = await window.ArcadeFeedback.submit(game, rating, comment.value);
    if (result.via === "sheet") {
      storageSet(ratedKey(game), "1");
      setRating(0);
      comment.value = "";
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
      submitBtn.disabled = false;
    }
  });

  // ---------- boot ----------

  fetch("games/games.json", { cache: "no-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      games = data.games || [];
      renderGallery();
      route();
    })
    .catch((err) => {
      galleryStatus.textContent = `Couldn't load the game list (${err.message}). If you opened this file directly, serve the folder instead: python3 -m http.server`;
      galleryStatus.className = "status err";
    });

  window.addEventListener("hashchange", route);

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
})();
