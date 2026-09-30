# Workflow: keeping sessions small as the arcade grows

The arcade is built by many short Claude Code sessions, one PR each. What a
session can do well is limited by how much it has to read, so the repo is
laid out in layers: read the top layer always, the next when the task needs
it, and the rest only to answer a specific question. Nothing is deleted; it
moves down a layer.

## Layers

| Layer | What | Size target |
|---|---|---|
| Always | `CLAUDE.md` | ~5 KB |
| Per task | `docs/games/<id>.md` (current design), `docs/findings.md` (checklist), the doc for the part being changed | notes < 8 KB (validated), findings < 12 KB |
| By range | game files: `node scripts/outline.mjs <id>` first, then read the lines you need | outline ~1–3 KB per game |
| By query | `node scripts/games.mjs [<id>]` instead of reading `games/games.json`; `fetch-telemetry.mjs --game <id>`, `fetch-feedback.mjs --game <id>` | one line per game |
| Archive | `docs/history/<id>.md`, `docs/findings-log.md`, git history, old PRs | unbounded; grep a heading, never read whole |

Where data lives for good: feedback and play telemetry in the Apps Script
sheet (`docs/feedback-backend.md`, `docs/telemetry.md`); scores in
`leaderboards.json`; design reasoning in the notes, history and findings
files; the exact change in git. Sessions summarize from those sources
instead of copying raw data into the repo.

## Session shapes

One PR per conversation. When the PR is open and the handoff is written,
start a fresh conversation for the next round, even on the same game: the
notes file and the PR link carry everything over. Send playtest feedback in
one message rather than one issue per message.

- **Revise a game**: read its notes, `findings.md`, then telemetry and
  feedback for that id; outline the file; edit; balance; update notes and
  history; validate; PR; playtest artifact.
- **New game**: `ROADMAP.md`, `findings.md`, `adding-a-game.md`, the notes of
  the closest existing game; copy its balance script.
- **Triage** (which games need work): `games.mjs`, then telemetry and
  feedback summaries across games. No game files.
- **Platform** (gallery, scripts, docs): the relevant doc in `docs/`, then
  the code by range.

## Subagents

Use them when the work needs much more reading than the answer it returns:

- exploring where something lives across many files (built-in `Explore`),
- running balance sweeps and returning only the summary table,
- bulk mechanical edits over many files, split so each agent owns
  different files (the 2026-09-30 notes split used four in parallel).

Give each one a written brief (a scratchpad file works) and ask for a
one-line-per-item report. Don't use one for a single known file: reading it
yourself is cheaper.

## Models

- Game design, revisions from feedback, hard balance problems: the most
  capable model (Opus); raise effort for a new game or a subtle bug.
- Mechanical work (doc moves, config, applying decided tweaks, branch
  cleanup): Sonnet is enough.
- Subagents that search or run scripts and summarize: Sonnet or Haiku.

## Scaling plan

What will break first as the game count grows, and the intended fix
(item 2 is built, the rest are not yet):

1. **`games/games.json`** (~4 KB per game, loaded by the gallery on every
   visit; ~1 MB at 250 games). Split into a small index the gallery loads
   (id, title, blurb, accent, version, updated, status) and per-game detail
   loaded when a cabinet opens; `changes` keep only the last few entries in
   the index. Needs `index.html`/`assets/` changes and the smoke test.
2. **Triage** (built): `node scripts/triage.mjs [--top N]` (needs
   `FEEDBACK_READ_KEY`) joins telemetry, feedback and the manifest into one
   line per game (sessions, human win rate, new feedback since `updated`,
   days since update) and sorts by need (rules in `need()`), so choosing
   what to revise never means reading every game's data. Bot win rates are
   not in it (the balance scripts print text): compare with
   `scripts/balance-<id>.mjs`.
3. **Findings**: when `docs/findings.md` passes ~12 KB, split by theme
   (`docs/findings/<theme>.md`) and keep `findings.md` as the index.
4. **Branches**: turn on GitHub's "Automatically delete head branches" so
   merged session branches don't pile up.
