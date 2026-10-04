# Adding or revising a game

Everything reaches the live site through a reviewed PR into `main`. Nothing is
published from a branch.

## New game

1. Write `games/<id>.html`: one self-contained file (inline CSS/JS, no
   external files, no network calls). Use `games/pressure-grid.html` as the
   reference for structure, mobile-friendly sizing and pointer handling.
2. Add an entry to `games/games.json`:

   ```json
   {
     "id": "my-game",
     "title": "My Game",
     "file": "my-game.html",
     "version": 1,
     "added": "YYYY-MM-DD",
     "updated": "YYYY-MM-DD",
     "blurb": "One sentence for the gallery card.",
     "goal": "What the player is trying to do (or say it's a sandbox).",
     "howToPlay": "A short paragraph shown in the gallery's How to play panel.",
     "mechanics": [
       { "name": "pump", "verb": "tap", "description": "{Tap} a cell to ..." },
       { "name": "siphon", "verb": "drag", "description": "..." }
     ],
     "sharedState": "Which value(s) the mechanics read and write.",
     "accent": "#hex color for the card",
     "achievements": [
       { "id": "first-pop", "title": "First Pop", "description": "Make a cell erupt." }
     ]
   }
   ```

   `id` is the game's permanent identity: feedback and achievements are keyed
   on it, so never rename it.

   **Tap or click.** Players are on phones and on PCs, so manifest text
   never says "tap" or "finger" outright. Write a placeholder and the gallery
   fills in the word for the device's main input (`(pointer: coarse)` is a
   finger, anything else a mouse; `assets/wording.js`):

   | placeholder | phone | mouse |
   |---|---|---|
   | `{tap}` `{taps}` `{tapped}` `{tapping}` | tap… | click… |
   | `{finger}` `{fingers}` | finger(s) | pointer(s) |
   | `{hold}` | hold | click and hold |
   | `{press}` (as in "`{Press}` and hold", "`{press}` Next season") | press | click |
   | `{slide}` | slide | move |
   | `{swipe}` `{swipes}` `{swiped}` | swipe… | drag… |

   A capital first letter capitalizes the word (`{Tap}` → Tap / Click).
   Works in every prose field (blurb, goal, howToPlay, descriptions,
   achievements, `changes`); not in `id`, `file` or `verb`. Write verbs in
   their phone form (`"tap"`, `"hold"`): the gallery's chips and the ⓘ
   panel's labels translate them the same way. "drag" and "flick" read fine
   with a mouse, so they stay plain words. `validate.mjs` rejects any other
   `{…}`. Link previews (share pages, `assets/og/` images) use the phone
   words. Add a row to `WORDS` in `assets/wording.js` for a new word.

   Optional fields (checked by `validate.mjs`):

   - `keyboard`: keys for PC players, one line of 1–120 characters, e.g.
     `"← → or A / D to tilt"`. Shown as a "keys" row under the verbs in the
     ⓘ panel, only when the main input is a mouse (phone players never see
     it). Plain text, no placeholders.

   - `changes`: `[{ "version": 1, "date": "YYYY-MM-DD", "text": "..." }]`,
     one short line per version (1–280 characters, player-facing: what
     changed in play, not how). The cabinet's ⓘ panel shows the latest three
     under "What's new" (with a "Show all N versions" toggle for the rest), and the first time a browser opens a version newer
     than the one it last saw, a one-time callout shows the newest line.
     Versions are 1..`version`, one entry each.
   - `topics`: 1–3 tag ids from the fixed list in `assets/topics.js`, e.g.
     `["fluid-dynamics", "planning"]`. See "Topics" below.
   - `status`: `"active"` (the default) or `"archived"`. Archived games stay
     playable and keep their link, but the gallery lists them in a separate
     Archive section with a badge. Retire a game this way; never delete it.
