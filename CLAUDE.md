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
