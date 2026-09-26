## What changed

<!-- New game, revision of an existing game, or platform change. -->

## For new or revised games

- Game id / version:
- What feedback prompted this (link issues or paste the summary from `scripts/fetch-feedback.mjs`):

Design rules (see `docs/PROJECT_BRIEF.md`):

- [ ] 2-3 core mechanics, no more
- [ ] Mechanics are orthogonal (different verbs, not variations of one)
- [ ] Mechanics share state: each one reads a value another writes
- [ ] Single scene, primitives only, no external art/audio
- [ ] One self-contained HTML file in `games/`, playable when opened directly
- [ ] 3+ achievements, listed in `games/games.json` and unlocked in the game
- [ ] Layout sized by width (no `vh`), so it fits the gallery frame without inner scrolling
- [ ] `games/games.json` updated (`version` bumped and `updated` set for a revision)
- [ ] `node scripts/validate.mjs` passes
- [ ] Played it on a phone-sized viewport
