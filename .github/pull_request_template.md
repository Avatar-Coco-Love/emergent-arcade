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
- [ ] `docs/games/<id>.md` updated (constants, balance, open ideas)
- [ ] `node scripts/validate.mjs` passes
- [ ] Played it on a phone-sized viewport
