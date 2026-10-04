# Scores, personal bests and leaderboards

Every game has a score, so a player always has a number to beat: their own
best, and the leaderboard's. The system is built so that the eleventh game
and the hundredth cost the same: **a game joins with one manifest entry**,
and nothing on the server changes (no Apps Script redeploy).

```
game ──arcade:result──▶ gallery (assets/scores.js)
                          ├─ personal best per board (localStorage)
                          ├─ toasts: "New best!", "your best 40.0 s"
                          ├─ Records panel (🏆): best + top 10 + you
                          └─ telemetry round row + score, board, handle
                                     │
                     Apps Script "telemetry" tab (existing, unchanged)
                                     │  hourly GitHub Action
                     scripts/build-leaderboards.mjs (incremental)
                                     ▼
                     leaderboards.json on the published site
```

## The manifest entry (required, checked by `validate.mjs`)

```json
"score": { "label": "Fastest escape", "better": "lower", "format": "time",
           "from": "time", "wins": true, "max": 3600, "epoch": 1,
           "boards": "level_id", "boardList": ["first-turn", "roof"] }
```

| field | meaning |
|---|---|
| `label` | shown as "<label>: <value>" ("Fastest escape: 11.2 s") |
| `better` | `higher` or `lower` |
| `format` | `count` (default) or `time` (seconds, shown `41.2 s` / `1:05.0`) |
| `from` | where the number is in `arcade:result`: `score` (default), `time`, `level`, or `stats.<key>` |
| `wins` | only won rounds count |
| `max` | plausibility cap: the gallery and the leaderboard drop anything above it |
| `epoch` | **bump it whenever the score's meaning changes** (a revision that makes rounds longer, a new scoring rule). Old bests stay stored but stop showing, and the leaderboard starts empty. |
| `boards` | optional: one board per level, keyed by `level_id` or `level` (`level-3`) |
| `boardList` | optional: the boards in order, so the Records picker shows them before any are played; the leaderboard rejects others |

A game can also post its own number: `score` (and optionally `board`,
`[a-z0-9-]{1,24}`) in `arcade:result` wins over `from`. That's the way to
score something no single field holds (points, combos, depth reached in an
endless mode). Keep it a plain number; round to 0.1.

### Current scores (v0, from existing fields)

Every game got a score without touching its file, read from what it already
reports. Most have a ceiling (a game with 8 seasons scores at most 8), so
many players will tie at the top. That is the depth pass's job
(`ROADMAP.md`): each game's revision adds a mode that keeps going, posts
its own `score`, and bumps `epoch`.

| game | score | ceiling |
|---|---|---|
| pressure-grid | Stars (own `score`, total over levels, v8 / epoch 2) | 15 (3 per level, 5 levels so far) |
| orbit-garden | Fastest bloom (time, wins) | none |
| murmuration | Fastest flight (time, wins) | none |
| ant-trails | Days survived (level, wins) | 6 |
| wildfire-line | Fastest burnout (time, wins) | none |
| hourglass-delivery | Glasses filled (`stats.filled`) | 8 |
| hot-iron | Fastest forging (time, wins) | none |
| island-census | Seasons survived (`stats.seasons`) | 8 |
| loom | Shapes held (level, wins) | 7 |
| terrace-garden | Gardens bloomed (level, wins) | 4 |
| bubble-glass | Chapter time (own `score`, per chapter, v3 / epoch 2) | none |

## Showing the best inside a game (optional)

The gallery posts this to the game when it loads and after every new best:

```js
{ type: "arcade:best", game: "<id>", better: "lower", bests: { main: 40.2 } }
```

A game may show it as a target ("Best 40.2 s") in its HUD. It must still
work without it (opened directly, it never arrives). Games can't read the
gallery's storage themselves: the iframe is sandboxed without
same-origin, so `localStorage` inside a game throws.

## In the gallery

- `assets/scores.js` (`ArcadeScores`): reads the spec, turns a result into
  `{ board, value }`, keeps bests, formats numbers, makes handles, loads
  `leaderboards.json`. `scripts/scores.mjs` runs the same file in Node.
- On each scored result the cabinet shows a toast: "🥇 New best! … (was
  50.0 s) · #2 on the leaderboard", "Your first best: beat it next time",
  or "… · your best 40.0 s".
