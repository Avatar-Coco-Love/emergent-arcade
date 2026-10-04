# emergent-arcade

Tiny browser games built on emergent, shared-state mechanics. Playable
instantly, no installs.

**Mission:** help students, teachers and game developers learn from these
games, not just play them. Students can see how a few simple rules add up to
surprising behavior and read each game as one self-contained file.
Teachers get free, account-free games that also download to run offline, for lessons on systems,
feedback loops and design. Game developers can borrow the design rules,
balance bots and [design findings](docs/findings.md); everything is open.

**Live site:** https://avatar-coco-love.github.io/emergent-arcade/ (after the
one-time Pages setup below)

The full spec is in [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md).

## Layout

```
index.html                 gallery page (scrollable card list + full-screen cabinet)
assets/
  config.js                site settings: repo name, feedback endpoint URL
  gallery.js / .css        gallery: cards, search/sort/filter, settings, routing
  cabinet.js               the full-screen cabinet: toolbar, panels, toasts, share, download
  ui.js                    small shared helpers (DOM, storage, toasts, focus trap)
  progress.js              what the arcade remembers per browser; export/import/reset
  download.js              builds a standalone, offline copy of one game
  feedback.js              feedback transport (Apps Script, or GitHub issue fallback)
  achievements.js          records achievement unlocks per player (localStorage)
  telemetry.js             anonymous play stats and gallery events
  thumbs.js                gallery card art per game (inline SVG from primitives)
games/
  games.json               manifest: one entry per game (id, version, mechanics, ...)
  pressure-grid.html       each game is ONE self-contained HTML file
  orbit-garden.html
  murmuration.html
feedback/apps-script/
  Code.gs                  Google Apps Script backend that stores feedback in a Sheet
scripts/
  validate.mjs             checks manifest + design rules; runs in CI
  self-contained.mjs       the "one self-contained file" rules (validate + smoke test)
  smoke-gallery.mjs        Playwright check of the gallery at phone and desktop sizes
  monkey-games.mjs         random input for every game; fails on errors (CI runs both)
  fetch-feedback.mjs       reads accumulated feedback back for review
  fetch-telemetry.mjs      reads play stats and gallery events back
  fetch-errors.mjs         reads crash reports (games and gallery) back
docs/                      brief, feedback backend setup, how to add/revise a game,
                           gallery.md (the gallery/cabinet design)
.github/workflows/pages.yml  validate on PRs, deploy to Pages on merge to main
```

No build step and no dependencies: plain HTML/CSS/JS, plus two Node scripts
that use only the standard library (Node 18+).

## Stack and why

| Concern | Choice | Why |
|---|---|---|
| Hosting | **GitHub Pages**, deployed by a GitHub Actions workflow | Free, no server, and it's where the code already lives. Deploying is just merging to `main`, which works from any Claude Code session with push access. |
| Feedback storage | **Google Sheet written by a Google Apps Script web app** | Free with no expiring tier (Supabase-style free projects pause when idle; Cloudflare/Firebase add another account and a deploy tool). Players submit anonymously with no login. The data is a spreadsheet you can open, sort and download as CSV with nothing else to maintain. |
| Feedback fallback | **Pre-filled GitHub issue** | Works with zero setup, so the form is useful from day one and still works if the script is ever down. Issues are queryable from Claude Code through the GitHub tools. |
| Readback | Sheet itself, `scripts/fetch-feedback.mjs`, or the endpoint's keyed `GET` (JSON/CSV) | Easy for a human (spreadsheet) or for Claude (one command prints a per-version summary with every comment). |
| Review gate | PRs into `main` + CI validation + a PR template with the design-rule checklist | Pages only deploys from `main`, so nothing goes live without a merged PR. |

Things considered and rejected: Giscus/utterances (players would need a GitHub
account to rate), Netlify Forms (would move hosting off GitHub Pages),
Supabase (free projects pause after a week idle, which means maintenance).

## How it works

