// Classroom mode: a teacher shares <site>?class=1 (the "Copy classroom
// link" button on the teacher page, #/teachers). For whoever opens it:
// no play stats or gallery events are sent, the leaderboard name controls
// are hidden (everyone keeps the made-up name, and with stats off no score
// reaches a board), and the rating button, rate nudge and the teacher
// feedback form are hidden. A note under the header says so, with "Turn off".
//
// It persists in this browser (arcade.classroom) until turned off, so a lab
// computer stays in it from one lesson to the next, and it carries into
// every game: the cabinet is part of this page, so #/play/<id> and
// #/daily keep it. Games themselves don't know about it (they never send
// anything; the gallery does). ?class=0 turns it off. Anyone who never
// opened such a link sees no change. docs/gallery.md, "Classroom mode".
window.ArcadeClassroom = (function () {
  const config = window.ARCADE_CONFIG || {};
  const store = window.ArcadeUI.store;
  const KEY = "arcade.classroom";
  // Also kept in memory, so the link works when storage is blocked.
  let forced = null;

  const params = new URLSearchParams(location.search);
  if (params.has("class")) {
    forced = params.get("class") !== "0";
    if (forced) store.set(KEY, "1");
    else store.remove(KEY);
    // Tidy the address bar; a reload keeps the mode through storage.
    params.delete("class");
    const q = params.toString();
    try { history.replaceState(null, "", `${location.pathname}${q ? `?${q}` : ""}${location.hash}`); } catch (_) {}
  }

  const on = () => (forced !== null ? forced : store.get(KEY) === "1");

  function apply() {
    document.documentElement.classList.toggle("classroom", on());
  }

  function set(value) {
    forced = !!value;
    if (value) store.set(KEY, "1");
    else store.remove(KEY);
    apply();
    window.dispatchEvent(new CustomEvent("arcade:classroom", { detail: { on: !!value } }));
  }

  // The link to hand out: the published site when we're on it, else this page.
  function link() {
    const here = `${location.origin}${location.pathname}`;
    const base = config.siteUrl && here.startsWith(config.siteUrl.replace(/\/$/, "")) ? config.siteUrl : here;
    return `${base}?class=1`;
  }

  apply();
  return { on, set, link, KEY };
})();
