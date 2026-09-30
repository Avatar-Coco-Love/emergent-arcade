# Tidewright: design brief for implementation

Status: idea, approved by the maintainer, not built. `id`: `tidewright`
(permanent feedback key). Fills the untried `flick` + `tap` pair
(`node scripts/mechanic-map.mjs`). Read first: `docs/PROJECT_BRIEF.md`,
`docs/findings.md` (every rule applies), `docs/adding-a-game.md`,
`docs/scores.md`, `docs/games/hourglass-delivery.md` (the arcade's only other
`flick` game: copy its gesture handling) and its bot harness
`scripts/balance-hourglass-delivery.mjs` (or `balance-loom.mjs`) as the base
for `scripts/balance-tidewright.mjs`.

## Pitch

Build a seawall before the tide comes in and keep the village behind it dry,
wave after wave. Flick sand onto the wall; tap sluice gates to let trapped
water out. Score = waves survived, with no ceiling.

## Layout (single scene, primitives only)

Side view. Sea on the left, sloping beach, village on the right. The beach is
~30-40 sand columns with a height `H[i]`. Behind the wall, water pools:
`W[i]`. 3-5 sluice gates sit at fixed columns. A sand pile at the bottom is
the ammo (finite, refills slowly, shown as a meter).

## Verbs (orthogonal) and shared state

- **Flick** (`flick`): a quick swipe, same gesture rules as Hourglass
  Delivery (`FLICK_PX` within `FLICK_MS`). It acts at the press point: the
  pellet lands on the column under the finger, so aim is exact on a phone.
  The swipe direction skews the mound toward sea or land, and swipe speed
  sets the pellet size (bigger costs more ammo). Mouse: drag quickly.
  Keyboard: arrows move a cursor along the wall, Space flicks (hold = bigger).
- **Tap** (`tap`): a press with no movement on a gate toggles it.
  Keyboard: number keys 1-5 toggle gates. A flick that starts on a gate is a
  flick, never a toggle.
- **Shared state**, read and written by both:
  - `H`: flick writes it. A closed gate holds water up to its column's
    height. Waves read it (a wave overtops where the crest beats `H`).
  - `W`: overtopping waves and rain write it, gates drain it (down to the
    gate sill). Flick reads it: sand flicked into standing water washes out to
    a fraction of its height, onto dry columns it packs fully. `W` also seeps
    into `H` each second, eroding the wall.
  - An open gate's column is only as high as its sill, so waves pour through
    it and add to `W`. A sealed gate keeps waves out but lets `W` build.
- Decision: drain when `W` threatens the wall, seal when a crest comes.
  Flicking blind into water wastes ammo. Dominant-strategy checks (findings):
  `allShut` (never open a gate) must die to seepage by a mid wave, `allOpen`
  must die to waves early, `habit` (flick the lowest column, ignore gates)
  must die before wave ~10, and only a bot that reads both `H` and `W` should
  pass 15.

## Loop, depth, scoring (target: 10+ minutes for a player who likes it)

- Pace: a wave cycle of roughly 25-35 s (calm, then a visible crest marker
  on the wall showing the next crest height, then the wave). About 20 waves
  is 10 minutes, so pace and escalation should be tuned for that, not faster.
- Seasons: every 6 waves the round ends as a `win` (post `arcade:result`,
  carry the wall's state into the next season, slightly repaired), a flooded
  village is a `loss`. Both post the cumulative wave count as `score`. This
  keeps telemetry win/loss meaningful (an all-loss endless game would make
  `scripts/triage.mjs` flag a 0% win rate forever) while staying endless.
- Decay (findings): the wall slumps each cycle and ammo refills slowly, so
  nothing plays itself, and the cost is per action (ammo), not per second,
  so decisions beat speed.
- Escalate by rules, not just size (findings: a general trick beats levels):
  waves 1-2 are gentle with no seepage (a hook: first minute under ~40 s of
  learning); gates appear in use by wave 3; then a double wave, a rogue wave
  aimed at one column, rain that adds `W` everywhere, a spring tide that
  wants gates shut, a storm that weakens chosen columns.
- Readability (findings): show water level and seep (small arrows) on the
  wall, colour columns by wetness, mark the next crest. Hint the gate verb
  the first time `W` passes a threshold; a still screen that only an unknown
  verb breaks must show that verb. Never leave the player with no ammo and
  nothing to do: the refill is visible and gates stay usable.
- Loss `reason`s for telemetry: `overtop`, `seep`, `gate`. `stats`: `waves`,
  `peak_w`, `gate_open_s`, `flicks`, `whiffs`.

## Manifest

Mechanics `flick` and `tap`; write text with `{swipe}`, `{tap}`, `{finger}`
(the wording table has no `{flick}`; see `assets/wording.js`) and a
`keyboard` line. `goal`, `howToPlay`, 3+ achievements (for example: survive
wave 5, drain 50 water in one wave, pass a season with no gate opened).
`score`: `{ "label": "Waves survived", "better": "higher", "format": "count",
"wins": false, "max": 500, "epoch": 1 }` with `score` posted by the game.
Handle `arcade:pause` / `arcade:resume` and fill the window, no scrolling.

## Balance and playtest

Bots, one line each: `novice` (first obvious guesses, 2-3 wrong taps, imprecise
flicks), `habit`, `allShut`, `allOpen`, `skilled`. Sweep reaction lag apart
from think time. Targets for the notes file: skilled reaches 20+ waves,
novice 4-6 (a first-timer should survive wave 1-2 at least 3 times in 4),
`habit` dies before 10. Bot rates are optimistic for new players (findings):
expect humans below them.

## Risks

- Flick vs tap vs drag confusion on touch: gesture thresholds need tests on
  a touch-emulated page (Playwright `hasTouch`), not only mouse.
- Reads as tower defence: the point is one shared water/sand state, so make
  the `W` -> `H` seepage visible from wave 3 or the gates feel arbitrary.
- Wave 1 must not teach a lesson that later waves break without warning.
- Keep the file under ~40 KB (the big games are 30-40 KB; bubble-glass is 93).