3. Add achievements (at least 3). List them in the manifest, then
   announce each one from the game with this snippet (see either existing game):

   ```js
   const GAME_ID = 'my-game';
   const unlocked = new Set();
   function unlock(id) {
     if (unlocked.has(id)) return;
     unlocked.add(id);
     if (window.parent !== window) {
       window.parent.postMessage({ type: 'arcade:achievement', game: GAME_ID, id: id }, '*');
     }
   }
   // ...later: unlock('first-pop');
   ```

   The gallery records unlocks per player (in their browser), shows a popup,
   and lists them under the game. Good achievements reward interplay between
   the mechanics, not just grinding. Achievement ids are permanent too.
   Start `<head>` with the **crash-report snippet**, copied from any game
   (`// § crash report`) with `game:` set to your id. It posts uncaught
   errors to the gallery as `arcade:error` (docs/telemetry.md, "Errors");
   `validate.mjs` requires it and `monkey-games.mjs` checks it works.
   Adding or changing only this snippet bumps nothing: it isn't gameplay.
4. Make the game **fill whatever window it's given** and never scroll:
   `html, body { height: 100%; overflow: hidden }`, then scale the play area
   to the largest size that fits both the width and the height (see
   `fitBoard()` in Pressure Grid or `fitSky()` in Orbit Garden). The gallery
   shows the game inside a "cabinet" that fills the screen.
   - Keep instructions **out** of the game file. The title, how to play and
     goal live in the manifest and appear in the cabinet's ⓘ panel.
   - Only a small status line and buttons (e.g. Reset) belong under the
     play area.
   - Pause when the gallery covers the game with a panel:

     ```js
     let paused = false;
     window.addEventListener('message', evt => {
       if (evt.data && evt.data.type === 'arcade:pause') paused = true;
       if (evt.data && evt.data.type === 'arcade:resume') paused = false;
     });
     // skip simulation steps while paused
     ```
   - Anything that ends a round (win/lose screen) should ignore input for
     about a second, so fast tapping can't skip it.
   - When a round ends, report it for play telemetry
     ([telemetry.md](telemetry.md)). `elapsed` is the round's unpaused
     seconds. Sandboxes with no rounds skip this and start their `goal` with
     "Sandbox".

     ```js
     window.parent.postMessage({ type: 'arcade:result', game: GAME_ID,
       outcome: won ? 'win' : 'loss', time: Math.round(elapsed * 10) / 10 }, '*');
     ```

     A game with levels/days/stages also sends `level`, `run`, `attempt`,
     `reason` and a few `stats` numbers (see
     [telemetry.md](telemetry.md#games-with-levels-optional-fields)).
   - Give it a **score** (required): a `score` entry in the manifest says
     what the number is and where it is in `arcade:result` (`time`,
     `level`, `stats.<key>`, or a `score` field the game posts itself).
     The gallery then keeps personal bests, shows "New best!", and puts the
     game on the hourly leaderboard. Prefer a score with no ceiling, so the
     best player can always beat it. Details: [scores.md](scores.md).
   - **Depth:** a player who likes the game should find 10+ minutes of new
     challenge in it (levels that escalate, or a mode that keeps going after
     the goal), not one round that shows everything. See `ROADMAP.md`.
5. Optional: give the game its own gallery card art by adding an entry for
   its `id` to `assets/thumbs.js` (a function returning a 72×72 inline SVG
   drawn from primitives). Without one, the card shows a generated pixel
   pattern in the game's `accent` color.
   Then draw its link-preview image: `node scripts/make-og-images.mjs <id>`
   writes `assets/og/<id>.png` (validation fails without it). Rerun it when
   the card art, title or blurb changes.
6. Run `node scripts/validate.mjs` and play it locally
   (`python3 -m http.server`, then open http://localhost:8000).
7. Write `docs/games/<id>.md`: key constants, layout, balance numbers and
   open ideas (see `docs/games/murmuration.md`, and "Notes files" below).
   Sessions read this file, not PR bodies, so keep it current and short.
8. Optional: join the Daily Challenge rotation if the game can build a
   seeded run (`"daily": { "from": "<a date after merge>" }`, the
   `§ daily` block and `arcade:final`; [daily.md](daily.md)).
9. Open a PR and fill in the template checklist.

## Revising a game from feedback

1. Pull feedback: `node scripts/fetch-feedback.mjs --game <id>` (or search
   GitHub issues for `"[feedback] <id>"`), and play data:
   `node scripts/fetch-telemetry.mjs --game <id>` (human win rate vs. bots).
2. Edit `games/<id>.html` in place. The PR diff is the record of what changed.
3. In `games/games.json`, bump `version` by 1 and set `updated`. New ratings
   are then tagged with the new version, so you can compare before and after.
   Add a `changes` entry for the new version: returning players see it once
   as a "what's new" callout, and cards show an "Updated" badge until opened.
4. Update `docs/games/<id>.md` in the same PR (new constants, balance
   numbers, open ideas). Move what the revision made old (the previous
   balance table, the playtest that prompted it, why you changed it) to the
   top of `docs/history/<id>.md` rather than deleting it.
   If the revision changes what the score means (longer rounds, new
   scoring), bump `score.epoch`: bests from the old rules stop showing and
   the leaderboard restarts ([scores.md](scores.md)).
5. Open a PR; mention which feedback motivated the change.

A revision that changes the core mechanics enough to be a different game
should be a new `id` instead.

## Topics

The optional `topics` field tags a game for the gallery's topic chips
(`#/?topic=<id>`), search and the ⓘ panel. Tags come from one fixed list,
`assets/topics.js`, so there are no free-form tags or near-duplicates
(`validate.mjs` rejects any id not on it). Two kinds:

- **subject**: the field the game's rules come from (mechanics, fluid
  dynamics, ecology, information theory…).
- **skill**: what the game is about doing (planning, deduction, timing,
  spatial reasoning…). Describe a skill as what the game asks of the
  player, never as training it.

Tag only what the core mechanics really use: the shared state or the main
decision has to *be* that subject or skill, not resemble it. Planning means
moves worked out ahead under a budget (Pressure Grid's par, Island
Census's two moves a season); a game where you react as things happen
doesn't get it. Each entry's `about` line is the test. Fewer, sure tags
beat three loose ones; base them on `docs/games/<id>.md` and the
manifest's mechanics. Bump nothing for a tag change: it's catalog data,
not gameplay.

**Adding a tag to the list.** Only when a game needs one and no existing
tag fits (check for a near-duplicate first: "fluids" is `fluid-dynamics`).
Add `{ id, kind, label, about }` to `LIST` in `assets/topics.js`, in its
kind's section: `id` is lowercase words joined by dashes and is a
permanent key (links, telemetry), `label` is what the chip says,
`about` one sentence saying what a game must do to earn it. Tag at least
one game in the same PR: `validate.mjs` warns about a tag no game uses,
unless it's marked `planned: true` (a tag for the next planned game, like
`working-memory`), and the gallery hides chips with no games.
`node scripts/mechanic-map.mjs` shows verbs × topics, so untried
combinations stand out.

## Notes files

Each game has two: `docs/games/<id>.md` holds the **current** design and is
read by every session that touches the game; `docs/history/<id>.md` keeps
everything older and is read only when a question needs it. Nothing is
deleted, it moves down a layer.

`docs/games/<id>.md`, under 8 KB (`validate.mjs` warns above that), in this
order: a status line (`**vN** (date) · playtest: <link> · balance: <cmd>`)
and a one-line pitch; How it works; Key constants; Layout; Balance (current
version only); Telemetry fields; Player data (latest summary only); Open
ideas / known limits; and a last line pointing to the history file.

`docs/history/<id>.md`: superseded balance tables, older playtest and
player-data logs, why each past revision was made. Newest first.

## Sections

Game files are long; sessions read them by range, using
`node scripts/outline.mjs <id>` (sections, constants, data blocks and
functions with line numbers). Help it by marking the main parts of the
script with a section comment, `// § name` (for example `// § constants`,
`// § levels`, `// § simulation`, `// § bots`, `// § drawing`,
`// § input`), and by keeping tunable constants together at the top.