- The 🏆 panel is titled **Records**: your best (a picker when a game has
  several boards), the top 10 with your row highlighted, and your public
  name. Your own best is merged in at once; the published file catches up
  within the hour.
- The gallery's **Records view** (`#/records`) shows every game's board on
  one page: leader, your best and place, expandable top 10, and a "My
  bests" filter ([gallery.md](gallery.md)). `ArcadeScores.standings()`
  does the merge for both it and the cabinet. It has the same name
  controls as the 🏆 panel (show me, pick another name, type a name), from
  `assets/name-ctl.js`.
- Cards show "Your best 40.2 s" (or "3 bests" for games with
  boards): your own best on this browser, not the leaderboard's.
- Export/import carries bests (the better one per board wins on import);
  "Reset everything" erases them.

### Storage

| key | value |
|---|---|
| `arcade.best.<id>` | `{ "e<epoch>:<board>": { score, at, version } }` |
| `arcade.handle` | the random public name, if the player picked another one |
| `arcade.name` | the typed public name, if any (the random one stays as the fallback) |
| `arcade.leaderboardOptOut` | `"1"`: scores still go with play stats, with `lb: 0` and no name, and stay off the board |

## Public names

Every player has a **random name**: two words from fixed lists in
`assets/scores.js` ("Amber Otter"), 1,024 combinations. The default comes
from the browser's anonymous client id; "Pick another name" draws a random
one. The builder rejects any random name not made of the two lists. Append
words to the lists; never reorder them (it would rename everyone).

A player can also **type a name** in the Records panel ("Type a name").
It's checked in the gallery for instant feedback, but **the builder is the
authority**: it checks every typed name again and never trusts the client.
A typed name that fails there (taken, reserved, blocked, taken down) is
simply not shown: the player's random name is. "Pick another name" goes
back to random names and drops the typed one.

The leaderboard never shows the client id: entries carry `p`, a hash of it
(`ArcadeScores.hash("player:" + id)`), so the gallery can find "you" and
the builder can keep one entry per player.

### Typed names

Rules in `assets/names.js` (`ArcadeNames`), run by the gallery and by the
builder (`scripts/names.mjs`); tests: `node scripts/test-names.mjs`
(also in CI).

- **Characters.** Trimmed, runs of spaces collapsed to one, NFC. Then 3–16
  characters, only letters, digits 0–9 and single spaces, at least one
  letter. No emoji or punctuation. Letters of **one script** (Latin,
  Cyrillic, Greek, Arabic, Hangul, …; Chinese and Japanese Han and kana count
  as one). No combining marks in Latin, Greek or Cyrillic (stacked accents);
  accented letters are fine precomposed ("Zoë").
- **The tag.** A typed name always shows with 4 hex digits from the player
  hash `p`: **"Coco ·4F2A"** (`ArcadeNames.tag`). Typed names can't hold
  "·", so nobody can type someone's tag; random names show as before, with
  no tag. A typed name equal to a random one ("Amber Otter") is refused.
- **Folding.** Names are compared by their key: lowercase, accents removed
  (NFKD), look-alikes folded (0/o, 1/l/i, 3/e, 4/a, 5/s, 7/t, 8/b, 2/z, 6
  and 9/g, ß/ss, ø/o, ł/l, Cyrillic and Greek letters that look Latin), "ph"
  as f, "vv" as w, spaces removed. "C0co", "co co" and Cyrillic "Сосо" are
  all "Coco". Kept short on purpose: folding "rn" as m or "ck" as k turns
  ordinary names ("Fukuda") into list words.
- **First claim wins.** The builder gives a name (by key) to the first
  player hash whose row claims it, in received order. A later claimant's
  rows are shown under their random name; the gallery reads the claims from
  `leaderboards.json` (`names`), refuses a taken name as it's typed, and if
  someone got there first says "“Coco” is taken, so the leaderboard shows
  you as Amber Otter". A name is freed when its holder types another one,
  picks a random one, or is taken down; opting out keeps it.
- **Reserved words** (`assets/name-reserved.json`): admin, arcade,
  official, moderator, staff, system, Claude, Anthropic, owner, support,
  mod, dev and similar.
