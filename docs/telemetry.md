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

Nothing else: no names, IPs (Apps Script doesn't expose them), cookies or
user agents. The gallery footer tells players the stats are recorded. Turn
telemetry off with `telemetry: false` in `assets/config.js`.

Pressure Grid is a sandbox with no rounds, so it only produces session rows.
`validate.mjs` requires `arcade:result` in every game whose `goal` doesn't
start with "Sandbox".

## Reading it

```sh
export FEEDBACK_READ_KEY=...                        # same key as feedback
node scripts/fetch-telemetry.mjs                    # per game@version summary
node scripts/fetch-telemetry.mjs --game murmuration
node scripts/fetch-telemetry.mjs --format csv > telemetry.csv
```

The summary shows players, sessions, touch share, play time per session,
**human win rate**, win/loss round lengths, and rounds to first win.
Compare the win rate with the bot tables in `docs/games/<id>.md`
(`scripts/balance-<id>.mjs`). That difference is the bot–human gap.

Directly: `GET <web app URL>?key=<READ_KEY>&tab=telemetry[&game=<id>][&format=csv]`.

## Redeploying the Apps Script (one time, after this change merges)

The live script only knows about feedback. Until it's redeployed it
rejects telemetry posts (`bad rating`) and stores nothing. Feedback keeps
working the whole time, so the order of merge and redeploy doesn't matter.

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
5. Check it works (creates the `telemetry` tab with its header row):

   ```sh
   curl -sL "<web app URL>?key=<READ_KEY>&tab=telemetry"
   # -> {"ok":true,"count":0,"rows":[]}
   ```

   If `rows` contains feedback-style rows (with `rating`), the old version is
   still live: repeat step 3–4 and make sure you picked **New version**.

## Limits

Each round and each session is one web-app call. Apps Script's consumer
quotas (about 20k calls/day, 30 running at once) are far above what 5–20
playtesters produce. Revisit this if the arcade gets real traffic (batch
rounds into the session row).
