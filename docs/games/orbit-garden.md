# Orbit Garden: design notes

Current: **v5**. Mechanics: **place** (tap the sky: a planet) and **fling**
(drag up from anywhere: a seed from the launcher), sharing **planet mass**.
Place creates mass, landed seeds add it, mass sets gravity, a passive wither
drains it. Win: 3 planets blooming (mass ≥ `BLOOM_MASS`) at the same time.
Lose: all 40 seeds used and none in flight. 6 achievements (in
`games/games.json`); Frugal = win with 15+ seeds left.

## Key constants (`games/orbit-garden.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| START_SEEDS | 40 | GOAL_BLOOMS / MAX_PLANETS | 3 / 5 |
| PLANET_START_MASS | 1.5 | SEED_MASS | 1 |
| BLOOM_MASS | 5 | WITHER_PER_SEC / DEAD_MASS | 0.06 / 0.3 |
| G / SOFTEN | 400000 / 15 | SEED_LIFETIME | 10 s |
| FLING_POWER / MAX_DRAG | 2.6 per px / 140 px | MAX_AIM_ANGLE | 75° from straight up |

Planet radius = `6 + 5·√mass` (≈ 12 px new, ≈ 17 px blooming).

Seed maths: a new planet blooms after 4 seeds (1.5 + 4 = 5.5), and then
withers back below 5 in about 8 s without food. Keeping 3 planets blooming
costs one seed per ~5.5 s. The round clock (`elapsed`, added in v5 for
`arcade:result`) only counts unpaused time.

## Layout (400×600)

Launcher at (200, 566). No planets below y = 500 or within 8 px of another
planet. Status line and Reset sit below the canvas. The end card has an
input lock of `END_INPUT_LOCK_MS` = 1 s.

## Balance (v5, `node scripts/balance-orbit-garden.mjs 200`, ±3–4 pts)

Bots place 3 planets at the start (triangle: (110,320), (290,320),
(200,170)), then fling one seed every `gap` s. Aim searches drag vectors on
the predicted path, then adds Gaussian noise (σ in degrees; the same σ in %
on power). `naive` drags straight at the target at full power, ignoring
gravity.

| Bot | aim | feed | gap | win | seeds used (wins) | time (wins) |
|---|---|---|---|---|---|---|
| perfect | search, σ 0 | lightest first | 1.5 s | 100% | 23 | 35 s |
| even2 | search, σ 2° | lightest first | 1.5 s | 96% | 26 | 39 s |
| even5 | search, σ 5° | lightest first | 1.5 s | 81% | 32 | 48 s |
| serial2 | search, σ 2° | one at a time | 1.5 s | 93% | 29 | 44 s |
| slow2 | search, σ 2° | lightest first | 3 s | **8%** | 34 | 101 s |
| naive | straight, σ 2° | lightest first | 1.5 s | **100%** | 22 | 32 s |
| naive5 | straight, σ 5° | lightest first | 1.5 s | 14% | 36 | 53 s |
| close2 | search, σ 2°, tight cluster | lightest first | 1.5 s | 99% | 24 | 36 s |

Achievements (even2): Gravity Assist 100%, Green Thumb 92%, Frugal 40%.
Full Sky is never earned by these bots (they place only 3).

## Player data (2026-09-28: one tester, touch; `fetch-telemetry.mjs`)

v5: 1 round, **won in 23 s** (26 s session). Faster than every bot (naive
32 s, perfect 35 s at a 1.5 s fling gap). This matches the open idea below:
a human flings faster than 1.5 s, and fast play wins easily. It's one
round, but it's the prediction the notes made. Supports both findings
from this game (straight aim works; cadence decides the round).

Overnight (2026-09-28, a second player): 1 round, **won in 52 s** on a
first try, with all 4 achievements (First Bloom, Green Thumb, Full Sky,
Garden Complete) in that round. Humans are 2/2. Slower than the bots but
never in danger. Two first-try wins with every achievement: the round and
the achievements look too easy. The leading revision candidate.

## Open ideas / known limits

- **Gravity barely matters for aiming.** Aiming straight at the target
  (`naive`) wins as often as the path search, with fewer seeds. Fling mostly
  tests angular precision (a new planet is about ±2° wide from the
  launcher), not reading mass, so the verbs share state weakly. Ideas: aim
  from a moving or off-centre launcher, a planet in the direct line that
  catches straight shots, or a small sideways drift.
- **Cadence decides the round.** Flinging every 3 s instead of 1.5 s drops
  the win rate from 96% to 8%, because wither outpaces feeding. A human can
  fling faster than 1.5 s, so fast play probably wins easily. Check it with
  telemetry (`fetch-telemetry.mjs --game orbit-garden`: win rate, round
  length).
- Gravity Assist is a free achievement for curved shots (100% for search
  bots). Consider requiring a larger swing.
- Feeding one planet at a time costs only ~3 pts over feeding evenly, so
  "big planets steal seeds" pressure is mild at 3 planets.
- Not yet hand-played on a phone.

## History

- v1: first version (with per-game achievements). v2: cabinet support, win
  screen and aiming fixes. v3: cleanup pass (small bugs). v4: sharp
  rendering at screen resolution.
- v5: no gameplay change. Posts `arcade:result` when a round ends, and adds
  the `elapsed` round clock for it.
