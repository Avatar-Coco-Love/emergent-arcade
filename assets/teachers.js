// The gallery's teacher page (#/teachers): what used to be docs/teaching.md,
// plus the games-by-subject table (built here from games.json and
// assets/topics.js, so it never lags; each topic has a "Download all as zip",
// assets/bundle.js), the classroom mode link
// (assets/classroom.js) and the "I used this in class" form, sent as a kind
// "classroom" row (assets/feedback.js). docs/gallery.md, "Teacher page".
window.ArcadeTeachers = (function () {
  const { el } = window.ArcadeUI;
  const $ = (id) => document.getElementById(id);
  const config = window.ARCADE_CONFIG || {};
  const Topics = window.ArcadeTopics;
  const Classroom = window.ArcadeClassroom;
  const Feedback = window.ArcadeFeedback;
  const telemetry = window.ArcadeTelemetry;

  let games = [];
  let shown = false;
  let built = false;

  if (config.repo) {
    const blob = `https://github.com/${config.repo}/blob/main`;
    $("teachCodeLink").href = `https://github.com/${config.repo}/tree/main/games`;
    $("teachRulesLink").href = `${blob}/docs/PROJECT_BRIEF.md`;
    $("teachFindingsLink").href = `${blob}/docs/findings.md`;
    $("teachLicenseLink").href = `${blob}/README.md#license`;
  }

  // Every topic some playable game uses, subjects first, then skills (the
  // list's own order), each with its games by title.
  function rows(list) {
    const live = list.filter((g) => g.status !== "archived");
    return Topics.KINDS.flatMap((kind) =>
      Topics.LIST.filter((t) => t.kind === kind)
        .map((t) => ({ topic: t, games: live.filter((g) => (g.topics || []).includes(t.id)).sort((a, b) => a.title.localeCompare(b.title)) }))
        .filter((r) => r.games.length),
    );
  }

  // Every game of the topic in one zip, for offline lab computers
  // (assets/bundle.js). The name starts with the visible text.
  function zipButton(r) {
    const btn = el("button", { type: "button", className: "secondary small teach-zip", textContent: "Download all as zip" });
    btn.setAttribute("aria-label", `Download all as zip: ${r.topic.label}, ${r.games.length} ${r.games.length === 1 ? "game" : "games"}`);
    const status = el("p", { className: "status bundle-status" });
    status.setAttribute("role", "status");
    btn.addEventListener("click", () => window.ArcadeBundle.run(btn, status, r.topic.id, "teachers"));
    return el("div", { className: "teach-zip-wrap" }, [btn, status]);
  }

  function renderTable() {
    const out = [];
    let kind = "";
    for (const r of rows(games)) {
      if (r.topic.kind !== kind) {
        kind = r.topic.kind;
        out.push(el("tr", { className: "teach-kind" }, [el("th", { colSpan: 2, scope: "colgroup", textContent: kind === "subject" ? "Subjects" : "Skills" })]));
      }
      const tr = el("tr", {}, [
        el("th", { scope: "row" }, [
          el("a", { href: `#/?topic=${r.topic.id}`, textContent: r.topic.label }),
          el("span", { className: "teach-about", textContent: r.topic.about }),
        ]),
        el("td", {}, [el("ul", { className: "teach-games" }, r.games.map((g) => el("li", {}, [el("a", { href: `#/play/${g.id}`, textContent: g.title })]))), zipButton(r)]),
      ]);
      tr.dataset.topic = r.topic.id;
      out.push(tr);
    }
    $("teachTopicRows").replaceChildren(...out);
  }

  // Opening a game from the table: the cabinet's ← comes back here, with
  // focus on the same link (a game can sit in several rows).
  let lastLink = null;
  $("teachTopicRows").addEventListener("click", (evt) => {
    const a = evt.target.closest('a[href^="#/play/"]');
    if (!a) return;
    lastLink = a;
    window.dispatchEvent(new CustomEvent("arcade:teachers-open"));
  });

  // ---------- classroom link ----------

  function renderClassroom() {
    const on = Classroom.on();
    $("classForm").hidden = on;
    $("classFormOff").hidden = !on;
  }

  $("classLinkBtn").addEventListener("click", async () => {
    const url = Classroom.link();
    let method = "copy";
    try {
      await navigator.clipboard.writeText(url);
      $("classLinkStatus").textContent = "Copied. Paste it wherever your class finds links.";
      $("classLinkStatus").className = "status ok";
    } catch (_) {
      // No clipboard (an old browser, a frame): select the text to copy by hand.
      method = "select";
      $("classLinkText").focus();
      $("classLinkText").select();
      $("classLinkStatus").textContent = "Copy the selected link.";
      $("classLinkStatus").className = "status";
    }
    telemetry.event("classroom_link", { method });
  });
  $("classLinkText").addEventListener("focus", () => $("classLinkText").select());

  // ---------- "I used this in class" ----------

  const form = $("classForm");
  const text = (id) => $(id).value.trim();
  const sync = () => { $("classSend").disabled = !(text("classWorked") || text("classDidnt")); };
  for (const id of ["classWorked", "classDidnt"]) $(id).addEventListener("input", sync);

  function renderGamePicks() {
    const keep = new Set([...form.querySelectorAll("#classGames input:checked")].map((i) => i.value));
    const list = games.filter((g) => g.status !== "archived").sort((a, b) => a.title.localeCompare(b.title));
    $("classGames").replaceChildren(...list.map((g) => {
      const box = el("input", { type: "checkbox", value: g.id, checked: keep.has(g.id) });
      return el("label", { className: "check" }, [box, el("span", { textContent: g.title })]);
    }));
  }

  function status(t, kind) {
    $("classStatus").textContent = t;
    $("classStatus").className = `status${kind ? " " + kind : ""}`;
  }

  form.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    if ($("classSend").disabled || Classroom.on()) return;
    $("classSend").disabled = true;
    status("Sending…");
    const result = await Feedback.submitClassroom({
      grade: text("classGrade"),
      subject: text("classSubject"),
      games: [...form.querySelectorAll("#classGames input:checked")].map((i) => i.value),
      worked: text("classWorked"),
      didnt: text("classDidnt"),
      contact: text("classContact"),
    });
    if (result.via === "sheet") {
      form.reset();
      sync();
      status("Thank you! Sent.", "ok");
    } else {
      sync();
      status("Couldn't reach the feedback server. ");
      $("classStatus").append(el("a", { href: result.url, target: "_blank", rel: "noopener", textContent: "Send it as a GitHub issue instead" }));
    }
  });

  window.addEventListener("arcade:classroom", renderClassroom);

  // ---------- view ----------

  function show(hash, opts) {
    games = opts.games;
    const wasShown = shown;
    shown = true;
    $("teachersView").hidden = false;
    $("classLinkText").value = Classroom.link();
    if (!built) {
      renderTable();
      renderGamePicks();
      built = true;
    }
    renderClassroom();
    if (!wasShown) telemetry.event("teachers", {});
  }

  function hide() {
    shown = false;
    $("teachersView").hidden = true;
  }

  const current = () => (shown ? "#/teachers" : null);

  // Back from a game: focus the link the teacher used.
  function focusGame(id) {
    const href = `#/play/${id}`;
    const link = lastLink && lastLink.isConnected && lastLink.getAttribute("href") === href ? lastLink : document.querySelector(`#teachTopicRows a[href="${href}"]`);
    if (link) link.focus({ preventScroll: true });
  }

  return { show, hide, current, focusGame, rows };
})();
