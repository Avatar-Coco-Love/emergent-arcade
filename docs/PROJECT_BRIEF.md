# Project Brief: Emergent Games Platform

Build a web platform that hosts a scrollable gallery of small, self-contained
HTML/JS browser games, collects player feedback per game, and supports
iterating on games (new ones and revisions) based on that feedback.

## Design constraints for every game on the platform

These are non-negotiable rules from the game-design side of this project,
not suggestions:

- 2-3 core mechanics per game, no more
- Mechanics must be orthogonal (not variations of the same verb)
- Mechanics must share state — each mechanic reads a value another one writes
- Single-scene, primitives-only (no external art/audio assets), buildable
  and playable standalone
- Each game ships as one self-contained HTML file (inline CSS/JS, no build
  step) — this is the format already in use; see `games/pressure-grid.html`
  for a reference example

## Stack

Choose the hosting and feedback-storage stack yourself. Constraints to weigh:

- This is a free/hobby-tier project — low ongoing maintenance matters more
  than raw power
- It should stay easy for a solo dev to redeploy from Claude Code sessions
- **Public hosting is via GitHub Pages.** Either build the static gallery
  and games to work with GitHub Pages, or, if you choose a different host,
  explain why in the README and document what extra setup that requires
  from the maintainer.

Document what you chose and why in the repo's README.

## Required pieces

1. **Gallery/index page** — scrollable list or swipeable cards, one per
   game, loads/embeds the game on selection
2. **Feedback mechanism** on each game — simple rating + optional text
   comment, tied to that game's identity
3. **A way to read back accumulated feedback later** — for a human or
   Claude to review; doesn't need a fancy dashboard yet, just
   queryable/exportable
4. **Review-gated changes** — new or revised games should be proposed as
   changes for review (e.g. a PR or a clearly diffed update), not
   auto-published without a human glancing at it first

## Seed content

Attach the Pressure Grid prototype as the first game in the gallery:

- Mechanics: **pump** (tap a cell to add pressure) and **siphon** (drag
  from a cell to instantly transfer a fraction of its pressure into the
  neighbor you dragged toward, with some loss to inefficiency)
- Shared state: pressure-per-cell, read and written by both mechanics,
  plus a passive bleed-and-eruption system that reads the same state
