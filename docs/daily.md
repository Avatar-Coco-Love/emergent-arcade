# Daily Challenge

One featured game a day, the same seeded run for everyone, and a result
card to share. The point is data: the arcade has 20 games and few players,
so each game's telemetry is thin. A daily game concentrates a day's players
on one game, and on the same levels, which makes their results comparable
(and comparable with the bots). It also gives players a reason to come back
and something to post.

Playtest (private Artifact, the whole gallery, feedback and telemetry off,
no `leaderboards.json` so no boards): https://claude.ai/artifact/26WTJMqdPT9oZ5PcocXhuC

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

## Class challenge

A teacher's version of the daily (teacher idea 4): one game, a seed the
teacher picked, for one class. Made on the teacher page
([gallery.md](gallery.md), "Teacher page"); played at
`#/challenge/<game>/<code>`.

- **The code**: 5 characters from `abcdefghjkmnpqrstuvwxyz23456789` (31,
  no i, l, o, 0 or 1, so it reads aloud and off a board; 28.6 million
  codes), random from `crypto.getRandomValues`. Links use lower case; the
  screen and card show upper case (`K7M2Q`).
- **The seed**: `ArcadeDaily.challengeDate(code)` writes the code's number
  (base 31) as a date-shaped string with month 13–99, e.g. `0001-17-02`.
  The gallery loads `games/<file>?daily=<that>`, so the game's own `§ daily`
  block reads it and seeds from `GAME_ID + ':' + it` with no game change.
  The mapping is one-to-one (two codes never share a string), and no
  calendar day has a month above 12, so a challenge can never replay a
  Daily's run; `pick()` now rejects non-calendar dates, so the daily board
  ignores it too. `test-daily.mjs` checks 3,000 codes against every Daily
  seed of the next 366 days for each daily game (FNV-1a, 32 bits): no
  clash.
- **Play**: the cabinet in daily mode: title bar `Challenge K7M2Q`, the
  intro note and a toast say the whole class gets the same run. The first
  run **on this browser for this game and code** is the result; later runs
  are practice (toast). A lab computer shared by two classes needs a code
  per class (the teacher page says "Make a new one for each class").
- **The card**: the daily card with `Challenge K7M2Q` instead of
  `Daily #N`, the day it was played, no streak, "Same run for the whole
  class", and the challenge link. Share result and Save image as usual.
- **No leaderboard**, decided: a class compares cards (shown, shared, or
  read out); there are no accounts and no backend change. The panel says so
  in place of the board. Challenge rounds go out (when stats are on) as
  `round` rows with `challenge` (the code), `challenge_first` and
  `challenge_score` instead of `daily`, `daily_first` and `score`, so
  neither board in `build-leaderboards.mjs` takes them (it also skips any
  row with `challenge`; tested). With classroom mode on (the teacher page
  adds `?class=1` by default) nothing is sent at all.
- **Storage**: `arcade.challenge` = `{ "<game>/<code>": { …as a day, date,
  at } }`, the last 40; not exported, erased by "Reset everything". The
  Daily's `arcade.daily` is never touched.
- Any game with `daily` in its manifest (and not archived) can be a
  challenge, whatever its `from` date. A bad game or code shows the gallery
  with a notice.

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
- Class challenges: a "class results" page where students type their
  card's score would need a backend (it was left out on purpose); watch
  `challenge_link` and `challenge` events first.
- Plausibility checks for daily scores (all players play the same levels,
  so a score far above the bots' is suspect).
- A daily-specific card image for link previews (the `daily/` page shows
  the arcade's card today).
