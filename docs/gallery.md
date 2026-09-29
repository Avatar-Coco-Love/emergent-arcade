# Gallery and cabinet

The platform around the games: `index.html` and `assets/`. Games never
depend on any of it (each one still plays when its file is opened
directly). Read this file, not old PR bodies, before changing the gallery.
Check changes with `node scripts/smoke-gallery.mjs` (Playwright, one line
per check at 360×740, 740×360 and 1280×800; screenshots go to `--out`).

Playtest (private artifact, feedback/telemetry disabled in that copy):
https://claude.ai/artifact/26WTJMqdPT9oZ5PcocXhuC

## Files

| file | what |
|---|---|
| `assets/ui.js` | `ArcadeUI`: `el()`, safe `store`, `shortDate`, stacking `toaster`, `trapFocus`, `saveFile`, `share` (share sheet / copy / prompt) |
| `assets/wording.js` | `ArcadeWording`: tap or click (see below). Also run by the Node scripts through `scripts/wording.mjs` |
| `assets/progress.js` | `ArcadeProgress`: every per-browser key, New/Updated badges, recent games, export/import/reset, telemetry opt-out |
| `assets/download.js` | `ArcadeDownload`: standalone copy of a game (header comment + shim) |
| `assets/cabinet.js` | `ArcadeCabinet.open(game)` / `close()`: toolbar, panels, ⋯ menu, toasts, loading/error states, share, download, rating, nudge |
| `assets/gallery.js` | cards, search/sort/verb filter, continue row, archive, header total, ⚙ settings, "About the arcade", routing, boot |

Script order in `index.html`: config, ui, wording, feedback, achievements, progress,
telemetry, thumbs, download, cabinet, gallery.

## Tap or click

Manifest text uses placeholders (`{tap}`, `{Tap}`, `{finger}`, `{hold}`,
`{press}`…; the list is in `docs/adding-a-game.md`). On load, the gallery
checks `matchMedia("(pointer: coarse)")` once: a finger as the main input
gets "tap", "finger", "hold"; a mouse gets "click", "pointer", "click and
hold". A touchscreen laptop gets its main input's words. `Wording.game()`
fills every prose field of each manifest entry before anything renders, so
the cards, ⓘ panel, achievements, What's new and callouts all agree. Verbs
stay keys (`?verb=tap` in the hash, telemetry); only their labels change:
card chips, verb filter chips, the ⓘ panel's verb tags, and the "(tap,
drag, hold…)" line in About the arcade (`data-verb`).

The optional `keyboard` line (keys, like "← → to tilt") shows as a "keys"
row under the verbs, and only with a fine pointer.

Game files show their own hints ("Tap the sky to place your first
planet.") and canvas `aria-label`s; those still say tap on PC (see open
ideas).

## Routes

- `#/play/<id>`: a game's cabinet. The link people share.
- `#/` or `#/?sort=<new|updated|title|left>&verb=<verb>&q=<text>`: the
  gallery with its view state. Filter changes use `history.replaceState`,
  so they don't fill the back history. The cabinet's ← goes back to the
  same view. An unknown id shows the gallery with a notice.

## Per-browser storage

| key | value |
|---|---|
| `arcade.achievements.<id>` | `{ achievementId: ISO date }` |
| `arcade.seenIntro.<id>` | `"1"` once the intro panel was shown |
| `arcade.seenVersion.<id>` | last manifest version opened (New/Updated badge, what's-new callout). Missing but `seenIntro` set counts as the current version, so browsers from before this key see no badge. |
| `arcade.rated.<id>.v<n>` | rated that version |
| `arcade.nudged.<id>.v<n>` | the "Rate this game?" nudge was shown |
| `arcade.recent` | up to 3 ids, newest first |
| `arcade.clientId` | anonymous id (kept by "Reset everything"; "New anonymous id" replaces it) |
| `arcade.telemetryOptOut` | `"1"` = send no play stats or gallery events |

Export (`arcade-progress.json`): `{ format: "emergent-arcade-progress",
version: 1, exported_at, achievements, seenVersion, seenIntro }`. Import
merges: it never removes anything, keeps the earliest unlock date and the
highest seen version, and previews "X achievements across Y games (N new)"
first.

## Header

Name and achievement total (under the name below 480 px, so the name never
truncates at 320 px), then share, ?, ⚙ (44 px each). Share hands out
`siteUrl` (the arcade itself) the same way the cabinet shares a game, and
logs a `share` row with `from: "gallery"`.

## Cabinet

- Toolbar: ← · title + version · ▶ · ⓘ · 🏆 · ★ · share · download · ⛶.
  Under 560 px, share/download/⛶ move into a ⋯ menu. Under 420 px, ▶ is
  hidden (the panel's × and the intro's Play button close panels) and the
  version sits under the title. All targets are 44 px.
- Panels: focus trap, Esc closes, focus returns to the opening button (or
  to the game when closed with Play). Shortcuts when focus is outside the
  game: `?` toggles How to play, `F` full screen, Esc.
- The ⓘ panel doubles as the first-time intro: goal, one big row per verb,
  a sticky Play button, then how it works, What's new (`changes`: newest 3,
  "Show all N versions" for the rest; every game lists v1 onward), version
  and dates, how it's built, share and download.
