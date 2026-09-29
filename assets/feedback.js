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

  // Resolves to { via: "sheet" } or { via: "github", url }.
  async function submit(game, rating, comment, tags) {
    const payload = buildPayload(game, rating, comment, tags);
    if (config.feedbackEndpoint) {
      try {
        // text/plain keeps this a CORS "simple request" (no preflight), which
        // Apps Script web apps require.
        const res = await fetch(config.feedbackEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data && data.ok) return { via: "sheet" };
        throw new Error((data && data.error) || "rejected");
      } catch (err) {
        console.warn("Feedback endpoint failed, falling back to GitHub issue:", err);
      }
    }
    return { via: "github", url: issueUrl(payload) };
  }

  return { submit, clientId, buildPayload, issueUrl, MAX_COMMENT, TAGS };
})();