- **Blocklist** (`assets/name-blocked.json`): slurs, sexual terms and
  common insults, its own data file, read by the gallery (fetched when the
  form opens) and the builder.
  Both lists are matched after folding, with spaces removed and repeated
  letters collapsed ("fuuuck", "a s s"). Each list has two parts:
  `anywhere` words are refused inside any name ("xadminx"); `word` words,
  short ones that hide in ordinary names ("ass" in Glass, "mod" in Desmond,
  "dev" in Devon), only as a whole word or the whole name. Add a word to
  the list that fits; list it once in plain lowercase (folding covers
  "5h1t"). A list change applies to names already held at the next build.
- **Takedowns** (`data/name-takedowns.json`, in the repo, not published):
  `{ "players": [{ "p": "<hash from leaderboards.json>", "note": "…" }] }`.
  At the next build those players show under their random name again, their
  typed name is freed, and their typed names are ignored until the line is
  removed. Merge to `main` to apply (the hourly build reads `main`).
- **Known gap.** A word filter misses creative spellings: punctuation
  can't get past the character rules, but near-misses, sound-alike
  spellings, words split by other letters and words in other languages
  can. Takedowns are the cleanup: find the player's `p` in
  `leaderboards.json`, add it, and, if it's a pattern, add the word to the
  blocklist so the next attempt is caught too.

## The leaderboard file

`scripts/build-leaderboards.mjs` writes `leaderboards.json` into the site
at every deploy, and `.github/workflows/pages.yml` also runs hourly
(`cron: 17 * * * *`) to rebuild it.

```json
{ "format": "emergent-arcade-leaderboards", "version": 1,
  "updated_at": "…", "through": "<newest row read>",
  "games": { "bubble-glass": { "epoch": 1,
    "boards": { "roof": [ { "h": "Jade Owl", "p": "…", "s": 9.4, "at": "2026-10-01", "v": 2 },
                          { "h": "Coco ·4F2A", "r": "Amber Otter", "p": "…", "s": 9.1, … } ] } } },
  "names": { "<p>": { "n": "Coco", "r": "Amber Otter", "at": "<first claimed>" } } }
```

`h` is what the board shows; an entry with a typed name also keeps the
random one in `r`, so a takedown can fall back without new rows. `names`
holds the typed-name claims between builds (first claim wins, above).

How it stays cheap as the arcade grows:

- **Incremental.** It downloads the live file, then reads only telemetry
  rows received since its `through` (the backend's `since` skips older
  rows unread), with a 10-minute overlap (merging is idempotent). A run
  reads one hour of rounds, not the whole tab.
- **Bounded output.** 25 entries per board, 50 boards per game, one entry
  per player (their best). The file grows with the number of games, not
  players or rounds.
- **Never wiped by an outage.** If the read fails or the secret is missing,
  the live file is republished with its scores unchanged (takedowns and
  list changes still apply to the names shown).
- **Opt-outs and renames.** A player's newest row decides: `lb: 0` removes
  them from every board, a new name renames every entry. Picking or typing
  a name or toggling the leaderboard in the Records panel sends a `handle`
  gallery event (`kind = gallery`, `action = handle`, with `handle` (the
  random name), `name` (the typed one, if any) and `lb`), which the builder
  reads from the `events` tab, so a rename shows at the next hourly build
  without playing another round. Round rows carry the same fields. (Someone who opted out and
  back in reappears with their next scored round: their old entries were
  dropped.)
- `--full` rebuilds from every row (after changing the rules).

Offline: `node scripts/build-leaderboards.mjs --input rows.json --out
lb.json` on a `fetch-telemetry.mjs --format json` export. It prints one
line per board.

### Setup (once, by the maintainer)

1. GitHub repo → Settings → Secrets and variables → Actions → New
   repository secret: `FEEDBACK_READ_KEY`, the same value as the Apps
   Script `READ_KEY` (what `fetch-telemetry.mjs` uses).
2. That's it. Without the secret the deploy still works; the leaderboard
   just stays empty ("No scores yet") while personal bests work.

Troubleshooting: the "Build leaderboards" step's log says why a run kept
the old file. `endpoint: unauthorized` means the secret isn't the
`READ_KEY` (not the deployment id). `not JSON: <page title>` means Apps
Script answered with an error page; the builder tries 3 times, and the
next hourly run tries again.

GitHub stops scheduled workflows after 60 days without a commit; any push,
or "Enable workflow" on the Actions tab, restarts it.

## Play counts

