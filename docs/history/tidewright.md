# Tidewright: history

Older versions, superseded balance tables and rationale. Current design:
`docs/games/tidewright.md`. Add new entries at the top of the relevant
section; sessions don't read this file by default.

## History

- v3 (2026-10-05): accessibility (labels, handles, reduced motion), no gameplay change.
- v2 (2026-10-05): canvas label.
- v1 (2026-09-30): first version, from `docs/ideas/tidewright.md`.

## v2 balance notes (moved from the design notes in v3, still current)

Sweeps (skilled): lag 0.6 / 1.0 s → median 20 / 20; think 0.2 / 0.8 /
1.5 s → 20 / 20 / 16, so speed doesn't win, but one action per 1.5 s or
slower costs ~4 waves. Novice with lag 1.2, think 2 s: median 8.

Not met: novice 4-6 (brief). An honest novice holds 10. It loses where it
doesn't read (spring tides, forgotten gates, wet flicks: 55 of 106 flicks
whiffed), but each mistake is recoverable by design (findings: 2-3 wrong
taps must be survivable). Bots are optimistic for first-timers
(findings); check telemetry before tuning harder.

## v1: departures from the brief and why

- **View.** The brief's side view (sea left, village right) is a
  cross-section, where a wave meets only the highest column; per-column
  overtopping, "a rogue wave aimed at one column" and gates at fixed
  columns need the columns to run along the wall. The game looks from the
  village at the wall, with the sea behind it. A sideways flick spreads sand
  along the wall instead of "toward sea or land".
- **Seepage as a water source.** With gates shut and a good wall, the
  brief's `W` only came from rain, so `allShut` survived. Water now seeps
  through the wall while a wave stands on it.
- **Flick vs drag.** Any press that moves `FLICK_PX` is a flick; speed only
  sets the size, so a slow drag throws the smallest pellet instead of doing
  nothing. Gates got large handles (a column is ~12 px on a phone).
- **Retry season.** Findings ask that a lost round can be retried from its
  start; the score stays "waves held in the run".
- **`timer` bot added** to test "only a bot that reads both `H` and `W`
  passes 15": opens gates every calm and shuts them before crests.

## v1 tuning, in order (100-run sweeps, median waves)

| Step | Problem | novice / habit / allShut / allOpen / timer / skilled | Fix |
|---|---|---|---|
| 1 | Sand runs out by wave 9 (slump + crest growth > refill) | 5 / 4 / 5 / 4 / 11 / 11 | Refill 3/s, crest +1/wave |
| 2 | allOpen lives to 9: sea let in through a gate drains back out the same gate; timer ≈ skilled: spring tide (sea 6) harmless | 16 / 8 / 8 / 9 / 17 / 16 | Gate inflow spreads ±4 columns, stronger gates, spring 12-16 |
| 3 | novice ≈ skilled: one breached column spreads to ~1 of mean water, sand not binding, novice bot read the crest perfectly | 16 / 8 / 7 / 5 / 15 / 17 | Breaches scour themselves, pile 40, novice builds reactively |
| 4 | timer passes 15: an open gate on a spring tide only fills to the sea's level, below the flood line | 12 / 8 / 7 / 5 / 15 / 18 | Spring tide at 26 (above the flood line) |
| 5 | A gate left open on a spring tide floods in ~2 s, faster than reaction; two spring tides in a row = certain death; no counterplay | 5 (bimodal) / 8 / 7 / 5 / 5 / 17 | Gate flow 2, spring ebbs late in the calm, no back-to-back springs |
| 6 | habit and allShut win season 1 without ever touching a gate | 12 / 8 / 7 / 5 / 5 / 21 | Seepage only from the wave above the calm sea (not the tide), ×3.5 |
| 7 | Skilled dies at wave 10: double wave then spring tide, erosion eats the whole sand income | 9 / 5 / 5 / 5 / 5 / 10 | Double gap 6 s, ebb at half the calm, erosion halved, flow 6, refill 4.5 |
| final | | 10 / 5 / 5 / 5 / 5 / 20 | |

Also fixed on the way: loss `reason` credited leak water that kept coming
after a gate flood (now `gate` at ≥ 25% of recent water); Sluice Master
was free for `allOpen` (it drained the sea it had let in) and Sealed Season
became impossible once gateless play lost season 1 (replaced by Dry Feet);
Stand Firm needed 3 rogue waves (1 was 100% for every bot); flick speed
read `performance.now()` at handler time, which frame-batched touch events
made slow (now the events' own timestamps).

## Original design brief (before v1, 2026-09-30)

Moved here from `docs/ideas/tidewright.md` in the 2026-10-07 cleanup. What the build changed is above.

### Tidewright: design brief for implementation

Status: idea, approved by the maintainer, not built. `id`: `tidewright`
(permanent feedback key). Fills the untried `flick` + `tap` pair
(`node scripts/mechanic-map.mjs`). Read first: `docs/PROJECT_BRIEF.md`,
`docs/findings.md` (every rule applies), `docs/adding-a-game.md`,
`docs/scores.md`, `docs/games/hourglass-delivery.md` (the arcade's only other
`flick` game: copy its gesture handling) and its bot harness
`scripts/balance-hourglass-delivery.mjs` (or `balance-loom.mjs`) as the base
for `scripts/balance-tidewright.mjs`.

#### Pitch

Build a seawall before the tide comes in and keep the village behind it dry,
wave after wave. Flick sand onto the wall; tap sluice gates to let trapped
water out. Score = waves survived, with no ceiling.

#### Layout (single scene, primitives only)

Side view. Sea on the left, sloping beach, village on the right. The beach is
~30-40 sand columns with a height `H[i]`. Behind the wall, water pools:
`W[i]`. 3-5 sluice gates sit at fixed columns. A sand pile at the bottom is
the ammo (finite, refills slowly, shown as a meter).

#### Verbs (orthogonal) and shared state

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

#### Loop, depth, scoring (target: 10+ minutes for a player who likes it)

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

#### Manifest

Mechanics `flick` and `tap`; write text with `{swipe}`, `{tap}`, `{finger}`
(the wording table has no `{flick}`; see `assets/wording.js`) and a
`keyboard` line. `goal`, `howToPlay`, 3+ achievements (for example: survive
wave 5, drain 50 water in one wave, pass a season with no gate opened).
`score`: `{ "label": "Waves survived", "better": "higher", "format": "count",
"wins": false, "max": 500, "epoch": 1 }` with `score` posted by the game.
Handle `arcade:pause` / `arcade:resume` and fill the window, no scrolling.

#### Balance and playtest

Bots, one line each: `novice` (first obvious guesses, 2-3 wrong taps, imprecise
flicks), `habit`, `allShut`, `allOpen`, `skilled`. Sweep reaction lag apart
from think time. Targets for the notes file: skilled reaches 20+ waves,
novice 4-6 (a first-timer should survive wave 1-2 at least 3 times in 4),
`habit` dies before 10. Bot rates are optimistic for new players (findings):
expect humans below them.

#### Risks

- Flick vs tap vs drag confusion on touch: gesture thresholds need tests on
  a touch-emulated page (Playwright `hasTouch`), not only mouse.
- Reads as tower defence: the point is one shared water/sand state, so make
  the `W` -> `H` seepage visible from wave 3 or the gates feel arbitrary.
- Wave 1 must not teach a lesson that later waves break without warning.
- Keep the file under ~40 KB (the big games are 30-40 KB; bubble-glass is 93).
