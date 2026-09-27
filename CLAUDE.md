# Notes for Claude Code sessions

- Spec: `docs/PROJECT_BRIEF.md`. Its game design rules are non-negotiable.
- Static site, no build step. Public files: `index.html`, `assets/`, `games/`.
  Only those are published to GitHub Pages (see `.github/workflows/pages.yml`).
- Each game is one self-contained HTML file in `games/`, registered in
  `games/games.json`. The gallery embeds it in a sandboxed iframe; games must
  not depend on the gallery.
- Every game has 3+ achievements (manifest + `unlock()` postMessage snippet,
  see `docs/adding-a-game.md`), plus `goal` and `howToPlay` in the manifest.
  Games fill their window with no scrolling (the gallery shows them in a
  full-screen "cabinet" with a toolbar and panels) and must handle
  `arcade:pause` / `arcade:resume` messages.
- A game's `id` is its permanent feedback key; never rename it. Revisions
  edit the file in place and bump `version` + `updated` in the manifest.
- Always run `node scripts/validate.mjs` before pushing.
- Never push to `main`. Propose new or revised games as a PR (the template has
  the design checklist). Merging to `main` is what deploys.
- Feedback readback: `node scripts/fetch-feedback.mjs` (needs
  `FEEDBACK_READ_KEY`), or GitHub issues whose title starts with `[feedback]`.
  Details in `docs/feedback-backend.md`.

## Keeping context small

- A game's current design (constants, layout, balance numbers, open ideas)
  is in `docs/games/<id>.md`. Read that, not old PR bodies or git history.
- Game files are big: grep for what you need, then read just that range.
- Balance with `scripts/balance-<id>.mjs` (Murmuration has one: headless
  seeded bots, win rate by dusk time). For another game, copy it and adapt
  `buildDebug()` and the bots; don't build a harness from scratch.
- Print one line per bot/test case; never per-run logs or full page dumps.
- Diffs: `--stat` first. GitHub tools: `minimal_output`, small pages.

## Session workflow (one PR per conversation)

- The session-start hook prints the branch status. If it says the branch's PR
  was merged, restart it with the command it gives before doing anything.
  If it lists commits stranded on another `claude/*` branch, tell the user.
- Never push to a branch whose PR is already merged or closed.
- Finish in this order: validate, update `docs/games/<id>.md` (constants,
  balance tables, open ideas), push, open the PR. Keep the PR body short:
  what changed, key numbers, the checklist; link the notes file for detail.
- End the conversation with a handoff of at most 5 lines: PR link, what
  changed, what's open, suggested next step.