- **Gallery** (`index.html`) loads `games/games.json` and renders one card
  per game (version, New/Updated badge, achievement progress), with search,
  sort and verb filters kept in the URL (`#/?sort=updated&verb=drag`), a
  "Continue playing" row and an Archive section. Selecting a card routes to
  `#/play/<id>` (a shareable link) and opens the **cabinet**: a
  screen-filling window with the game in a sandboxed iframe and a toolbar
  on top (back, title and version, ▶ play, ⓘ how to play, 🏆 achievements,
  ★ rate, share, download, ⛶ full screen; the last three move into a ⋯ menu
  on phones). The ⓘ, 🏆 and ★ buttons open a panel over the game and pause
  it; ▶ closes the panel and resumes. Nothing in the cabinet scrolls except
  long panel text. Details: [`docs/gallery.md`](docs/gallery.md).
- **Daily Challenge** (`#/daily`): one featured game a day, the same seeded
  run for everyone; your first run goes on the day's board and makes a
  shareable result card. Details: [`docs/daily.md`](docs/daily.md).
- **Download** saves a game as one HTML file that plays offline, with a
  small shim that keeps achievements in that browser.
- **Progress** (achievements and what the arcade remembers) lives in the
  player's browser; the ⚙ settings export, import and reset it.
- **Games stay standalone.** A game file doesn't depend on the gallery, so
  it can still be opened directly (`games/pressure-grid.html`). Its only
  contact with the gallery is optional `postMessage`: it listens for
  `arcade:pause` / `arcade:resume` and sends `arcade:achievement`.
- **Feedback** (1-5 stars and/or a comment, plus optional quick tags) lives in the ★ panel and is
  tagged with the game's `id` and manifest `version`. Revising a game bumps
  its version, so ratings for old and new versions stay separate.
- **Achievements**: each game lists 3+ achievements in `games.json` and
  announces unlocks to the gallery with `postMessage`. The gallery saves them
  in the player's browser, shows a popup, and shows progress on the cards
  and in the 🏆 panel, which can also reset them.

## One-time setup (maintainer)

1. **Enable Pages:** repo **Settings → Pages → Build and deployment →
   Source: GitHub Actions**. The next push to `main` (or a manual run of
   the *Validate & deploy to GitHub Pages* workflow) publishes the site.
2. **Protect `main` (recommended):** **Settings → Branches → Add rule** for
   `main`: require a pull request before merging and require the `validate`
   status check. This makes the review gate enforced, not just conventional.
3. **Feedback backend (optional but recommended):** follow
   [`docs/feedback-backend.md`](docs/feedback-backend.md) (about 10 minutes),
   then put the web app URL in `assets/config.js`. Until then feedback
   arrives as GitHub issues.

## Everyday workflow

```sh
python3 -m http.server          # preview at http://localhost:8000
node scripts/validate.mjs       # same check CI runs
node scripts/smoke-gallery.mjs  # after gallery/cabinet changes (Playwright + Chromium)
FEEDBACK_READ_KEY=... node scripts/fetch-feedback.mjs   # review feedback
```

To add or revise a game, see [`docs/adding-a-game.md`](docs/adding-a-game.md).
Every change goes through a PR. CI validates it, a human merges it, and the
merge deploys it.

## Games

| Game | Mechanics | Shared state | Goal |
|---|---|---|---|
| [Pressure Grid](games/pressure-grid.html) | **pump** (tap a cell to add pressure), **siphon** (drag to move a fraction of a cell's pressure into a neighbor, with loss) | Pressure per cell, also read by the passive bleed-and-eruption system | 100 eruptions in 60 s, then free play |
| [Orbit Garden](games/orbit-garden.html) | **place** (tap to add a planet), **fling** (drag to launch a seed that curves under gravity) | Planet mass: created by placing, grown by landed seeds, sets gravity, drained by a passive wither | 3 planets blooming at once within 40 seeds |
| [Murmuration](games/murmuration.html) | **lure** (hold to draw calm birds toward your finger), **startle** (tap to scare nearby birds away from the tap) | Fear per bird: raised by startles and by crowding at the lure, spread bird to bird, cancels the lure's pull, and makes panicked birds fly off the edges | 15+ birds through each of 5 gates, in order, before night falls (60 s) |
