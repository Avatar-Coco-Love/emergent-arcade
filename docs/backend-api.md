# Backend contract (Apps Script v3)

`feedback/apps-script/Code.gs` is the one piece of this project that can't
ship by PR: every change means someone pastes it into Apps Script and
redeploys it. So v3 is built to not need changing. **New data goes through
the gallery (`assets/*.js`) and the fetch scripts, not the backend.**

Before touching `Code.gs`, check whether the change fits one of the paths
below. It almost always does. If it really doesn't, run
`node scripts/test-apps-script.mjs` (CI runs it too), bump `SCRIPT_VERSION`,
and follow the redeploy steps in [telemetry.md](telemetry.md#redeploying-the-apps-script-after-any-change-to-codegs).

## Where rows go

| `kind` | tab | required |
|---|---|---|
| missing or `feedback` | `feedback` | `game_id`, `game_version`, and `rating` 1–5 or a non-empty `comment` |
| `round` | `telemetry` | `game_id`, `game_version`, `seconds`, `outcome` (any `[a-z0-9-]{1,16}`: `win`, `loss`, `draw`...) |
| `session` | `telemetry` | `game_id`, `game_version`, `seconds` |
| anything else `[a-z][a-z0-9_-]{0,31}` | `events` | nothing (`game_id`/`game_version` optional, for gallery-level events) |

Columns that already exist are validated as before (see
[telemetry.md](telemetry.md)). A row that fails a required check is
rejected; a malformed optional field just becomes blank.

## Adding things without a redeploy

- **A new field on any row** (a score, a hint count, a feedback tag, an A/B
  variant, a gallery sort choice): just send it. Keys matching
  `[a-z][a-z0-9_]{0,31}` are kept in the row's `extra` cell as JSON
  (numbers, booleans, strings up to 500 chars, arrays/objects up to 2 levels
  and 32 items; 48 keys and 8 KB per row). Reads merge them back in, so
  `row.score` just works in the fetch scripts and CSV exports.
  Games already get this for free: any extra field in an `arcade:result`
  message is forwarded by `assets/telemetry.js`.
- **A new kind of record** (e.g. `gallery` for sort/filter use, `survey`,
  `playtest` notes, `retire` votes): send it with a new `kind`. It lands in
  the `events` tab with the common columns (`kind`, `game_id`,
  `game_version`, `session_id`, `client_id`, `device`, `submitted_at`) plus
  `extra`. Read with `?tab=events&kind=<kind>`. Kinds in use: `gallery`,
  `error`, `classroom` (the teacher page's "I used this in class" form,
  [gallery.md](gallery.md#teacher-page)).
- **Traffic growth**: send `{"batch": [row, ...], "defaults": {shared
  fields}}` (up to 200 rows, one request, one lock). The response is
  `{"ok": true, "stored": n, "errors": [{"i", "error"}]}`.
- **Spam / emergencies**, in Script properties (no redeploy):
  `WRITES_PAUSED=1` stops all writes, `BLOCKED_CLIENTS=id1,id2` silently
  drops those clients. `READ_KEY` may hold several comma-separated keys, to
  share read access or rotate a key without downtime.

## Reading

`GET <url>?key=<READ_KEY>&tab=feedback|telemetry|events` plus optional
filters `game`, `version`, `kind`, `since`/`until` (ISO times),
`limit` and `after` (paging: pass the response's `next` as `after`), and
`format=csv`. `since` skips older rows without reading them, so reads stay
fast as the sheet grows.

- `?ping=1` (no key): `{"ok": true, "version": 3}`, shows which version is live.
- `?key=...&info=1`: rows and columns per tab, and cells used against the
  Sheet's 10M-cell limit. A telemetry row is 22 cells, so the limit is
  roughly 400k rows; at playtest scale that's years. Near it, copy the tabs
  to a new spreadsheet and bind this same script to it (a setup step, not
  a code change).

## Compatibility

v3 accepts every payload v2 did and reads the existing tabs unchanged; the
first write adds an `extra` column at the end of each tab. The v2 gallery
works against v3 and the v3 gallery works against v2 (v2 ignores unknown
fields and rejects only non-win/loss outcomes and comment-only feedback).
