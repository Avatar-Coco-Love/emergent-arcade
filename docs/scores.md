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
- Cards show "Best 40.2 s" (or "3 bests" for games with boards).
- Export/import carries bests (the better one per board wins on import);
  "Reset everything" erases them.

### Storage

| key | value |
|---|---|
| `arcade.best.<id>` | `{ "e<epoch>:<board>": { score, at, version } }` |
| `arcade.handle` | the public name, if the player picked another one |
| `arcade.leaderboardOptOut` | `"1"`: scores still go with play stats, with `lb: 0` and no name, and stay off the board |

## Public names

A handle is two words from fixed lists in `assets/scores.js` ("Amber
Otter"), 1,024 combinations. The default comes from the browser's anonymous
client id; "Pick another name" draws a random one. **Players never type
one**, so there's nothing to moderate and no real names. The builder
rejects any handle not made of the two lists. Append words to the lists;
never reorder them (it would rename everyone).

The leaderboard never shows the client id: entries carry `p`, a hash of it
(`ArcadeScores.hash("player:" + id)`), so the gallery can find "you" and
the builder can keep one entry per player.

## The leaderboard file

`scripts/build-leaderboards.mjs` writes `leaderboards.json` into the site
at every deploy, and `.github/workflows/pages.yml` also runs hourly
(`cron: 17 * * * *`) to rebuild it.

```json
{ "format": "emergent-arcade-leaderboards", "version": 1,
  "updated_at": "…", "through": "<newest row read>",
  "games": { "bubble-glass": { "epoch": 1,
    "boards": { "roof": [ { "h": "Jade Owl", "p": "…", "s": 9.4, "at": "2026-10-01", "v": 2 } ] } } } }
```

How it stays cheap as the arcade grows:

- **Incremental.** It downloads the live file, then reads only telemetry
  rows received since its `through` (the backend's `since` skips older
  rows unread), with a 10-minute overlap (merging is idempotent). A run
  reads one hour of rounds, not the whole tab.
- **Bounded output.** 25 entries per board, 50 boards per game, one entry
  per player (their best). The file grows with the number of games, not
  players or rounds.
- **Never wiped by an outage.** If the read fails or the secret is missing,
  the live file is republished unchanged.
- **Opt-outs and renames.** A player's newest row decides: `lb: 0` removes
  them from every board, a new handle renames every entry. Picking a name
  or toggling the leaderboard in the Records panel sends a `handle` gallery
  event (`kind = gallery`, `action = handle`, with `handle` and `lb`), which
  the builder reads from the `events` tab, so a rename shows at the next
  hourly build without playing another round. (Someone who opted out and
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

The same build counts **plays**: telemetry session rows (one per cabinet
visit with 3+ s of play or a finished round, [telemetry.md](telemetry.md)),
per game and version, into a `plays` block of `leaderboards.json`:

```json
"plays": { "since": "2026-09-27", "through": "<newest session row>",
  "recent": { "<hashed session id>": 1759334700892 },
  "games": { "hot-iron": { "1": 2, "2": 5, "3": 3, "4": 1 } } }
```

- **Card** (`assets/gallery.js`): "18 plays · 5 on v9" in the card footer
  ("18 plays" when every play is on the current version). Hidden under 10
  plays (`PLAYS_SHOWN`), since "2 plays" reads as "nobody plays this".
  Filled in place once the file loads, so focus and scroll don't move.
- **About panel** (`assets/cabinet.js`, "Plays by version"): every version,
  newest first, with a bar. Versions from before counting began (no plays,
  released on or before `since`) fold into one "v1–v5 · before counting"
  row. Telemetry started 2026-09-27, so older versions have no counts.
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

## Cheating

Scores are posted by the browser, so a determined person can forge one.
For a hobby arcade that's accepted, with cheap limits: `max` per game, one
entry per player, board names checked against `boardList`, and the
backend's `BLOCKED_CLIENTS` script property (no redeploy) to drop a
spammer's rows. If it ever matters, the next step is plausibility checks
per game in the builder (e.g. a time score must equal the row's `seconds`).
Play counts can be inflated the same way; `BLOCKED_CLIENTS` covers it.

## Open ideas

- Weekly boards next to all-time ones (a fresh chance for new players):
  the builder already has dates; add a `week` board per game.
- A gallery-wide "Records" view: your bests across every game.
- Games showing `arcade:best` in their HUD (each game's depth-pass PR;
  Bubble Glass v3 does).
- Daily seeded challenges share one board per day (`board: "d2026-10-01"`).
