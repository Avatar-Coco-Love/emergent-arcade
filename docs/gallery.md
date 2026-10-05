# Gallery and cabinet

The platform around the games: `index.html` and `assets/`. Games never
depend on any of it (each one still plays when its file is opened
directly). Read this file, not old PR bodies, before changing the gallery.
Check changes with `node scripts/smoke-gallery.mjs` (Playwright, one line
per check at 360×740, 740×360 and 1280×800; screenshots go to `--out`).
Accessibility: `node scripts/a11y-audit.mjs --gallery` (below, CI runs it).

Playtest (private artifact, feedback/telemetry disabled in that copy):
https://claude.ai/artifact/26WTJMqdPT9oZ5PcocXhuC
(republished for the teacher page PR: footer "For teachers", the
classroom link (`?class=1` doesn't reach inside the artifact frame, so try
classroom mode with the note's Turn off after opening the copied link
elsewhere, or locally); the form falls back to a GitHub issue there.
Earlier: the Daily Challenge, the topic chips and the ⓘ panel's Topics line. No `leaderboards.json` there, so no
play counts or boards. In that frame the share buttons can't use the share
sheet and may not reach the clipboard, so share can do nothing there.)

## Files

| file | what |
|---|---|
| `assets/ui.js` | `ArcadeUI`: `el()`, safe `store`, `shortDate`, stacking `toaster`, `trapFocus`, `saveFile`, `share` (share sheet / copy / prompt) |
| `assets/wording.js` | `ArcadeWording`: tap or click (see below). Also run by the Node scripts through `scripts/wording.mjs` |
| `assets/scores.js` | `ArcadeScores`: score specs, personal bests, handles, `leaderboards.json` ([scores.md](scores.md)) |
| `assets/names.js` | `ArcadeNames`: typed leaderboard names (clean, fold, check, tag), with the word lists `assets/name-reserved.json` and `assets/name-blocked.json`. Also run by the builder through `scripts/names.mjs` ([scores.md](scores.md), "Typed names") |
| `assets/daily.js` | `ArcadeDaily`: the Daily Challenge: the day's pick, this browser's daily results and streak, the result card and its share ([daily.md](daily.md)). Also run by the Node scripts through `scripts/daily.mjs` |
| `assets/progress.js` | `ArcadeProgress`: every per-browser key, New/Updated badges, recent games, export/import/reset, telemetry opt-out |
| `assets/download.js` | `ArcadeDownload`: standalone copy of a game (header comment + shim) |
| `assets/cabinet.js` | `ArcadeCabinet.open(game)` / `close()`: toolbar, panels, ⋯ menu, toasts, loading/error states, share, download, rating, nudge |
| `assets/name-ctl.js` | `ArcadeNameCtl.create(prefix, { toast, onChange })`: the leaderboard name controls (show me, pick another name, type a name), used by the 🏆 panel (ids `lb…`) and the Records view (ids `rec…`) |
| `assets/records.js` | `ArcadeRecords`: the Records view (`#/records`), every game's leaderboard on one page |
| `assets/spotlight.js` | `ArcadeSpotlight`: the Spotlight view (`#/spotlight`), games that need playtesters, grouped from hourly play stats |
| `assets/classroom.js` | `ArcadeClassroom`: classroom mode (`?class=1`, `on`, `set`, `link`), below |
| `assets/teachers.js` | `ArcadeTeachers`: the teacher page (`#/teachers`), its subject table, classroom link and "I used this in class" form |
| `assets/topics.js` | `ArcadeTopics`: the fixed topic tag list (`LIST`, `get`, `of`). Also run by the Node scripts through `scripts/topics.mjs` |
| `assets/gallery.js` | cards, search/sort/verb and topic filters, continue row, archive, header total, ⚙ settings, "About the arcade", routing, boot |

Script order in `index.html`: config, ui, classroom, wording, topics, feedback, achievements, names, scores, daily, progress,
telemetry, thumbs, download, cabinet, records, spotlight, teachers, gallery.

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
- `#/` or `#/?sort=<new|updated|title|left>&verb=<verb>&topic=<id>&q=<text>`: the
  gallery with its view state (an unknown topic id is ignored). Filter changes use `history.replaceState`,
  so they don't fill the back history. The cabinet's ← goes back to the
  same view. An unknown id shows the gallery with a notice.