The same build counts **plays** per game and version, into a `plays` block
of `leaderboards.json`. A play is a telemetry session row (one per cabinet
visit, [telemetry.md](telemetry.md)) with a finished round (win or loss) or
30+ s of play (`PLAY_SECONDS`), so quick looks don't count but open-ended
games and long first levels do. On the data to Oct 1 that's 77 of 113
sessions (round only: 68; 60 s: 71). The file records the rule
(`"rule": "round-or-30s"`); when `PLAY_SECONDS` changes, the next build
sees a different rule and recounts every session row:

```json
"plays": { "rule": "round-or-30s", "since": "2026-09-27", "through": "<newest session row>",
  "recent": { "<hashed session id>": 1759334700892 },
  "games": { "hot-iron": { "1": 2, "2": 5, "3": 3, "4": 1 } } }
```

- **Card** (`assets/gallery.js`): "18 plays · 5 on v9" in the card footer
  ("18 plays" when every play is on the current version), shown from the
  first play (it used to wait for 5; small counts are honest, and new games
  start there).
  Filled in place once the file loads, so focus and scroll don't move.
- **About panel** (`assets/cabinet.js`, "Plays by version"): every version,
  newest first, with a bar. Versions from before counting began (no plays,
  released on or before `since`) fold into one "v1–v5 · before counting"
  row. Telemetry started 2026-09-27, so older versions have no counts.
- **Arcade total** (`assets/gallery.js`, `PLAY_TOTAL_MIN`): "1,240 games
  played" under the header tagline, summed over every game in the manifest
  (archived ones too) from the same block. Hidden below 250 plays so a young
  arcade doesn't look empty; it counts plays, not visitors (no unique-person
  count is kept, and opted-out players are missing).
- **Never double-counted.** Counting isn't idempotent like bests, so
  `recent` keeps hashed ids of the sessions in the 10-minute overlap
  window and skips them when they are read again. Tested: an incremental
  run equals a full recount.
- **Never lost.** Plays are read and kept separately from scores: if the
  session read fails, the previous counts are kept. A previous file
  without `plays` (or `--full`) recounts every session row, so the history
  since telemetry began is rebuilt from the sheet.
- **Only real versions.** Rows for an unknown game, or a version outside
  1..the manifest's, are ignored. A game renamed would lose its counts,
  but ids never change. Players who turned off play stats aren't counted
  (the About note says so).
- Counts include everyone, the maintainer's own playtests too.

## Spotlight tallies

The same build keeps a `spotlight` block for the Spotlight view
([gallery.md](gallery.md), "Spotlight"), from session rows of each game's
**current version** only (a revision starts the game over):

```json
"spotlight": { "through": "<newest session row>", "recent": { "<hashed session id>": 1759334700892 },
  "games": { "hot-iron": { "v": 4, "sessions": 3, "early": 2, "rounds": 2, "wins": 0,
                           "players": { "<8-char player hash>": 67 } } } }
```

`early` counts visits with no finished round; `players` adds up each
player's play seconds (capped at 400 players per game), which gives the
player count and the longest player. Incremental like the play counts
(`recent` skips sessions re-read in the overlap; tested: an incremental run
equals a full recount), kept as is if the read fails, and rebuilt from
every session row when the previous file has none (or with `--full`).

## Cheating

Scores are posted by the browser, so a determined person can forge one.
For a hobby arcade that's accepted, with cheap limits: `max` per game, one
entry per player, board names checked against `boardList`, and the
backend's `BLOCKED_CLIENTS` script property (no redeploy) to drop a
spammer's rows. If it ever matters, the next step is plausibility checks
per game in the builder (e.g. a time score must equal the row's `seconds`).
Play counts can be inflated the same way; `BLOCKED_CLIENTS` covers it.
Typed names are never trusted: a forged row with a bad name only shows the
player's random name, since the builder runs every check again.

## Open ideas

- `names` grows with players who typed a name (about 80 bytes each), not
  with games. If it ever matters, free the claims of players who are on no
  board and haven't played for months.

- Weekly boards next to all-time ones (a fresh chance for new players):
  the builder already has dates; add a `week` board per game.
- ~~A gallery-wide "Records" view~~: done (`#/records`). Next: weekly
  boards there, and a "your place changed" note since the last visit.
- Games showing `arcade:best` in their HUD (each game's depth-pass PR;
  Bubble Glass v3 does).
- ~~Daily seeded challenges share one board per day~~: done as the Daily
  Challenge ([daily.md](daily.md)): its boards are a separate `daily` block
  of `leaderboards.json`, first runs only, not game boards.
