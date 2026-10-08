# Play telemetry

Anonymous play stats sit alongside ratings, so human play can be compared
with the balance bots (roadmap phase 1). Submitting needs no key, like
feedback. The data goes to the same Apps Script web app, which stores it in
a second tab, `telemetry`, of the feedback Sheet.

## What is recorded

The gallery records it (`assets/telemetry.js`). Games only report how each
round ended.

- **Round row** (`kind = round`), sent as soon as a game posts
  `{ type: "arcade:result", game, outcome: "win" | "loss", time }`.
  `time` is the game's own round clock, in seconds, excluding pauses.
- **Session row** (`kind = session`), sent when the player leaves the
  cabinet, switches game, or hides the tab. A session with under 3 s of play
  and no rounds is dropped. When the tab is shown again, a new session starts.

| column | round | session |
|---|---|---|
| `received_at` | server time | server time |
| `kind` | `round` | `session` |
| `game_id`, `game_version` | ✓ | ✓ |
| `session_id` | random per cabinet visit | same |
| `client_id` | random per browser (the id feedback already uses) | same |
| `device` | `touch` or `mouse` (coarse pointer) | same |
| `round` | round number in this session | |
| `outcome` | `win` / `loss` | |
| `seconds` | round length (game clock) | unpaused play time (panels closed) |
| `rounds`, `wins` | | rounds finished this session, and how many were won |
| `wall_seconds` | | time the cabinet was open, including panels |
| `achievements` | | ids newly unlocked this session, space-separated |
| `achievements_total` | | this player's unlocked count for the game |
| `submitted_at` | client time | client time |
| `level` | level/day/stage of a multi-stage game (1, 2, ...) | |
| `run` | random id tying one run's rounds together | |
| `attempt` | 1 = first try at this level in the run, 2+ = retries | |
| `reason` | why a round was lost (game-defined, e.g. `sun`) | |
| `stats` | a few game-specific numbers, `k=v k=v` | |
| `score`, `board`, `score_epoch` | the round's score, if it has one ([scores.md](scores.md)), in `extra` | |
| `handle`, `name`, `lb` | random leaderboard name, the typed name if any, and `lb: 0` if the player opted out of the leaderboard, in `extra` | |

The last five columns are optional and only filled for games that send
them (see below). Any other field a game adds to `arcade:result` is kept
too, in an `extra` column that reads merge back in
([backend-api.md](backend-api.md)). Newer columns are always added at the end, so old rows
stay aligned; the script extends an existing tab's header row itself.