- Loading: an overlay fades in after 0.35 s. The iframe's `load` fires even
  for errors, so a `HEAD` request decides the error state (with Retry); 15 s
  without a load shows "Still loading…" with Retry.
- Toasts stack (max 3). Callouts are toasts with buttons: what's new (12 s)
  and the rate nudge (after the 3rd `arcade:result` in a cabinet visit, once
  per game version, not if already rated).
- Share: Web Share API on touch devices, else copy the link ("Link
  copied"), else a prompt.
- Download: `fetch` the game file, add an HTML comment header (title,
  version, date, source link) after the doctype and a shim before
  `</body>`, save as `<id>-v<version>.html`. Games only post to a parent
  frame (`if (window.parent !== window)`), so the shim redefines
  `window.parent` as a stand-in that receives `arcade:achievement`, saves it
  under the same key the gallery uses, and shows a toast. It does nothing
  inside a frame. The output passes `scripts/self-contained.mjs`.

## Link previews (Facebook, Messenger)

Crawlers ignore everything after `#`, so `#/play/<id>` links alone would
all show the arcade's card. Instead:

- `index.html` has Open Graph tags (absolute URLs, `siteUrl` in
  `assets/config.js`) with `assets/og/arcade.png`.
- At deploy, `scripts/build-share-pages.mjs _site` writes
  `play/<id>/index.html` per game: the game's title, blurb and
  `assets/og/<id>.png?v=<version>`, then `location.replace("../../#/play/<id>")`
  (JS, so crawlers stay on the tags). These pages exist only on the
  published site.
- The cabinet's share button hands out `<siteUrl>play/<id>/` when the page
  is on `siteUrl`, else the old `#/play/<id>` link (local, playtest copies).
- Images: 1200×630 PNGs drawn by `scripts/make-og-images.mjs [id ...]`
  (Playwright) from the card art, title, blurb and accent; committed.
  `validate.mjs` requires one per game plus `arcade.png`.
- Facebook caches previews. After changing one, paste the link into
  https://developers.facebook.com/tools/debug/ and press "Scrape Again".

## Manifest fields the gallery reads

Required ones are in `docs/adding-a-game.md`. Optional: `accent` (card and
cabinet chrome color; all current accents are bright, so buttons on them
use dark text), `changes`, `status` (`archived` → Archive section, still
playable).

## Open ideas / follow-ups

- In-game hints and canvas `aria-label`s still say "tap"/"hold" on PC
  (Orbit Garden, Loom, Island Census, Hot Iron hints; every game's
  aria-label). Fixing them means each game checks `(pointer: coarse)` itself,
  plus a version bump. Left out of the wording PR on purpose.

- Rotate hint for games that play much better in one orientation. Needs a
  per-game `orientation` field and a phone playtest to know which games
  need it; nothing measured yet.
- Mechanic map view from the `verbs` in `games.json` (roadmap phase 2).
- Per-game light theme / theme toggle (dark and light already follow the
  system setting).
- Offline/PWA manifest and service worker.
- Highest-rated sort once ratings are readable client-side (they aren't:
  reads need the secret key).
- Import currently merges only; a "replace" option if players ask.
