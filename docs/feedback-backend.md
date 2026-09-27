# Feedback backend setup (Google Sheet + Apps Script)

Takes about 10 minutes and needs to be done once. Until it's done, the
feedback form still works: it opens a pre-filled GitHub issue instead of
saving silently.

## 1. Create the sheet and script

1. Create a new Google Sheet, e.g. "Emergent Arcade feedback".
2. In the sheet: **Extensions → Apps Script**.
3. Replace the contents of `Code.gs` with
   [`feedback/apps-script/Code.gs`](../feedback/apps-script/Code.gs) from this
   repo. Save.

## 2. Set the read key

The read key protects the GET (export) endpoint. Anyone can submit feedback;
only holders of the key can read it back.

1. In the Apps Script editor: **Project Settings (gear) → Script properties →
   Add script property**.
2. Name `READ_KEY`, value: a long random string (e.g. output of
   `openssl rand -hex 24`). Keep it out of the repo.

## 3. Deploy as a web app

1. **Deploy → New deployment → Select type: Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
3. Authorize when prompted (it only needs access to this spreadsheet).
4. Copy the **Web app URL** (ends in `/exec`).

## 4. Point the gallery at it

Set `feedbackEndpoint` in [`assets/config.js`](../assets/config.js) to the
web app URL and merge that via PR. The URL is not a secret: it only accepts
well-formed feedback rows, and reading requires the key.

## Reading feedback back

- **In the sheet** – the `feedback` tab has one row per submission:
  `received_at, game_id, game_version, rating, comment, client_id, submitted_at`.
  File → Download → CSV for a quick export.
- **From a terminal / Claude Code session**:

  ```sh
  export FEEDBACK_READ_KEY=...            # the READ_KEY script property
  node scripts/fetch-feedback.mjs                       # per-version summary + comments
  node scripts/fetch-feedback.mjs --game pressure-grid  # one game
  node scripts/fetch-feedback.mjs --format csv > feedback.csv
  ```

  In a Claude Code cloud environment, store `FEEDBACK_READ_KEY` as an
  environment variable and allow `script.google.com` and
  `script.googleusercontent.com` in the environment's network settings.
- **Directly**: `GET <web app URL>?key=<READ_KEY>&game=<id>&format=csv`.

## Updating the script later

After editing `Code.gs`, use **Deploy → Manage deployments → Edit → Version:
New version**. That keeps the same `/exec` URL, so `config.js` doesn't change.
Step-by-step: [telemetry.md](telemetry.md#redeploying-the-apps-script-one-time-after-this-change-merges).

The same script also stores anonymous play telemetry in a `telemetry` tab;
see [telemetry.md](telemetry.md).

## GitHub-issue fallback

Feedback submitted while `feedbackEndpoint` is empty (or if the endpoint is
down) becomes a GitHub issue titled `[feedback] <game-id> v<version>: N/5`.
Find them with the issue search `is:issue "[feedback]" in:title`. The
`feedback` label is applied only when the submitter has triage rights, so
search by title rather than label.
