(function () {
  const config = window.ARCADE_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const galleryView = $("galleryView");
  const playerView = $("playerView");
  const gameList = $("gameList");
  const galleryStatus = $("galleryStatus");
  const frame = $("gameFrame");
  const stars = $("stars");
  const comment = $("comment");
  const submitBtn = $("submitBtn");
  const feedbackStatus = $("feedbackStatus");

  let games = [];
  let current = null;
  let rating = 0;
  let toastTimer = null;

  if (config.repo) $("repoLink").href = `https://github.com/${config.repo}`;

  // ---------- gallery ----------

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    for (const child of children || []) {
      node.append(child);
    }
    return node;
  }

  // Deterministic little pixel pattern per game so cards look distinct
  // without any image assets.
  function thumb(game) {
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

  // ---------- player ----------

  function showPlayer(game) {
    current = game;
    const src = `games/${game.file}?v=${game.version}`;
    document.title = `${game.title} · Emergent Arcade`;
    $("playerTitle").textContent = game.title;
    $("playerOpen").href = src;
    $("playerMechanics").replaceChildren(
      ...game.mechanics.map((m) =>
        el("li", {}, [el("b", { textContent: m.name }), ` (${m.verb}): ${m.description}`])
      )
    );
    $("playerGoal").textContent = game.goal ? `Goal: ${game.goal}` : "";
    $("playerState").textContent = `Shared state: ${game.sharedState}`;
    frame.title = game.title;
    if (frame.getAttribute("src") !== src) frame.src = src;
    renderAchievements();
    resetFeedback();
    galleryView.hidden = true;
    playerView.hidden = false;
    window.scrollTo(0, 0);
  }

  function showGallery() {
    current = null;
    document.title = "Emergent Arcade";
    frame.removeAttribute("src"); // stop the running game
    playerView.hidden = true;
    galleryView.hidden = false;
    renderGallery(); // refresh achievement counts
  }

  // ---------- frame sizing ----------
  // The frame is resized to the game's content height so the game never
  // scrolls separately from the page. Game pages often use height: 100% for
  // standalone play, which would grow with the frame forever, so the gallery
  // switches them to natural height while embedded.

  const MAX_FRAME_PX = 3000;

  function fitFrame() {
    let doc;
    try { doc = frame.contentDocument; } catch (_) { return; }
    if (!doc || !doc.body) return;
    const body = doc.body;
    const bottom = body.getBoundingClientRect().bottom + parseFloat(getComputedStyle(body).marginBottom || 0);
    const h = Math.min(Math.ceil(bottom + (frame.contentWindow.scrollY || 0)), MAX_FRAME_PX);
    if (h > 0 && frame.style.height !== `${h}px`) frame.style.height = `${h}px`;
  }

  frame.addEventListener("load", () => {
    let doc;
    try { doc = frame.contentDocument; } catch (_) { return; }
    if (!doc || !doc.body) return;
    const style = doc.createElement("style");
    style.textContent = "html, body { height: auto !important; min-height: 0 !important; overflow: hidden !important; }";
    doc.head.append(style);
    fitFrame();
    const RO = frame.contentWindow.ResizeObserver;
    if (RO) new RO(fitFrame).observe(doc.body);
  });

  // ---------- achievements ----------

  function renderAchievements() {
    const list = current.achievements || [];
    const got = window.ArcadeAchievements.load(current.id);
    $("achCount").textContent = list.length ? `${window.ArcadeAchievements.count(current)}/${list.length}` : "";
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
    $("achTitle").parentElement.hidden = list.length === 0;
  }

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
    if (!data || data.type !== "arcade:achievement" || data.game !== current.id) return;
    if (!window.ArcadeAchievements.unlock(current, data.id)) return;
    const a = current.achievements.find((x) => x.id === data.id);
    showToast(`🏆 Achievement unlocked: ${a.title}`);
    renderAchievements();
  });

  function route() {
    const match = location.hash.match(/^#\/play\/([a-z0-9-]+)/);
    const game = match && games.find((g) => g.id === match[1]);
    if (game) showPlayer(game);
    else showGallery();
  }

  // ---------- feedback form ----------

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
    let already = false;
    try { already = !!localStorage.getItem(ratedKey(current)); } catch (_) {}
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
      try { localStorage.setItem(ratedKey(game), "1"); } catch (_) {}
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
})();
