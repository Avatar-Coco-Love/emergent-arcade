// Site-wide settings for the gallery. Edit and open a PR to change them.
window.ARCADE_CONFIG = {
  // GitHub repo used for the "send feedback as a GitHub issue" fallback and
  // for the "Source on GitHub" footer link.
  repo: "Avatar-Coco-Love/emergent-arcade",

  // "Support this arcade" link in the gallery footer. Leave empty to hide it.
  supportUrl: "https://cash.app/$InnerTemple92",

  // Where the site is published. Link previews (Facebook, Messenger) need
  // absolute URLs, and on this host the share button hands out
  // <siteUrl>play/<id>/, a page with that game's preview card that forwards
  // to #/play/<id> (built at deploy by scripts/build-share-pages.mjs).
  siteUrl: "https://avatar-coco-love.github.io/emergent-arcade/",

  // URL of the deployed Google Apps Script web app that stores feedback in a
  // Google Sheet (see docs/feedback-backend.md). While this is empty, the
  // feedback form falls back to opening a pre-filled GitHub issue instead.
  feedbackEndpoint: "https://script.google.com/macros/s/AKfycbzg26T2z8Twbbpk3adHRhBh7QgsqbnlR1R4Juzx0WAx41iRwe1YejuyRmZ_CFZrfCcf/exec",

  // Anonymous play telemetry (session length, round results, achievements),
  // sent to the same web app as feedback, which stores it in the "telemetry"
  // tab. Needs a non-empty feedbackEndpoint. See docs/telemetry.md.
  telemetry: true,
};
