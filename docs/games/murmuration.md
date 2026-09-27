# Murmuration: design notes

Current: **v3** (PR #10). Mechanics: **lure** (hold) and **startle** (tap),
sharing **fear per bird**. Win: 15+ birds through each of 5 gates, in order,
within `GATE_WINDOW` s of each other, before night (`DUSK`). Lose: night falls,
or the flock drops below 15. 7 achievements (in `games/games.json`); Swift =
finish with `SPARE` s of light left.

## Key constants (`games/murmuration.html`, top of the script)

| Const | Value | Const | Value |
|---|---|---|---|
| START_BIRDS | 40 | GATE_NEED / GATE_WINDOW / GATE_HALF | 15 / 4 s / 55 |
| DUSK | 60 s | SPARE | 15 s |
| FEAR_DECAY | 0.12/s | CONTAGION / CONTAGION_KEEP | 4.0 / 0.85 |
| PANIC / SCARED | 0.75 / 0.25 | CROWD_R / CROWD_N / CROWD_FEAR | 12 / 5 / 0.1 |
| LURE_ACCEL / LURE_R / LURE_FULL | 160 / 150 / 90 | LURE_SPOOK_R / LURE_SPOOK | 30 / 0.9 |
| STARTLE_R / _FEAR / _PUSH | 70 / 0.6 / 330 | MIN_SPEED / CALM_MAX / PANIC_EXTRA | 45 / 100 / 140 |

Grep `const [A-Z_]* = ` for the rest (flocking, edges, input timing).

## Gates (400×600 sky; angle of the line between the posts)

| # | x, y | angle |
|---|---|---|
| 1 | 95, 400 | 60° |
| 2 | 300, 280 | 60° |
| 3 | 120, 170 | 0° |
| 4 | 230, 440 | 0° (v3; was 90, 390 at 90°, hugging the left edge) |
| 5 | 290, 110 | 30° |

## Balance (v3, `node scripts/balance-murmuration.mjs`, 300 seeds, ±3 pts)

| Bot | win @50 s | @60 s | @70 s |
|---|---|---|---|
| lure60 (brief's close leader) | – | 47% | 60% |
| lure80 (best lure-only) | 66% | 79% | 86% |
| rear100 (naive rear taps) | – | 84% | 88% |
| smart90 (smart startle, ~4 taps) | 81% | 89% | 94% |

Startle edge over best lure-only: +10 pts at 60 s, +15 at 50 s (v2: +7 / +11).
Median s/gate, lure80 vs smart90: 3.9/3.6, 4.7/4.5, 6.0/6.1, 7.1/6.2, 6.8/6.5.
Almost every loss at 60 s is nightfall (scattered: 6/300 lure80, 1/300 smart90).

Gate 4 spots tried (win @50 s, lure80 vs smart90): (200,420) flat 70/80;
(200,400) 90° 65/72–79; (180,380) 60° 68/77; (160,430) 20° 66/80;
(230,440) flat 66/81 (chosen).

## Open ideas / known limits

- Skilled startle play finishes only ~4–5 s sooner than skilled lure play.
  Tapping nearer gates, tapping more often, or leading further after a tap
  all tied or lost. Gate 3 gains nothing from startle.
- The lever: after a tap, scared birds ignore the lure for several seconds
  while fear decays (`FEAR_DECAY`, the lure/fear cutoff). Next revision
  should try letting mildly scared birds still follow the lure.
- Not yet hand-played on a phone (only rendered headlessly at 390×760).

## History

- v1 (PR #8): first version. v2 (PR #9): dusk timer, organic flocking,
  startle rebalance. v3 (PR #10): gate 4 into open sky, dusk 70 → 60 s.
- v4: no gameplay change. Posts `arcade:result` when a round ends, for play
  telemetry. Bot numbers above still apply; compare humans with
  `node scripts/fetch-telemetry.mjs --game murmuration` (see `docs/telemetry.md`).
