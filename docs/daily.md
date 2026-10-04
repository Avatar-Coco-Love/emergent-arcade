# Daily Challenge

One featured game a day, the same seeded run for everyone, and a result
card to share. The point is data: the arcade has 20 games and few players,
so each game's telemetry is thin. A daily game concentrates a day's players
on one game, and on the same levels, which makes their results comparable
(and comparable with the bots). It also gives players a reason to come back
and something to post.

Playtest (private Artifact, republished each push): see the PR.

## How it plays

- The gallery shows a banner at the top: **Daily #N · date**, the game,
  this browser's result (score, 🟩🟥 marks, 🔥 streak) and the day's leader
  from `leaderboards.json`. "Play today's" opens `#/daily`.
- `#/daily` opens the cabinet in daily mode: the title bar says
  `Daily #N` instead of the version, a 📅 toolbar button opens the daily
  panel, and the intro panel has a daily note.
- **Your first run counts.** Every later run that day is practice: it's
  sent with `daily_first: 0` and kept off the board (a "Practice run" toast
  shows its score). A first run ends when the game posts `arcade:final`,
  or when a new run starts (reload, restart), whatever it reached by then.
- When the first run ends, the daily panel opens by itself: the result card
  (PNG, 1080×1080: arcade, Daily #, date, card art, score, one square per
  level won or lost, streak, link), **Share result** (share sheet with the
  image on phones that support it, else text + link; on PCs the text is
  copied), **Save image**, **Play again**, and today's board (first runs
  only, "you" merged in at once).
- The game's own bests and boards are not touched by daily runs (a daily
  run starts at Endless difficulty, so it isn't comparable).
- The day is the player's local calendar day (`ArcadeDaily.today()`).

## The pick

`assets/daily.js` (`ArcadeDaily.pick(games, date)`), shared with Node
through `scripts/daily.mjs`:

- The pool: games with `"daily": { "from": "YYYY-MM-DD" }` whose `from` is
  on or before the date, not archived, sorted by id.
- Days are numbered from `START` (2026-10-04 = Daily #1). With n games,
  each cycle of n days is a seeded shuffle of the pool: every game once per
  cycle, never the same game two days running (two games just alternate).
- Adding a game changes the order from its `from` date on. Set `from` to
  a future date (the day after the PR merges, or later) so today's pick
  never changes under players.

## The game's side (protocol)

The gallery loads `games/<file>?v=<version>&daily=<date>`. The game:

1. Reads the date: `/[?&]daily=(\d{4}-\d\d-\d\d)(?:&|$)/` on
   `location.search` (copy the `§ daily` block from Coat Check).
2. Seeds its run from `GAME_ID + ':' + date` (FNV-1a, `dailySeed()`), so
   the same date gives the same levels on every device. Only the levels come
   from the seed; the game's own randomness after that may differ.
3. Starts the run that counts directly (skip the campaign). Each daily run
   gets a fresh `run` id.
4. Adds `daily: <date>` to every `arcade:result` of a daily run, with the
   run's score so far in `score` (the manifest's `score` rules apply).
5. Posts `{ type: "arcade:final", game, daily, run, score }` when the run
   is over (the card opens on it).

Opened directly with `?daily=`, the game plays the same run (no gallery).
`validate.mjs` checks a game with `daily` reads the date, posts
`arcade:final` and sets `msg.daily`. `monkey-games.mjs` runs each one once
more as the daily and fails if a result lacks the date.

| game | daily run | score | ends |
|---|---|---|---|
| coat-check | Endless shifts from the day's seed | coats returned | a lost shift |
| counterfeit-scale | Endless cases from the day's seed | cases cracked | 3 strikes |
| surprise-party | a Party Season from the day's seed | parties | out of envelopes |

## Data

- Telemetry: daily rounds carry `daily` and `daily_first` (1 for the
  counted run), plus the usual `score`, `score_epoch`, name fields, but no
  `board`. The gallery sends a `daily` event when a first run ends and an
  `open` event with `from: "daily"`. `fetch-telemetry.mjs` prints one line
  per date: game, players, first-run score median and best, levels median,
  practice runs, finished runs.
- Leaderboard: `scripts/build-leaderboards.mjs` keeps a `daily` block,
  `{ "<date>": { game, n, top: [{ h, p, s, at, u? }] } }`. A row counts only
  if `daily_first` is 1, the date's pick is that game, it arrived within
  40 h of the date's noon UTC, and the score passes the game's `max` and
  `epoch`. Per player only their first run (`u`, the run id) counts; its
  best score wins. Boards younger than 3 days keep every player (so a first
  run is never counted twice); older ones keep the top 25 and drop `u`.
  14 days are kept. Tested by `scripts/test-daily.mjs` (CI).
- This browser: `arcade.daily` (60 days), exported, imported (a day already
  played here is kept) and erased by "Reset everything".

## Open ideas

- A daily run starts at Endless difficulty with no tutorial. Watch the
  first-run level median for newcomers; if it's 1, start daily runs with a
  gentler first level, or show the rules first.
- More games in the rotation: each depth-pass revision with a seeded
  generator can join (Rail Yard's Daily yard, Pressure Grid's Daily mode
  in their notes). Set `from` a few days out.
- A "yesterday" line in the banner (yesterday's game and winner) and a
  daily row in the Records view.
- Plausibility checks for daily scores (all players play the same levels,
  so a score far above the bots' is suspect).
- A daily-specific card image for link previews (the `daily/` page shows
  the arcade's card today).
