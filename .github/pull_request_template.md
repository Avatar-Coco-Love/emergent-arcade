## What changed

<!-- New game, revision of an existing game, or platform change. -->

## For new or revised games

- Game id / version:
- What feedback prompted this (link issues or paste the summary from `scripts/fetch-feedback.mjs`):
- Key numbers (a few lines; full tables go in `docs/games/<id>.md`):

Design rules (see `docs/PROJECT_BRIEF.md`):

- [ ] 2-3 core mechanics, no more
- [ ] Mechanics are orthogonal (different verbs, not variations of one)
- [ ] Mechanics share state: each one reads a value another writes
- [ ] Single scene, primitives only, no external art/audio
- [ ] One self-contained HTML file in `games/`, playable when opened directly
- [ ] 3+ achievements, listed in `games/games.json` and unlocked in the game
- [ ] Fills its window without scrolling (scales to width and height); no instructions text in the game itself
- [ ] Pauses on `arcade:pause`, resumes on `arcade:resume`
- [ ] Posts `arcade:result` (win/loss, time) when a round ends (sandboxes excepted)
- [ ] `score` in the manifest (`docs/scores.md`); `score.epoch` bumped if the score's meaning changed
- [ ] Depth: 10+ minutes of new challenge for a player who likes it (levels or a mode that keeps going; bot or telemetry evidence)
- [ ] `howToPlay` and `goal` written in `games/games.json`
- [ ] Manifest text says `{tap}`, `{finger}`, `{hold}`… (never "tap"/"click" outright); PC keys, if any, in `keyboard`
- [ ] `games/games.json` updated (`version` bumped and `updated` set for a revision)
- [ ] `docs/games/<id>.md` updated (constants, balance, open ideas; under 8 KB, superseded parts moved to `docs/history/<id>.md`)
- [ ] Classroom: a meaningful round or level fits 5–10 minutes; `topics` only where the rules model the subject; classroom-safe; no typed text in the game

Accessibility (`docs/adding-a-game.md`, "Classroom and accessibility"; `node scripts/a11y-audit.mjs <id>`):

- [ ] Keyboard: every verb has a key path, listed in `keyboard`; Tab stays the browser's
- [ ] Live region: DOM status text says what each move did and what the cursor is over (from state, not per frame)
- [ ] Colour: states differ by lightness or shape, not hue alone; late screens checked too
- [ ] Text: 12 px+ at 360 px wide, on a backing
- [ ] Reduced motion: reads `prefers-reduced-motion`, decoration stills
- [ ] Canvas: `role="img"` and an `aria-label` naming the game and its verbs

- [ ] `node scripts/validate.mjs` passes
- [ ] Played it on a phone-sized viewport
