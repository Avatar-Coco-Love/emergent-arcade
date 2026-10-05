// Feedback submission. Two transports:
//  1. ARCADE_CONFIG.feedbackEndpoint set -> POST JSON to the Google Apps Script
//     web app, which appends a row to the feedback Google Sheet.
//  2. Not set (or the POST fails) -> open a pre-filled GitHub issue so the
//     feedback still lands somewhere queryable.
window.ArcadeFeedback = (function () {
  const config = window.ARCADE_CONFIG || {};
  const MAX_COMMENT = 1000;
  // Quick tags a player can add to a rating or comment. Backend v3 keeps the
  // `tags` array in the row's extra cell (docs/backend-api.md).
  const TAGS = ["fun", "confusing", "too hard", "too easy", "buggy"];

  function clientId() {
    // Anonymous per-browser id, only used to spot duplicate submissions.
    const key = "arcade.clientId";
    try {
      let id = localStorage.getItem(key);
      if (!id) {
        id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
        localStorage.setItem(key, id);
      }
      return id;
    } catch (_) {
      return "";
    }
  }

  // A rating (1-5) or a comment is required; the other is optional.
  function buildPayload(game, rating, comment, tags) {
    const payload = {
      game_id: game.id,
      game_version: game.version,
      rating: rating >= 1 && rating <= 5 ? rating : "",
      comment: (comment || "").trim().slice(0, MAX_COMMENT),
      client_id: clientId(),
      submitted_at: new Date().toISOString(),
    };
    const clean = (tags || []).filter((t) => TAGS.includes(t));
    if (clean.length) payload.tags = clean;
    return payload;
  }

  function issueUrl(payload) {
    const r = payload.rating;
    const title = `[feedback] ${payload.game_id} v${payload.game_version}: ${r ? `${r}/5` : "comment"}`;
    const body = [
      `**Game:** \`${payload.game_id}\` (version ${payload.game_version})`,
      r ? `**Rating:** ${"★".repeat(r)}${"☆".repeat(5 - r)} (${r}/5)` : "**Rating:** _(none, comment only)_",
      ...(payload.tags ? [`**Tags:** ${payload.tags.join(", ")}`] : []),
      "",
      "**Comment:**",
      payload.comment || "_(none)_",
      "",
      "<!-- submitted from the Emergent Arcade gallery -->",
    ].join("\n");
    const params = new URLSearchParams({ title, body, labels: "feedback" });
    return `https://github.com/${config.repo}/issues/new?${params}`;
  }

  // POSTs one row to the endpoint. Resolves true when the sheet stored it.
  async function post(payload) {
    if (!config.feedbackEndpoint) return false;
    try {
      // text/plain keeps this a CORS "simple request" (no preflight), which
      // Apps Script web apps require.
      const res = await fetch(config.feedbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data && data.ok) return true;
      throw new Error((data && data.error) || "rejected");
    } catch (err) {
      console.warn("Feedback endpoint failed, falling back to GitHub issue:", err);
      return false;
    }
  }

  // Resolves to { via: "sheet" } or { via: "github", url }.
  async function submit(game, rating, comment, tags) {
    const payload = buildPayload(game, rating, comment, tags);
    if (await post(payload)) return { via: "sheet" };
    return { via: "github", url: issueUrl(payload) };
  }

  // "I used this in class" (the teacher page, #/teachers): a kind
  // "classroom" row, which backend v3 keeps in the events tab with no
  // redeploy (docs/backend-api.md). Every field is optional except some
  // text in worked or didnt. Read back with scripts/fetch-feedback.mjs.
  const CLASS_TEXT = 500; // the backend keeps strings up to 500 chars
  function classroomPayload(f) {
    const text = (v, n) => String(v || "").trim().slice(0, n || CLASS_TEXT);
    const payload = {
      kind: "classroom",
      grade: text(f.grade, 60),
      subject: text(f.subject, 80),
      games: (f.games || []).filter((id) => /^[a-z0-9-]{1,40}$/.test(id)).slice(0, 32),
      worked: text(f.worked),
      didnt: text(f.didnt),
      client_id: clientId(),
      submitted_at: new Date().toISOString(),
    };
    const contact = text(f.contact, 120);
    if (contact) payload.contact = contact;
    return payload;
  }

  // The GitHub fallback leaves the contact out: issues are public, and the
  // teacher is signed in to GitHub anyway.
  function classroomIssueUrl(p) {
    const title = `[feedback] classroom: ${p.subject || "subject not given"}${p.grade ? ` (${p.grade})` : ""}`;
    const body = [
      `**Grade / age:** ${p.grade || "_(not given)_"}`,
      `**Subject:** ${p.subject || "_(not given)_"}`,
      `**Games:** ${p.games.length ? p.games.map((id) => `\`${id}\``).join(", ") : "_(not given)_"}`,
      "",
      "**What worked:**",
      p.worked || "_(nothing written)_",
      "",
      "**What didn't:**",
      p.didnt || "_(nothing written)_",
      "",
      "<!-- submitted from the Emergent Arcade teacher page -->",
    ].join("\n");
    const params = new URLSearchParams({ title, body, labels: "feedback" });
    return `https://github.com/${config.repo}/issues/new?${params}`;
  }

  async function submitClassroom(fields) {
    const payload = classroomPayload(fields);
    if (await post(payload)) return { via: "sheet" };
    return { via: "github", url: classroomIssueUrl(payload) };
  }

  return { submit, submitClassroom, classroomPayload, clientId, buildPayload, issueUrl, MAX_COMMENT, TAGS };
})();
