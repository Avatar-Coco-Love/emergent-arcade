// The gallery's Records view (#/records): every game's leaderboard on one
// page, so players can see who leads and where they stand without opening
// each cabinet. One row per game: its headline board's leader and this
// browser's best and place; a row expands to the board picker and top 10
// (the same list as the cabinet's 🏆 panel). "My bests" keeps the games
// this browser has a best in (#/records?mine=1). docs/scores.md.
window.ArcadeRecords = (function () {
  const UI = window.ArcadeUI;
  const { el } = UI;
  const $ = (id) => document.getElementById(id);
  const Scores = window.ArcadeScores;
  const Cabinet = window.ArcadeCabinet;
  const telemetry = window.ArcadeTelemetry;

  let games = [];
  let thumb = () => null;
  let mine = false;
  let data = null;
  let shown = false;
  const open = new Map(); // game id -> board picked in an expanded row

  const hashFor = (m) => (m ? "#/records?mine=1" : "#/records");
  const sending = () => Scores.listed() && telemetry.active();

  function parse(hash) {
    const i = hash.indexOf("?");
    return new URLSearchParams(i >= 0 ? hash.slice(i + 1) : "").get("mine") === "1";
  }

  // Shows the view for a #/records hash. opts: { games, thumb }.
  function show(hash, opts) {
    games = opts.games;
    thumb = opts.thumb;
    const wasShown = shown;
    mine = parse(hash);
    shown = true;
    $("recordsView").hidden = false;
    render();
    if (!wasShown) telemetry.event("records", { mine: mine ? 1 : 0 });
    Scores.leaderboards().then((d) => {
      data = d;
      if (shown) render();
    });
  }

  function hide() {
    shown = false;
    nameCtl.close();
    $("recordsView").hidden = true;
  }

  const hasBest = (g) => Object.keys(Scores.bests(g)).length > 0;

  function render() {
    for (const b of document.querySelectorAll("#recordsFilter .verb-chip")) {
      b.setAttribute("aria-pressed", String((b.dataset.mine === "1") === mine));
    }
    const scored = games.filter((g) => Scores.spec(g));
    const active = scored.filter((g) => g.status !== "archived");
    // Archived games only show when someone has a score in them.
    const archived = scored.filter((g) => g.status === "archived" && (hasBest(g) || Scores.boardsOf(g, data).some((b) => Scores.top(data, g, b).length)));
    const list = [...active, ...archived].filter((g) => !mine || hasBest(g));
    // Rows are rebuilt (the leaderboard arrives after the first draw), so
    // focus moves to the same control in the new row.
    const f = document.activeElement;
    const was = f && f.closest && f.closest(".rec-row");
    const part = !was ? "" : f.classList.contains("rec-play") ? ".rec-play" : f.tagName === "SELECT" ? "select" : "summary";
    $("recordsList").replaceChildren(...list.map(row));
    const again = was && document.querySelector(`.rec-row[data-id="${was.dataset.id}"] ${part}`);
    if (again) again.focus({ preventScroll: true });
    $("recordsEmpty").hidden = list.length > 0;
    renderSummary(scored);
    $("recordsNote").textContent = Cabinet.lbNote(data, "");
  }

  // "Your bests: 9 boards in 4 games · 🥇 first on 2", then the name controls.
  function renderSummary(scored) {
    let boards = 0;
    let gamesWith = 0;
    let firsts = 0;
    for (const g of scored) {
      const b = Object.keys(Scores.bests(g));
      if (!b.length) continue;
      gamesWith++;
      boards += b.length;
      if (sending()) for (const board of b) {
        const st = Scores.standings(data, g, board, true);
        if (st.mine && st.mine.place === 1) firsts++;
      }
    }
    const parts = [];
    if (!gamesWith) parts.push("No bests yet. Finish a round in any game to set one.");
    else {
      parts.push(`Your bests: ${boards} board${boards === 1 ? "" : "s"} in ${gamesWith} game${gamesWith === 1 ? "" : "s"}`);
      if (firsts) parts.push(`🥇 first on ${firsts}`);
    }
    $("recordsSummary").replaceChildren(parts.join(" · "));
    nameCtl.render(data);
  }

  // The same name controls as the cabinet's 🏆 panel; a change redraws the
  // rows, since "(you)" and your place follow the name and the opt-out.
  const nameCtl = window.ArcadeNameCtl.create("rec", { toast: UI.toaster($("galleryToasts"), 3), onChange: render });
  $("recordsName").replaceChildren(nameCtl.node);

  function row(game) {
    const sp = Scores.spec(game);
    const board = open.get(game.id) || Scores.headline(data, game);
    const st = Scores.standings(data, game, board, sending());
    const leader = st.rows[0];
    const best = Scores.bests(game)[board];
    const where = Scores.boardName(board);

    const lead = leader
      ? el("span", { className: "rec-lead" }, ["🥇 ", el("bdi", { textContent: leader.h }), leader.me ? " (you)" : "", " ", el("b", { textContent: Scores.format(sp, leader.s) })])
      : el("span", { className: "rec-lead muted", textContent: data ? "No scores yet. Be the first." : "Leaderboard not available here." });
    let you;
    if (st.mine) you = el("span", { className: "rec-you" }, [`You #${st.mine.place} `, el("b", { textContent: Scores.format(sp, st.mine.s) })]);
    else if (best) you = el("span", { className: "rec-you" }, ["Your best ", el("b", { textContent: Scores.format(sp, best.score) })]);
    else you = el("span", { className: "rec-you muted", textContent: "No best yet" });

    const summary = el("summary", { className: "rec-summary" }, [
      thumb(game, true),
      el("span", { className: "rec-main" }, [
        el("span", { className: "rec-title" }, [el("span", { textContent: game.title }), el("span", { className: "rec-board", textContent: ` ${where ? `${where} · ` : ""}${sp.label}` })]),
        el("span", { className: "rec-line" }, [lead, you]),
      ]),
    ]);
    const details = el("details", { className: "rec-details" }, [summary, el("div", { className: "rec-body" })]);
    details.open = open.has(game.id);
    if (details.open) fillBody(details, game, board);
    details.addEventListener("toggle", () => {
      if (details.open) {
        if (!open.has(game.id)) open.set(game.id, board);
        fillBody(details, game, open.get(game.id));
      } else open.delete(game.id);
    });
    const play = el("a", { className: "tool rec-play", href: `#/play/${game.id}`, ariaLabel: `Play ${game.title}`, title: `Play ${game.title}`, textContent: "▶︎" });
    play.addEventListener("click", () => window.dispatchEvent(new CustomEvent("arcade:records-open")));
    const li = el("li", { className: "rec-row" }, [details, play]);
    li.dataset.id = game.id;
    if (game.accent) li.style.setProperty("--card-accent", game.accent);
    return li;
  }

  function fillBody(details, game, board) {
    const body = details.querySelector(".rec-body");
    const boards = Scores.boardsOf(game, data);
    const parts = [];
    if (boards.length > 1) {
      const id = `recPick-${game.id}`;
      const pick = el("select", { id }, boards.map((b) => el("option", { value: b, textContent: Scores.boardName(b) || "Main", selected: b === board })));
      pick.addEventListener("change", () => {
        open.set(game.id, pick.value);
        const li = details.closest(".rec-row");
        const fresh = row(game);
        li.replaceWith(fresh);
        fresh.querySelector("select").focus();
      });
      parts.push(el("div", { className: "board-pick" }, [el("label", { htmlFor: id, textContent: "Board" }), pick]));
    }
    parts.push(el("ol", { className: "lb-list" }, Cabinet.lbItems(game, board, data, sending())));
    body.replaceChildren(...parts);
  }

  // Filter chips: replace the history entry, like the gallery's filters.
  for (const b of document.querySelectorAll("#recordsFilter .verb-chip")) {
    b.addEventListener("click", () => {
      mine = b.dataset.mine === "1";
      history.replaceState(null, "", hashFor(mine));
      render();
      b.focus();
    });
  }

  const current = () => (shown ? hashFor(mine) : null);

  return { show, hide, current };
})();