- `#/records` or `#/records?mine=1`: the Records view (below). A cabinet
  opened from it goes back to it (← and focus on the row's ▶).
- `#/daily`: today's Daily Challenge in the cabinet (the game in daily mode,
  [daily.md](daily.md)). The gallery's daily banner, above Continue playing,
  links here; hidden while filtering.
- `#/spotlight`: the Spotlight view (below). A cabinet opened from it goes
  back to it, with focus on the Play link used.
- `#/teachers`: the teacher page (below), linked from the footer ("For
  teachers") and the About box. A cabinet opened from its table goes back
  to it, with focus on the link used.
- `?class=1` (query, before the `#`): turns classroom mode on (below);
  `?class=0` turns it off. Removed from the address bar once read.

## Spotlight

The page to share with playtesters: which games need players and what to
look for in each. The **Spotlight** button sits next to Records (icons only
at ≤ 400 px). It updates itself: `scripts/build-leaderboards.mjs` tallies
each game's **current version** hourly into `leaderboards.json`'s
`spotlight` block ([scores.md](scores.md)), and `assets/spotlight.js` sorts
the games on load. A revision starts its game over.

- **Groups**, most urgent first; a game goes in the first one it fits
  (constants at the top of `assets/spotlight.js`):
  Past 10 minutes (a player's total ≥ 10:00) · Needs first players (< 3
  players) · Players get stuck (3+ rounds, < 45% won) · Closest to 10
  minutes (a player ≥ 5:00) · Lost in the first minute (4+ visits, ≥ 40%
  ended before a round) · Need more players (the rest).
- **Picks**: "Play one of these next", the most urgent game of Needs first
  players, Players get stuck and Closest to 10 minutes (then the others).
- Each card: blurb, one line of facts (players, % of rounds won, early
  exits), and a bar of the longest player against the 10:00 line.
- Three numbers on top: games past 10 minutes, the longest player, games
  needing first players. Then three steps (pick, play until you'd stop,
  rate with ★) and "Updated N minutes ago".
- Without the file (local copy) it says so and lists every game as needing
  players. Logs a `spotlight` gallery event; opens log `from: spotlight`.
- Counts include the maintainer's own plays and skip players who turned
  off play stats, like the play counts.

## Teacher page

`#/teachers` (`assets/teachers.js`, `#teachersView`): what used to be
`docs/teaching.md`, for teachers who can't reach GitHub. In order: lede,
two cards (free, offline copies), Classroom mode (the link in a read-only
field and **Copy classroom link**; no clipboard selects the text), Games by
subject, Privacy, Going further (GitHub links set from `config.repo`), and
"I used this in class".

- **Games by subject**: a table built at runtime from `games.json` and
  `assets/topics.js`: every topic some non-archived game uses, subjects
  then skills (a "Subjects"/"Skills" row before each), in `topics.js`
  order; each topic links to `#/?topic=<id>` and shows its `about`, its
  games (by title) link to `#/play/<id>`. Nothing to edit when a game gets
  topics.
- **"I used this in class"**: grade or age, subject (free text), games
  used (checkboxes, every non-archived game), what worked, what didn't
  (500 chars each; Send needs one of them), optional contact.
  `ArcadeFeedback.submitClassroom` posts `{ kind: "classroom", grade,
  subject, games: [ids], worked, didnt, contact?, client_id, submitted_at }`
  to the feedback endpoint; backend v3 keeps it in the `events` tab, no
  Apps Script change ([backend-api.md](backend-api.md)). If the endpoint
  fails: a pre-filled `[feedback] classroom: …` GitHub issue, without the
  contact (issues are public). Sent even with play stats off (it's
  feedback, like a rating), never in classroom mode (hidden, with a line
  saying why). Read with `node scripts/fetch-feedback.mjs --classroom`
  (also the last section of its default summary).
- Logs a `teachers` gallery event on open, `classroom_link` (`method`) on
  copy, and `open` with `from: teachers`.

## Classroom mode

For a class sharing a link (`assets/classroom.js`). With it on:

- no play stats or gallery events (`ArcadeTelemetry.active()` is false), so
  no score reaches a leaderboard; the ⚙ toggle shows off and disabled, the
  footer's stats note is hidden. The player's own opt-out setting is left
  alone;
- the leaderboard name controls (`.lb-name-ctl`, in the 🏆 panel and the
  Records view) are hidden: everyone keeps the made-up name;
- the ★ button, the rate nudge, Spotlight's "Rate it" step and the teacher
  form are hidden;
- a note under the header: "Classroom mode · no play stats, names or
  ratings", with **Turn off**.

Decisions: it **persists per browser** (`arcade.classroom`), so a lab
computer stays in it next lesson and a student who reloads or comes back
from a bookmark is still covered; it lasts until someone presses Turn off
(a student can: the cost is only that their anonymous stats resume). It
**carries into games**: the cabinet is part of the same page, so
`#/play/<id>` and `#/daily` keep it (CSS class `classroom` on `<html>`).
Games themselves know nothing about it: they never send anything; the
gallery does. Downloaded copies send nothing anyway. With storage blocked,
the link still works for that page load. Anyone who never opened the link
sees no change. The link is `<siteUrl>?class=1` on the published site,
else this page's address. Smoke-tested by "teacher page" and "classroom
mode" (`smoke-gallery.mjs`).

## Topics

Games carry 1–3 tags from the fixed list in `assets/topics.js` (manifest
field and how to add a tag: `docs/adding-a-game.md`, "Topics"). The
gallery uses them in three places:

- **Topic chips**: a second chip row under the verbs: "All topics", then
  "Subjects" and "Skills", each a small label followed by its chips in list
  order. Only tags some game uses get a chip. One topic at a time; it
  combines with the verb filter and search (a game must match all three).
  Phones (≤ 480 px) show the row as one line that scrolls sideways, with a
  faded right edge, so a dozen topics don't push the games below the fold;
  a pressed chip out of view is scrolled in. With a mouse the chips are
  34 px tall (44 px on touch). Pressing one logs `filter` with `topic`.
- **Search** matches topic labels ("fluid", "planning").
- **ⓘ panel**: a "Topics" line after How to play, one link per tag (label
  and kind) to `#/?topic=<id>`, which closes the cabinet onto the filtered
  gallery.

`node scripts/mechanic-map.mjs` prints verbs × topics. Smoke-tested by
"topic filter, search and ⓘ links".

## Per-browser storage

| key | value |
|---|---|
| `arcade.achievements.<id>` | `{ achievementId: ISO date }` |
| `arcade.seenIntro.<id>` | `"1"` once the intro panel was shown |
| `arcade.seenVersion.<id>` | last manifest version opened (New/Updated badge, what's-new callout). Missing but `seenIntro` set counts as the current version, so browsers from before this key see no badge. |
| `arcade.rated.<id>.v<n>` | rated that version |
| `arcade.nudged.<id>.v<n>` | the "Rate this game?" nudge was shown |
| `arcade.best.<id>` | best score per board, `{ "e<epoch>:<board>": { score, at, version } }` ([scores.md](scores.md)) |
| `arcade.handle` | random leaderboard name, if the player picked another one (kept by "Reset everything") |
| `arcade.name` | typed leaderboard name, if any (kept by "Reset everything") |
| `arcade.leaderboardOptOut` | `"1"` = stay off leaderboards (kept by "Reset everything") |
| `arcade.recent` | up to 3 ids, newest first |
| `arcade.clientId` | anonymous id (kept by "Reset everything"; "New anonymous id" replaces it) |
| `arcade.telemetryOptOut` | `"1"` = send no play stats or gallery events |
| `arcade.classroom` | `"1"` = classroom mode (above); "Reset everything" keeps it |

Export (`arcade-progress.json`): `{ format: "emergent-arcade-progress",
version: 1, exported_at, achievements, seenVersion, seenIntro, bests }`. Import
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
- The game iframe is `sandbox="allow-scripts"` plus
  `allow="accelerometer; gyroscope"`, so a game can read phone tilt (Terrace
  Garden). Chrome on Android blocks motion sensors in a cross-origin frame
  without it. iOS asks through `DeviceOrientationEvent.requestPermission`,
  which may be refused inside the sandbox, so a game that uses tilt needs a
  touch fallback (Terrace Garden's tilt bar).
- Loading: an overlay fades in after 0.35 s. The iframe's `load` fires even
  for errors, so a `HEAD` request decides the error state (with Retry); 15 s
  without a load shows "Still loading…" with Retry.
- Records: the 🏆 panel is titled "Records" for games with a `score` (all
  of them): best, board picker, top 10 from `leaderboards.json` with "you"
  merged in, public name. Each scored `arcade:result` shows a best/new-best
  toast, and the cabinet posts `arcade:best` to the game on load and after
  a new best ([scores.md](scores.md)). Smoke-tested with a fixture
  `leaderboards.json` served by `smoke-gallery.mjs`.
- Records view (`#/records`, the "Records" button next to sort; the
  cabinet's Records panel links to it): one row per scored game with its
  headline board (most published scores, else one you have a best on), the
  🥇 leader and "You #2 9" (or "Your best 9" when off the leaderboard). A
  row expands to the board picker and the same top 10 as the cabinet
  (`ArcadeCabinet.lbItems`, merge rules in `ArcadeScores.standings`). Top
  line: your bests across games and how many boards you lead, then the
  same name controls as the 🏆 panel (`assets/name-ctl.js`). "My bests"
  keeps games you have a best in. Archived games show only once someone has
  a score in them. Phones: search gets its own row, sort and Records share
  the next.
- Play counts: the card footer shows "18 plays · 5 on v9" (from the
  first play), the About panel a "Plays by version" table, both from the
  `plays` block of `leaderboards.json` ([scores.md](scores.md#play-counts)).
- Arcade total: "1,240 games played" under the tagline once all games
  together reach 250 plays (hidden before; [scores.md](scores.md#play-counts)).
- Toasts stack (max 3). Callouts are toasts with buttons: what's new (12 s)
  and the rate nudge (after the 3rd `arcade:result` in a cabinet visit, once
  per game version, not if already rated).
- Share: Web Share API on touch devices, else copy the link ("Link
  copied"), else a prompt.
- Download: `fetch` the game file, add an HTML comment header (title,
  version, date, source link, copyright and MIT notice) after the doctype and a shim before
  `</body>`, save as `<id>-v<version>.html`. Games only post to a parent
  frame (`if (window.parent !== window)`), so the shim redefines
  `window.parent` as a stand-in that receives `arcade:achievement`, saves it
  under the same key the gallery uses, and shows a toast. It does nothing
  inside a frame. The output passes `scripts/self-contained.mjs`.

## Accessibility

Audited by `scripts/a11y-audit.mjs` (results and checks:
[accessibility.md](accessibility.md)); the gallery, cabinet (every panel),
teacher page and classroom note must pass, and CI fails if they don't.
Rules the audit enforces, from its first run (2026-10-05):

- Text is AA (4.5:1) in both themes. Light `--accent` is `#006fa6`
  (links, pills, chips; the old `#0a84c6` was 3.7:1), `--good` `#1a7a43`,
  `--star` `#a87700`.
- Form fields use `--field-border` (light `#7c7c8a`, dark `#737380`, 3:1+);
  `--border` stays for cards and panels, where it's decoration.
- No text under 12 px (0.75rem) at phone width.
- State is never colour alone: rating stars are hollow when off, pressed
  chips are filled.
- Every Tab stop shows a 3:1 focus ring; Play puts focus in the game frame
  and Shift+Tab leaves it (unless the game keeps Tab: Rail Yard).
- `prefers-reduced-motion` turns off every animation and transition (the
  `@media (prefers-reduced-motion: reduce)` block in `gallery.css`).

## Content Security Policy

GitHub Pages can't send headers, so `index.html` carries the CSP in a
`<meta http-equiv>` tag: scripts and styles only from this site (inline
styles allowed: the gallery sets some from JS), images also from `data:`
and `blob:`, and network requests only to this site and the Apps Script
backend (`script.google.com`, which redirects to
`script.googleusercontent.com`). Moving the backend means adding its host
to `connect-src`, or every feedback and telemetry request is refused.
Games load from `games/` in their sandboxed iframe and keep their own
rules (`scripts/self-contained.mjs`); the CSP doesn't reach inside them.
`smoke-gallery.mjs` checks that another host is refused.

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
- `daily/index.html` does the same for `#/daily` (the arcade's image: the
  day's game is only known in the browser). The daily result share hands
  out `<siteUrl>daily/`.
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
playable), `topics` (above).

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

## Support link

`supportUrl` in `assets/config.js` adds a "Help keep these games free" link to the
gallery footer (Cash App). Empty string hides it.