Nothing else: no names beyond the leaderboard name (random, or typed by
the player, [scores.md](scores.md)), no IPs (Apps Script doesn't expose them), cookies or
user agents. The gallery footer tells players the stats are recorded. Turn
telemetry off with `telemetry: false` in `assets/config.js` (whole site), or
a player turns it off for their browser in the gallery's ⚙ settings
("Send anonymous play stats from this browser", stored as
`arcade.telemetryOptOut`). The opt-out stops every row below, gallery events
included, and sends nothing to say so. Classroom mode (a teacher's
`?class=1` link, [gallery.md](gallery.md#classroom-mode)) does the same
while it's on.

### Gallery events

How players find, share and keep games (roadmap phase 1 and 2). They go out
as `kind = gallery` rows, which backend v3 stores in the `events` tab with
no redeploy ([backend-api.md](backend-api.md)); every field except the
common columns is in `extra`. One row per action:

| `action` | when | fields |
|---|---|---|
| `open` | a cabinet opens a game | `game_id`, `game_version`, `from` (`list`, `continue`, `archive`, `records`, `spotlight`, `teachers`, `link`, `daily`, `challenge`; `daily` = the date when it opened as the Daily Challenge, `challenge` = the code of a class challenge), `position` (1-based, for cards), `sort` (`featured` or the sort), `verb` / `topic` if filtered, `searching` if a search was active |
| `share` | Share pressed | `game_id`, `game_version`, `method` (`share` sheet, `copy`, `prompt`), `from` (`toolbar`, `menu`, `about`); the gallery header's share (the whole arcade) has `from: "gallery"` and no game fields |
| `download` | a standalone copy was saved | `game_id`, `game_version`, `from` |
| `download_topic` | a topic's zip was saved ("Download all <topic> games") | `topic`, `games` (count), `from` (`gallery`, `teachers`) |
| `sort` | the sort changed | `sort` |
| `filter` | a verb or topic chip was pressed | `verb` or `topic` (`all` when cleared) |
| `search` | 1.5 s after typing stops | `query_len`, `results` (never the text) |
| `identity` | the recovery code was offered or used ([scores.md](scores.md), "Recovery code") | `step` (`callout`: offered after a typed name; `show`: the code seen the first time; `copy`; `restore`: a saved code or an import's identity used, sent before the switch, so it carries the old id), `from` (`cabinet`, `records`, `import`) |
| `settings` | a settings action (`export` has `identity: 1` when the file carries it) | `setting`: `export`, `import`, `reset_achievements`, `reset_all`, `reset_game_achievements` (with `game_id`), `stats_on` |
| `nudge` | the "Rate this game?" callout was answered | `game_id`, `game_version`, `result` (`rate`, `dismiss`) |
| `about_arcade` | the "About the arcade" dialog opened | |
| `records` | the Records view (`#/records`) opened | `mine` (1 with the "My bests" filter) |
| `teachers` | the teacher page (`#/teachers`) opened | |
| `classroom_link` | "Copy classroom link" pressed on the teacher page | `method` (`copy`, `select`) |
| `challenge_link` | "Make a class challenge" or "Copy challenge link" pressed on the teacher page | `game_id`; `classroom` (1 if the link turns classroom mode on) on Make, `method` (`copy`, `select`) on copy |
| `challenge` | the counted (first) run of a class challenge ended | `game_id`, `game_version`, `challenge` (code), `score`, `levels` ([daily.md](daily.md), "Class challenge") |
| `daily` | the counted (first) run of a Daily Challenge ended (`arcade:final`) | `game_id`, `game_version`, `daily` (date), `score`, `levels` ([daily.md](daily.md)) |
| `handle` | a public name picked or typed, or the leaderboard toggled, in the cabinet's Records panel or the Records view | `handle` and `name` (when listed; `name` only for a typed one), `lb` (1 or 0); `scripts/build-leaderboards.mjs` reads it ([scores.md](scores.md)) |

Daily Challenge rounds are ordinary `round` rows with `daily` (the date)
and `daily_first` (1 for the run that counts, 0 for practice), and no
`board` ([daily.md](daily.md)); `fetch-telemetry.mjs` adds a `daily:`
section, one line per date. Class challenge rounds carry `challenge`
(the code), `challenge_first` and `challenge_score` instead, with no
`daily`, `score` or `board`, so they reach no leaderboard; shares from the
challenge card have `from: "challenge"`. With classroom mode on (the
default for a challenge link) none of this is sent.

`node scripts/fetch-telemetry.mjs` reads them too and prints a short
`gallery:` section (opens by source and list position, shares by method,
downloads, sorts, filters, settings, nudge answers, searches with no
results).

### Games with levels (optional fields)

A game made of stages (Ant Trails' five days) still posts one
`arcade:result` per stage, and adds what's needed to read it per level:

```js
window.parent.postMessage({ type: 'arcade:result', game: GAME_ID,
  outcome: 'loss', time: 61.4,          // as before
  level: 3,                             // which stage (1-based)
  run: 'k3j9x0aa',                      // random id per run, [a-z0-9]{1,16}
  attempt: 2,                           // 2nd try at this stage in this run
  reason: 'ants',                       // why it was lost, [a-z0-9-]{1,24}
  stats: { dawn: 24, lost: 9, trails: 11, rain_s: 4.5 } }, '*');
```

`stats` holds up to 16 numbers (keys `[a-z][a-z0-9_]{0,15}`, values rounded
to 0.1) about how the stage was played: whatever the game's balance bots
measure, so humans and bots can be compared number for number. Keep it to
counts and seconds; never text a player typed. Each game documents its keys
in `docs/games/<id>.md`. The gallery and the server both drop anything
malformed, so a bad field loses that field, not the row.

Reading it: `fetch-telemetry.mjs` prints one line per level, and per level
revision when the game sends `nv` (a number bumped when one level is
retuned, so its old and new numbers don't mix: `L3 nv2`). Rounds with no
level get an `L0` line (Murmuration's classic night). Each line ends with
the median of every stat and of every numeric extra field the game sends
(`flock_end 44 spook 0.45 …`); arrays and text extras are left out.
`--input rows.json` summarizes a saved `--format json` export the same way.
`--pool` adds, per game, the same lines pooled across game versions for
levels that send `nv` (`L3 nv1 (v8+v9, 5p)`): a revision that leaves a
level alone (same `nv`) keeps adding to its count instead of starting over.

Cost: one extra ~150-byte cell per round and no extra requests. Session
rows are unchanged; "where did players stop" is derived from them (a
session's play time beyond its finished rounds means they left mid-round).

Games without levels can send `reason` and `stats` too (Hot Iron,
Hourglass Delivery and Pressure Grid do). The summary then adds losses by
reason and the median of each stat for wins and for losses.
`validate.mjs` requires `arcade:result` in every game whose `goal` doesn't
start with "Sandbox".

### Errors

Uncaught errors and unhandled promise rejections, so a crash on a
player's phone is visible. Kind `error` rows land in the events tab
(no backend change):

- **Games**: the crash-report snippet at the top of every game's `<head>`
  posts `{ type: "arcade:error", game, message, line, col }` (at most 3
  per load). `assets/cabinet.js` forwards it with `source: "game"` and the
  session's `game_id`, `game_version`, `session_id`.
- **Gallery**: `assets/telemetry.js` listens for its own errors
  (`source: "gallery"`, plus `file`); "Script error." from browser
  extensions is skipped, and so is any error whose file isn't one of the
  site's own `.js` files (code injected by in-app browsers and webviews).

At most 5 distinct error rows per page load, and only when telemetry is on.
Read them with `node scripts/fetch-errors.mjs [--game <id>] [--since
YYYY-MM-DD]`, one line per distinct error, newest first. Line numbers
refer to the game file at that version.

Before shipping, `node scripts/monkey-games.mjs [<id>]` gives every game
seeded random input at phone and desktop sizes in a sandboxed iframe and
fails on any error, console error or scrolling (CI runs it on every PR).

## Reading it

```sh
export FEEDBACK_READ_KEY=...                        # same key as feedback
node scripts/fetch-telemetry.mjs                    # per game@version summary
node scripts/fetch-telemetry.mjs --game murmuration
node scripts/fetch-telemetry.mjs --format csv > telemetry.csv
```

The summary shows players, sessions, touch share, play time per session,
the **10-minute target** (share of sessions of 10+ minutes, players whose
sessions add up to 10+ minutes, the longest player),
**human win rate**, win/loss round lengths, and rounds to first win. For
games that send `level`, it adds one line per level (tries, win rate
overall and on the first try, win/loss time, losses by reason, median of
each stat), how many levels each run won, and where sessions stopped
(after which level, and how many left partway into a round).
`--input rows.json` summarizes a saved `--format json` export offline.
Compare the win rate with the bot tables in `docs/games/<id>.md`
(`scripts/balance-<id>.mjs`). That difference is the bot–human gap.

Directly: `GET <web app URL>?key=<READ_KEY>&tab=telemetry[&game=<id>][&format=csv]`.

## Redeploying the Apps Script (after any change to `Code.gs`)

Needed once for backend v3 (2026-09-28), which is meant to be the last
change: new fields and new kinds of rows no longer need a redeploy, see
[backend-api.md](backend-api.md). Until v3 is live, the old version keeps
storing rows but drops fields it doesn't know; nothing breaks.

1. Open the feedback Google Sheet, then **Extensions → Apps Script**.
2. In `Code.gs`, select all and replace it with the contents of
   [`feedback/apps-script/Code.gs`](../feedback/apps-script/Code.gs) from
   `main`. Save (Ctrl/Cmd+S).
3. **Deploy → Manage deployments**. Select the existing **Web app**
   deployment, then click the **pencil (Edit)** icon.
4. **Version: New version** (description e.g. "telemetry tab"). Leave
   *Execute as: Me* and *Who has access: Anyone* as they are. Click
   **Deploy**.
   - Don't use **New deployment**: that creates a different `/exec` URL,
     and `assets/config.js` would need changing.
   - No new permissions are needed, so there should be no authorization
     prompt. If one appears, accept it: it's the same spreadsheet access.
5. Check it works:

   ```sh
   curl -sL "<web app URL>?ping=1"
   # -> {"ok":true,"version":3}
   ```

   Anything else (e.g. `unauthorized`) means the old version is still live:
   repeat steps 3–4 and make sure you picked **New version**. The first new
   row in each tab adds an `extra` column at the end of its header.

## Limits

Each round and each session is one web-app call. Apps Script's consumer
quotas (about 20k calls/day, 30 running at once) are far above what 5–20
playtesters produce. If the arcade gets real traffic, have
`assets/telemetry.js` send rounds in one `batch` request with the session
row; the backend already accepts it ([backend-api.md](backend-api.md)).
