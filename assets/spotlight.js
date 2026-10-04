// The gallery's Spotlight view (#/spotlight): which games need playtesters
// and what to look for. It sorts every game into a group from the hourly
// tallies of its current version (leaderboards.json's `spotlight` block,
// built by scripts/build-leaderboards.mjs), so the page follows the data
// with no edits: a revision starts its game over as "Needs first players".
// Each row shows the longest any one player spent in the game against the
// arcade's 10-minute goal. docs/gallery.md, "Spotlight".
window.ArcadeSpotlight = (function () {
  const { el } = window.ArcadeUI;
  const $ = (id) => document.getElementById(id);
  const Scores = window.ArcadeScores;
  const telemetry = window.ArcadeTelemetry;

  const GOAL = 600; // seconds: the depth pass's 10-minute target (docs/ROADMAP.md)
  const FEW_PLAYERS = 3; // fewer players than this: "Needs first players"
  const STUCK_RATE = 0.45; // win rate below this, over STUCK_ROUNDS+: "Players get stuck"
  const STUCK_ROUNDS = 3;
  const CLOSE = 300; // a player this long (5 min): "Closest to 10 minutes"
  const EARLY_SHARE = 0.4; // this share of visits ending before a round: "Lost in the first minute"
  const EARLY_VISITS = 4;

  // Most urgent first; a game goes in the first group it qualifies for.
  const GROUPS = [
    { key: "done", title: "Past 10 minutes", ask: "Someone played one of these for 10 minutes or more. Can you beat the leaderboard?", tone: "good" },
    { key: "fresh", title: "Needs first players", ask: "New, just revised, or barely played. Does the goal make sense within a minute?", tone: "accent" },
    { key: "stuck", title: "Players get stuck", ask: "Most rounds end in a loss. Where did you get stuck, and did it feel fair?", tone: "bad" },
    { key: "close", title: "Closest to 10 minutes", ask: "These hold people longest. Play long and tell us when it starts to feel samey.", tone: "good" },
    { key: "early", title: "Lost in the first minute", ask: "Many visits end before a round is finished. What made you unsure what to do?", tone: "star" },
    { key: "steady", title: "Need more players", ask: "Going fine so far, but too few people have played to be sure.", tone: "muted" },
  ];
  // The three picks at the top: one game from each of these groups, in
  // order, then the rest to fill.
  const PICK_FROM = ["fresh", "stuck", "close", "early", "done", "steady"];

  let games = [];
  let thumb = () => null;
  let data = null;
  let shown = false;
  let lastList = "#spotlightGroups"; // where the last Play link was, for focus on return
  let loaded = false; // leaderboards.json answered (with data or null)

  function stats(game) {
    const t = data && data.spotlight && data.spotlight.games && data.spotlight.games[game.id];
    const ok = t && Number(t.v) === game.version;
    const secs = ok ? Object.values(t.players || {}).map((n) => Number(n) || 0) : [];
    const n = (k) => (ok ? Math.max(0, Number(t[k]) || 0) : 0);
    return { players: secs.length, longest: secs.length ? Math.max(...secs) : 0, sessions: n("sessions"), early: n("early"), rounds: n("rounds"), wins: n("wins") };
  }

  function group(s) {
    if (s.longest >= GOAL) return "done";
    if (s.players < FEW_PLAYERS) return "fresh";
    if (s.rounds >= STUCK_ROUNDS && s.wins / s.rounds < STUCK_RATE) return "stuck";
    if (s.longest >= CLOSE) return "close";
    if (s.sessions >= EARLY_VISITS && s.early / s.sessions >= EARLY_SHARE) return "early";
    return "steady";
  }

  // Within a group, the game that most needs a player first.
  const urgency = {
    done: (a, b) => b.s.longest - a.s.longest,
    fresh: (a, b) => a.s.players - b.s.players || String(b.g.updated).localeCompare(String(a.g.updated)),
    stuck: (a, b) => a.s.wins / a.s.rounds - b.s.wins / b.s.rounds,
    close: (a, b) => b.s.longest - a.s.longest,
    early: (a, b) => b.s.early / b.s.sessions - a.s.early / a.s.sessions,
    steady: (a, b) => a.s.players - b.s.players,
  };

  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;

  // One plain line of what the data says, for the group's question.
  function fact(s, key) {
    if (!s.sessions) return "No plays of this version yet";
    const parts = [plural(s.players, "player")];
    if (key === "early") parts.push(`${s.early} of ${s.sessions} visits ended before a round`);
    else if (s.rounds) parts.push(`${Math.round((100 * s.wins) / s.rounds)}% of rounds won`);
    else parts.push("no rounds finished yet");
    if (key !== "early" && s.sessions >= EARLY_VISITS && s.early / s.sessions >= EARLY_SHARE) parts.push(`${s.early} of ${s.sessions} visits ended before a round`);
    return parts.join(" · ");
  }

  function meter(s) {
    const pct = Math.min(100, (100 * s.longest) / GOAL);
    const bar = el("span", { className: "spot-bar" }, [el("span", { className: "spot-fill" }), el("span", { className: "spot-goal" })]);
    bar.firstChild.style.width = `${pct}%`;
    return el("span", { className: "spot-meter", role: "img", ariaLabel: `Longest player ${clock(s.longest)} of the 10-minute goal` }, [
      bar,
      el("span", { className: "spot-scale", ariaHidden: "true" }, [el("span", {}, ["longest player ", el("b", { textContent: s.longest ? clock(s.longest) : "none yet" })]), el("span", { textContent: "10:00" })]),
    ]);
  }

  function playLink(game, cls, label) {
    const a = el("a", { className: cls, href: `#/play/${game.id}`, textContent: label, ariaLabel: `Play ${game.title}` });
    a.addEventListener("click", () => {
      lastList = a.closest("#spotlightPicks") ? "#spotlightPicks" : "#spotlightGroups";
      window.dispatchEvent(new CustomEvent("arcade:spotlight-open"));
    });
    return a;
  }

  function card(item, pick) {
    const { g: game, s, key } = item;
    const grp = GROUPS.find((x) => x.key === key);
    const li = el("li", { className: `spot-card tone-${grp.tone}${pick ? " pick" : ""}` }, [
      el("div", { className: "spot-top" }, [
        thumb(game, true),
        el("div", { className: "spot-name" }, [
          pick ? el("span", { className: "spot-chip", textContent: grp.title }) : null,
          el("h4", { textContent: game.title }),
        ].filter(Boolean)),
      ]),
      el("p", { className: "spot-blurb", textContent: game.blurb || "" }),
      el("p", { className: "spot-fact", textContent: fact(s, key) }),
      meter(s),
      playLink(game, pick ? "spot-play big" : "spot-play", `Play ${game.title} →`),
    ]);
    li.dataset.id = game.id;
    if (game.accent) li.style.setProperty("--card-accent", game.accent);
    return li;
  }

  function render() {
    // Cards are rebuilt (the stats arrive after the first draw), so focus
    // moves to the same card's Play link in the new list.
    const f = document.activeElement;
    const was = f && f.closest && f.closest(".spot-card");
    const inPicks = !!(was && was.closest("#spotlightPicks"));
    const items = games.filter((g) => g.status !== "archived").map((g) => {
      const s = stats(g);
      return { g, s, key: group(s) };
    });
    const by = {};
    for (const grp of GROUPS) by[grp.key] = items.filter((i) => i.key === grp.key).sort(urgency[grp.key]);

    // Summary line.
    const withData = items.filter((i) => i.s.sessions);
    const top = withData.reduce((m, i) => (!m || i.s.longest > m.s.longest ? i : m), null);
    const done = by.done.length;
    $("spotlightStats").replaceChildren(
      ...[
        [`${done} of ${items.length}`, `games have held a player for 10 minutes`],
        [top ? clock(top.s.longest) : "–", top ? `longest single player (${top.g.title})` : "longest single player"],
        [String(by.fresh.length), by.fresh.length === 1 ? "game needs its first players" : "games need their first players"],
      ].map(([b, t]) => el("div", { className: "spot-stat" }, [el("b", { textContent: b }), el("span", { textContent: t })])),
    );

    // Picks: the most urgent game of each group in PICK_FROM order.
    const picks = [];
    for (const key of PICK_FROM) if (by[key][0] && picks.length < 3) picks.push(by[key][0]);
    $("spotlightPicks").replaceChildren(...picks.map((i) => card(i, true)));
    $("spotlightPicksWrap").hidden = !loaded || !picks.length;

    $("spotlightGroups").replaceChildren(
      ...GROUPS.filter((grp) => by[grp.key].length).map((grp) =>
        el("section", { className: `spot-group tone-${grp.tone}`, ariaLabel: grp.title }, [
          el("h3", { className: "spot-group-title" }, [el("span", { className: "spot-dot", ariaHidden: "true" }), grp.title, el("span", { className: "muted spot-count", textContent: ` ${by[grp.key].length}` })]),
          el("p", { className: "muted spot-ask", textContent: grp.ask }),
          el("ul", { className: "spot-list" }, by[grp.key].map((i) => card(i, false))),
        ]),
      ),
    );

    if (was) {
      const again = document.querySelector(`${inPicks ? "#spotlightPicks" : "#spotlightGroups"} .spot-card[data-id="${was.dataset.id}"] .spot-play`);
      if (again) again.focus({ preventScroll: true });
    }

    const note = $("spotlightNote");
    // Until the file answers, groups would all read "Needs first players".
    $("spotlightGroups").hidden = !loaded;
    if (!loaded) note.textContent = "Loading play stats…";
    else if (!data || !data.spotlight) note.textContent = "Play stats aren't available here, so every game shows as needing players.";
    else {
      const at = Date.parse(data.updated_at || "");
      const mins = at ? Math.max(0, Math.round((Date.now() - at) / 60000)) : null;
      const when = mins == null ? "" : mins < 2 ? "Updated just now. " : mins < 120 ? `Updated ${mins} minutes ago. ` : `Updated ${Math.round(mins / 60)} hours ago. `;
      note.textContent = `${when}Counts each game's current version from anonymous play stats, rebuilt every hour. A new version starts its count over.`;
    }
  }

  function show(hash, opts) {
    games = opts.games;
    thumb = opts.thumb;
    const wasShown = shown;
    shown = true;
    $("spotlightView").hidden = false;
    render();
    if (!wasShown) telemetry.event("spotlight", {});
    Scores.leaderboards().then((d) => {
      data = d;
      loaded = true;
      if (shown) render();
    });
  }

  function hide() {
    shown = false;
    $("spotlightView").hidden = true;
  }

  const current = () => (shown ? "#/spotlight" : null);

  // Back from a game: focus the Play link the player used.
  function focusGame(id) {
    const link = document.querySelector(`${lastList} .spot-card[data-id="${id}"] .spot-play`) || document.querySelector(`.spot-card[data-id="${id}"] .spot-play`);
    if (link) link.focus({ preventScroll: true });
  }

  return { show, hide, current, focusGame, group, GOAL };
})();
